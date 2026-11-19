// Pembekuan laporan harian (server-only): salinan beku menjadi kebenaran untuk hari yang sudah lewat batas.
import { db } from "@workspace/db/client"
import { eq } from "@workspace/db/orm"
import { dailyReport } from "@workspace/db/schema"
import type { FrozenReport } from "@workspace/db/schema/stages"

import { todayWib } from "@/lib/planner/rules"
import type { IsoDate } from "@/lib/planner/types"

import {
  allHolidays,
  answersOn,
  dayTasks,
  getReportRow,
  loadSources,
  loadUser,
  type Sources,
} from "./queries"
import { addDays, firstReportDay, isReportDay, lockDeadline } from "./rules"

/** Hitung salinan beku satu hari dari sumber terkini dan isian tersimpan, lalu simpan. */
export async function freezeDay(
  userId: string,
  date: IsoDate,
  now: Date,
  src: Sources,
  holidays: ReadonlySet<IsoDate>
): Promise<void> {
  const row = await getReportRow(userId, date)
  const answers = answersOn(src, date)
  const frozen: FrozenReport = {
    tasks: dayTasks(src, date, holidays).map((t) => ({
      key: t.key,
      source: t.source,
      title: t.title,
      status: answers.get(t.key) ?? null,
      overdueDays: t.overdueDays,
    })),
    obstacles: row?.obstacles ?? "",
    priorities: row?.priorities ?? "",
  }
  await db
    .insert(dailyReport)
    .values({ userId, date, frozen, frozenAt: now, obstacles: frozen.obstacles, priorities: frozen.priorities })
    .onConflictDoUpdate({
      target: [dailyReport.userId, dailyReport.date],
      set: { frozen, frozenAt: now, unlockedAt: null, updatedAt: now },
    })
}

/**
 * Bekukan setiap hari laporan yang lewat batas kunci, belum beku, dan tidak sedang dibuka kuncinya.
 * Pemindaian mulai dari hari setelah laporan beku terakhir (atau hari laporan pertama).
 * Mengembalikan jumlah hari yang dibekukan.
 */
export async function freezeDue(
  userIds: string[],
  now: Date = new Date()
): Promise<number> {
  const today = todayWib(now)
  const holidays = await allHolidays()
  let count = 0
  for (const userId of userIds) {
    const [u, rows] = await Promise.all([
      loadUser(userId),
      db.select().from(dailyReport).where(eq(dailyReport.userId, userId)),
    ])
    const first = firstReportDay(u.createdAt)
    const lastFrozen = rows
      .filter((r) => r.frozen)
      .map((r) => r.date)
      .sort()
      .at(-1)
    const start = lastFrozen ? addDays(lastFrozen, 1) : first
    if (start > today) continue
    const byDate = new Map(rows.map((r) => [r.date, r]))
    const src = await loadSources(userId, today)
    for (let d = start; d <= today; d = addDays(d, 1)) {
      if (!isReportDay(d, holidays, first, today)) continue
      if (now < lockDeadline(d, holidays)) continue
      const row = byDate.get(d)
      if (row?.frozen || row?.unlockedAt) continue
      await freezeDay(userId, d, now, src, holidays)
      count++
    }
  }
  return count
}
