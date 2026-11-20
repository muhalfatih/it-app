// Query laporan harian (server-only).
import { db } from "@workspace/db/client"
import { and, asc, eq, gte, inArray, isNull, lte } from "@workspace/db/orm"
import {
  dailyReport,
  dailyReportAnswer,
  plannerAssignment,
  plannerEntry,
  routineTask,
  selfTask,
  taskType,
  user,
  userRole,
} from "@workspace/db/schema"
import type {
  AnswerStatus,
  AttendanceStatus,
} from "@workspace/db/schema/stages"

import { attendanceOf, listHolidays } from "@/lib/attendance/queries"
import { managerTasksFor } from "@/lib/manager-task/queries"
import { todayWib } from "@/lib/planner/rules"
import type { IsoDate, Period } from "@/lib/planner/types"
import { UserError } from "@/lib/user-error"

import { summarizeRecap, type Recap } from "./recap"
import {
  addDays,
  adjacentReportDay,
  dayScore,
  firstReportDay,
  isEditable,
  isReportDay,
  isWorkday,
  lockDeadline,
  needsUpdate,
  reportState,
  tasksForDay,
  type DayScore,
  type RangeSource,
  type ReportState,
  type ReportTask,
} from "./rules"

/** Staf pelapor: akun aktif berperan manajer/sdm_strategi/sdm_khusus (izin laporan.isi). */
export async function listReporters(): Promise<
  { id: string; name: string; createdAt: Date }[]
> {
  return db
    .selectDistinct({ id: user.id, name: user.name, createdAt: user.createdAt })
    .from(user)
    .innerJoin(userRole, eq(userRole.userId, user.id))
    .where(
      and(
        isNull(user.disabledAt),
        inArray(userRole.role, ["manajer", "sdm_strategi", "sdm_khusus"])
      )
    )
    .orderBy(asc(user.name))
}

/** Semua hari libur; tabel kecil, dan hitungan Tertunda butuh libur di masa lalu juga. */
export async function allHolidays(): Promise<Set<IsoDate>> {
  return new Set((await listHolidays()).map((h) => h.date))
}

export async function loadUser(userId: string) {
  const [u] = await db
    .select({ id: user.id, name: user.name, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, userId))
  if (!u) throw new UserError("Staf tidak valid")
  return u
}

export type Sources = {
  routine: { id: number; title: string }[]
  planner: RangeSource[]
  manager: RangeSource[]
  self: { id: number; title: string; date: IsoDate }[]
  answers: { date: IsoDate; taskKey: string; status: AnswerStatus }[]
}

/** Semua sumber tugas satu orang sampai tanggal `upTo` (satu kali muat untuk banyak hari). */
export async function loadSources(
  userId: string,
  upTo: IsoDate
): Promise<Sources> {
  const [routine, planner, manager, self, answers] = await Promise.all([
    db
      .select({ id: routineTask.id, title: routineTask.title })
      .from(routineTask)
      .where(and(eq(routineTask.userId, userId), eq(routineTask.active, true)))
      .orderBy(asc(routineTask.sortOrder), asc(routineTask.id)),
    db
      .select({
        id: plannerAssignment.id,
        type: taskType.name,
        name: plannerEntry.name,
        startDate: plannerAssignment.startDate,
        endDate: plannerAssignment.endDate,
      })
      .from(plannerAssignment)
      .innerJoin(plannerEntry, eq(plannerEntry.id, plannerAssignment.entryId))
      .innerJoin(taskType, eq(taskType.id, plannerAssignment.taskTypeId))
      .where(
        and(
          eq(plannerAssignment.userId, userId),
          lte(plannerAssignment.startDate, upTo)
        )
      )
      .orderBy(asc(plannerAssignment.startDate), asc(plannerAssignment.id)),
    managerTasksFor(userId, upTo),
    db
      .select({ id: selfTask.id, title: selfTask.title, date: selfTask.date })
      .from(selfTask)
      .where(and(eq(selfTask.userId, userId), lte(selfTask.date, upTo)))
      .orderBy(asc(selfTask.id)),
    db
      .select({
        date: dailyReportAnswer.date,
        taskKey: dailyReportAnswer.taskKey,
        status: dailyReportAnswer.status,
      })
      .from(dailyReportAnswer)
      .where(
        and(eq(dailyReportAnswer.userId, userId), lte(dailyReportAnswer.date, upTo))
      ),
  ])
  return {
    routine,
    planner: planner.map((p) => ({
      id: p.id,
      title: `${p.type} — ${p.name}`,
      startDate: p.startDate,
      endDate: p.endDate,
    })),
    manager,
    self,
    answers: answers.map((a) => ({ ...a, status: a.status as AnswerStatus })),
  }
}

export function dayTasks(
  src: Sources,
  date: IsoDate,
  holidays: ReadonlySet<IsoDate>
): ReportTask[] {
  return tasksForDay({
    date,
    routine: src.routine,
    planner: src.planner,
    manager: src.manager,
    self: src.self.filter((s) => s.date === date),
    tuntasBefore: new Set(
      src.answers
        .filter((a) => a.status === "T" && a.date < date)
        .map((a) => a.taskKey)
    ),
    holidays,
  })
}

export function answersOn(
  src: Sources,
  date: IsoDate
): Map<string, AnswerStatus> {
  return new Map(
    src.answers.filter((a) => a.date === date).map((a) => [a.taskKey, a.status])
  )
}

