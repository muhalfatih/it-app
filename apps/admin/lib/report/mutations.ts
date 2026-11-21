// Mutasi laporan harian (server-only; dipanggil aksi server yang sudah dijaga izin).
// `userId` selalu milik pemanggil; semua perubahan lewat assertWritable.
import { db } from "@workspace/db/client"
import { and, eq } from "@workspace/db/orm"
import { dailyReport, dailyReportAnswer, selfTask } from "@workspace/db/schema"
import {
  ANSWER_STATUSES,
  type AnswerStatus,
} from "@workspace/db/schema/stages"

import { attendanceOf } from "@/lib/attendance/queries"
import { todayWib, validDate } from "@/lib/planner/rules"
import { notify } from "@/lib/push/send"
import type { IsoDate } from "@/lib/planner/types"
import { UserError } from "@/lib/user-error"

import { freezeDay } from "./freeze"
import {
  allHolidays,
  dayTasks,
  getReportRow,
  loadSources,
  loadUser,
} from "./queries"
import { firstReportDay, isEditable, isReportDay, lockDeadline } from "./rules"

const NOT_REPORT_DAY = "Hari ini bukan hari laporan"
const MAX_NOTE = 2000

/** Penjaga tunggal: hari laporan, bukan libur/absen, dan laporan masih bisa diubah. */
async function assertWritable(userId: string, date: IsoDate, now: Date) {
  if (!validDate(date)) throw new UserError(NOT_REPORT_DAY)
  const [u, holidays, att, report] = await Promise.all([
    loadUser(userId),
    allHolidays(),
    attendanceOf(userId, date, date),
    getReportRow(userId, date),
  ])
  if (!isReportDay(date, holidays, firstReportDay(u.createdAt), todayWib(now)))
    throw new UserError(NOT_REPORT_DAY)
  const status = att.get(date)
  if (status && status !== "hadir") throw new UserError(NOT_REPORT_DAY)
  const editable = isEditable({
    date,
    holidays,
    now,
    unlocked: report?.unlockedAt != null,
    frozen: !!report?.frozen,
  })
  if (!editable) throw new UserError("Laporan sudah terkunci")
  return { holidays, report }
}

export async function setAnswer(
  userId: string,
  date: IsoDate,
  key: string,
  status: AnswerStatus,
  now: Date = new Date()
): Promise<void> {
  if (!ANSWER_STATUSES.includes(status)) throw new UserError("Status tidak valid")
  const { holidays } = await assertWritable(userId, date, now)
  const tasks = dayTasks(await loadSources(userId, date), date, holidays)
  if (!tasks.some((t) => t.key === key))
    throw new UserError("Tugas tidak ada di laporan hari ini")
  await db
    .insert(dailyReportAnswer)
    .values({ userId, date, taskKey: key, status })
    .onConflictDoUpdate({
      target: [
        dailyReportAnswer.userId,
        dailyReportAnswer.date,
        dailyReportAnswer.taskKey,
      ],
      set: { status, updatedAt: now },
    })
}

export async function saveNotes(
  userId: string,
  date: IsoDate,
  obstacles: string,
  priorities: string,
  now: Date = new Date()
): Promise<void> {
  if (obstacles.length > MAX_NOTE || priorities.length > MAX_NOTE)
    throw new UserError("Isian maksimal 2000 karakter")
  await assertWritable(userId, date, now)
  await db
    .insert(dailyReport)
    .values({ userId, date, obstacles, priorities })
    .onConflictDoUpdate({
      target: [dailyReport.userId, dailyReport.date],
      set: { obstacles, priorities, updatedAt: now },
    })
}

function selfTitle(title: string): string {
  const t = title.trim()
  if (t.length < 2 || t.length > 120)
    throw new UserError("Judul tugas 2–120 karakter")
  return t
}

export async function addSelfTask(
  userId: string,
  date: IsoDate,
  title: string,
  now: Date = new Date()
): Promise<{ id: number }> {
  const t = selfTitle(title)
  await assertWritable(userId, date, now)
  const [row] = await db
    .insert(selfTask)
    .values({ userId, date, title: t })
    .returning({ id: selfTask.id })
  return { id: row!.id }
}

async function ownSelfTask(userId: string, id: number) {
  const [row] = await db
    .select()
    .from(selfTask)
    .where(and(eq(selfTask.id, id), eq(selfTask.userId, userId)))
  if (!row) throw new UserError("Tugas tidak ada")
  return row
}

export async function renameSelfTask(
  userId: string,
  id: number,
  title: string,
  now: Date = new Date()
): Promise<void> {
  const t = selfTitle(title)
  const row = await ownSelfTask(userId, id)
  await assertWritable(userId, row.date, now)
  await db.update(selfTask).set({ title: t }).where(eq(selfTask.id, id))
}

export async function deleteSelfTask(
  userId: string,
  id: number,
  now: Date = new Date()
): Promise<void> {
  const row = await ownSelfTask(userId, id)
  await assertWritable(userId, row.date, now)
  await db.transaction(async (tx) => {
    await tx
      .delete(dailyReportAnswer)
      .where(
        and(
          eq(dailyReportAnswer.userId, userId),
          eq(dailyReportAnswer.date, row.date),
          eq(dailyReportAnswer.taskKey, `sendiri:${id}`)
        )
      )
    await tx.delete(selfTask).where(eq(selfTask.id, id))
  })
}

export async function submitReport(
  userId: string,
  date: IsoDate,
  now: Date = new Date()
): Promise<void> {
  const { holidays } = await assertWritable(userId, date, now)
  const src = await loadSources(userId, date)
  const submittedTasks = dayTasks(src, date, holidays).map((t) => ({
    key: t.key,
    title: t.title,
  }))
  await db
    .insert(dailyReport)
    .values({ userId, date, submittedAt: now, submittedTasks })
    .onConflictDoUpdate({
      target: [dailyReport.userId, dailyReport.date],
      set: { submittedAt: now, submittedTasks, updatedAt: now },
    })
  // Sedang dibuka kuncinya (lewat batas): kirim = bekukan lagi.
  if (now >= lockDeadline(date, holidays))
    await freezeDay(userId, date, now, src, holidays)
}

export async function unlockReport(
  actorId: string,
  userId: string,
  date: IsoDate,
  now: Date = new Date()
): Promise<void> {
  const report = await getReportRow(userId, date)
  if (!report?.frozen) throw new UserError("Laporan belum terkunci")
  await db
    .update(dailyReport)
    .set({
      frozen: null,
      frozenAt: null,
      unlockedAt: now,
      unlockedBy: actorId,
      updatedAt: now,
    })
    .where(and(eq(dailyReport.userId, userId), eq(dailyReport.date, date)))
  await notify(
    { userIds: [userId], except: actorId },
    { title: "Laporan perlu diisi ulang", body: `Laporan ${date} dibuka kembali`, url: `/laporan?tanggal=${date}` }
  )
}
