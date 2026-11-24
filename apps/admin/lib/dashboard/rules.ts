// Modul murni (tanpa db/next): hitungan untuk dashboard beranda.
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@workspace/db/schema/stages"

import { resolvePeriod } from "../planner/rules"
import type { IsoDate, PlannerEntry } from "../planner/types"
import { summarizeRecap, type RecapDay } from "../report/recap"
import { addDays } from "../report/rules"

export const weekStartOf = (date: IsoDate): IsoDate =>
  resolvePeriod({ tanggal: date, rentang: "pekan" }).start

export type AttendanceDay = { date: IsoDate } & Record<AttendanceStatus, number>

/** Tanpa baris = Hadir (§5.4). Hanya staf di `staffIds` yang dihitung. */
export function attendancePerDay(
  days: readonly IsoDate[],
  staffIds: readonly string[],
  rows: readonly { userId: string; date: IsoDate; status: AttendanceStatus }[]
): AttendanceDay[] {
  const byKey = new Map(rows.map((r) => [`${r.userId}|${r.date}`, r.status]))
  return days.map((date) => {
    const day = { date } as AttendanceDay
    for (const s of ATTENDANCE_STATUSES) day[s] = 0
    for (const id of staffIds) day[byKey.get(`${id}|${date}`) ?? "hadir"]++
    return day
  })
}

/** Rata-rata skor harian per pekan (aturan sama dengan rekap); null bila tak ada hari dihitung. */
export function weeklyAverages(
  weekStarts: readonly IsoDate[],
  days: readonly RecapDay[]
): { start: IsoDate; average: number | null }[] {
  return weekStarts.map((start) => {
    const end = addDays(start, 6)
    const inWeek = days.filter((d) => d.date >= start && d.date <= end)
    return { start, average: summarizeRecap(inWeek).average }
  })
}

/** Jumlah penugasan per orang yang beririsan dengan from..to; terbanyak dulu. */
export function workloadPerPerson(
  entries: readonly PlannerEntry[],
  from: IsoDate,
  to: IsoDate
): { userId: string; name: string; count: number }[] {
  const byUser = new Map<string, { userId: string; name: string; count: number }>()
  for (const e of entries)
    for (const a of e.assignments) {
      if (a.start > to || a.end < from) continue
      const row = byUser.get(a.userId) ?? { userId: a.userId, name: a.userName, count: 0 }
      row.count++
      byUser.set(a.userId, row)
    }
  return [...byUser.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "id")
  )
}

/** Entri planner yang aktif tiap hari: rentang kegiatan, penugasan, atau tanggal tayang. */
export function entriesPerDay(
  entries: readonly PlannerEntry[],
  days: readonly IsoDate[]
): { date: IsoDate; entries: { id: number; name: string }[] }[] {
  return days.map((date) => ({
    date,
    entries: entries
      .filter(
        (e) =>
          e.publishDate === date ||
          (e.activityStart !== null &&
            e.activityEnd !== null &&
            e.activityStart <= date &&
            date <= e.activityEnd) ||
          e.assignments.some((a) => a.start <= date && date <= a.end)
      )
      .map((e) => ({ id: e.id, name: e.name })),
  }))
}