export async function getReportRow(userId: string, date: IsoDate) {
  const [row] = await db
    .select()
    .from(dailyReport)
    .where(and(eq(dailyReport.userId, userId), eq(dailyReport.date, date)))
  return row ?? null
}

export type DayView = {
  date: IsoDate
  state: ReportState
  tasks: (ReportTask & { status: AnswerStatus | null })[]
  obstacles: string
  priorities: string
  score: DayScore
  deadline: Date
  editable: boolean
  unlocked: boolean
}

type ReportRow = typeof dailyReport.$inferSelect | null

/** Bagian data satu hari yang sudah dimuat; `src` wajib bila laporan belum beku. */
type DayParts = {
  now: Date
  holidays: ReadonlySet<IsoDate>
  first: IsoDate
  attendance: AttendanceStatus | null
  report: ReportRow
  src: Sources | null
}

function buildDay(date: IsoDate, p: DayParts): DayView {
  const { now, holidays, report } = p
  const frozen = report?.frozen ?? null
  const unlocked = report?.unlockedAt != null && !frozen

  let tasks: DayView["tasks"]
  let obstacles = report?.obstacles ?? ""
  let priorities = report?.priorities ?? ""
  if (frozen) {
    tasks = frozen.tasks
    obstacles = frozen.obstacles
    priorities = frozen.priorities
  } else {
    const src = p.src!
    const answers = answersOn(src, date)
    tasks = dayTasks(src, date, holidays).map((t) => ({
      ...t,
      status: answers.get(t.key) ?? null,
    }))
  }
  const score = dayScore(
    tasks,
    new Map(tasks.flatMap((t) => (t.status ? [[t.key, t.status] as const] : [])))
  )
  const editable = isEditable({ date, holidays, now, unlocked, frozen: !!frozen })
  const state = reportState({
    workday: isWorkday(date, holidays),
    inRange: isReportDay(date, holidays, p.first, todayWib(now)),
    attendance: p.attendance,
    frozen: !!frozen,
    editable,
    submitted: report?.submittedAt != null,
    stale: !frozen && needsUpdate(report?.submittedTasks ?? null, tasks),
  })
  return {
    date,
    state,
    tasks,
    obstacles,
    priorities,
    score,
    deadline: lockDeadline(date, holidays),
    editable,
    unlocked,
  }
}

export async function loadDay(
  userId: string,
  date: IsoDate,
  now: Date = new Date()
): Promise<DayView> {
  const [u, holidays, att, report] = await Promise.all([
    loadUser(userId),
    allHolidays(),
    attendanceOf(userId, date, date),
    getReportRow(userId, date),
  ])
  return buildDay(date, {
    now,
    holidays,
    first: firstReportDay(u.createdAt),
    attendance: att.get(date) ?? null,
    report,
    src: report?.frozen ? null : await loadSources(userId, date),
  })
}

/**
 * Semua hari `start`..`end` (sampai hari ini) satu orang, dimuat sekali untuk rekap.
 * shortcut: tanpa cache lintas permintaan; cukup untuk unit kecil, tambahkan bila rekap lambat.
 */
export async function loadPeriodDays(
  userId: string,
  start: IsoDate,
  end: IsoDate,
  now: Date = new Date()
): Promise<DayView[]> {
  const last = [end, todayWib(now)].sort()[0]!
  if (start > last) return []
  const [u, holidays, att, rows] = await Promise.all([
    loadUser(userId),
    allHolidays(),
    attendanceOf(userId, start, last),
    db
      .select()
      .from(dailyReport)
      .where(
        and(
          eq(dailyReport.userId, userId),
          gte(dailyReport.date, start),
          lte(dailyReport.date, last)
        )
      ),
  ])
  const byDate = new Map(rows.map((r) => [r.date, r]))
  const first = firstReportDay(u.createdAt)
  // Rekap hanya memuat hari laporan; hari libur dan di luar masa laporan tidak punya laporan.
  const dates: IsoDate[] = []
  for (let d = start; d <= last; d = addDays(d, 1))
    if (isReportDay(d, holidays, first, last)) dates.push(d)
  const src = dates.some((d) => !byDate.get(d)?.frozen)
    ? await loadSources(userId, last)
    : null
  return dates.map((d) =>
    buildDay(d, {
      now,
      holidays,
      first,
      attendance: att.get(d) ?? null,
      report: byDate.get(d) ?? null,
      src,
    })
  )
}

export async function loadRecap(
  userId: string,
  period: Period,
  now: Date = new Date()
): Promise<Recap> {
  return summarizeRecap(await loadPeriodDays(userId, period.start, period.end, now))
}

/** Tetangga hari laporan untuk navigasi tanggal; `first` = hari laporan pertama orang itu. */
export async function loadNav(
  date: IsoDate,
  first: IsoDate,
  now: Date = new Date()
): Promise<{ prev: IsoDate | null; next: IsoDate | null; today: IsoDate }> {
  const holidays = await allHolidays()
  const today = todayWib(now)
  return {
    prev: adjacentReportDay(date, -1, holidays, first, today),
    next: adjacentReportDay(date, 1, holidays, first, today),
    today,
  }
}

export async function listTeamDay(
  date: IsoDate,
  now: Date = new Date()
): Promise<
  { user: { id: string; name: string }; state: ReportState; score: DayScore }[]
> {
  const people = await listReporters()
  return Promise.all(
    people.map(async (p) => {
      const d = await loadDay(p.id, date, now)
      return { user: { id: p.id, name: p.name }, state: d.state, score: d.score }
    })
  )
}

