// Query rekap absensi (server-only). Berkas terpisah dari queries.ts agar tidak membuat impor melingkar
// dengan report/queries (yang memakai attendance/queries).
import { todayWib } from "@/lib/planner/rules"
import type { Period } from "@/lib/planner/types"
import { allHolidays, loadUser } from "@/lib/report/queries"

import { attendanceOf } from "./queries"
import { summarizeAttendance, workdaysIn } from "./recap"

/** Rekap absensi satu orang; dihitung dari hari akunnya dibuat sampai hari ini (tanpa baris = Hadir). */
export async function loadAttendanceRecap(
  userId: string,
  period: Period,
  now: Date = new Date()
) {
  const [u, holidays] = await Promise.all([loadUser(userId), allHolidays()])
  const created = todayWib(u.createdAt)
  const lo = period.start > created ? period.start : created
  const today = todayWib(now)
  const hi = period.end < today ? period.end : today
  if (lo > hi) return summarizeAttendance([], new Map())
  return summarizeAttendance(
    workdaysIn(lo, hi, holidays),
    await attendanceOf(userId, lo, hi)
  )
}

export type AttendanceRecap = Awaited<ReturnType<typeof loadAttendanceRecap>>
