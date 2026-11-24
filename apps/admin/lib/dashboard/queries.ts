// Pengumpul data beranda (server-only). Tiap bagian dimuat hanya bila akun punya izinnya.
import type { Permission } from "@workspace/auth/permissions"
import type { CurrentUser } from "@workspace/auth/session"
import type { AttendanceStatus } from "@workspace/db/schema/stages"

import {
  attendanceOf,
  attendanceRange,
  holidaySet,
} from "@/lib/attendance/queries"
import { workdaysIn } from "@/lib/attendance/recap"
import { complaintMonth } from "@/lib/layanan/complaints"
import { listRequests } from "@/lib/layanan/queries"
import { nowWib } from "@/lib/layanan/rules"
import { listEntriesInPeriod } from "@/lib/planner/queries"
import { resolvePeriod, todayWib } from "@/lib/planner/rules"
import {
  listReporters,
  listTeamDay,
  loadDay,
  loadPeriodDays,
} from "@/lib/report/queries"
import { addDays } from "@/lib/report/rules"

import {
  attendancePerDay,
  entriesPerDay,
  weekStartOf,
  weeklyAverages,
  workloadPerPerson,
} from "./rules"

const skip = <T>(allowed: boolean, load: () => Promise<T>) =>
  allowed ? load() : Promise.resolve(null)

export async function loadDashboard(user: CurrentUser) {
  const can = (p: Permission) => user.permissions.has(p)
  const today = todayWib()
  const week = resolvePeriod({ tanggal: today, rentang: "pekan" })
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(week.start, i))
  const scoreWeeks = Array.from({ length: 8 }, (_, i) =>
    addDays(weekStartOf(today), (i - 7) * 7)
  )
  const reportAllowed = can("laporan.isi")
  const scoreChart = can("laporan.rekap.sendiri")
  // Grafik kehadiran: pekan lalu + pekan ini, hanya hari kerja sampai hari ini.
  const attFrom = addDays(week.start, -7)
  const isManager = can("tugas_manajer.kelola")

  const [
    holidays,
    myAttendance,
    myDay,
    myDays,
    plannerEntries,
    teamAttendance,
    reporters,
    teamReports,
    pendingRequests,
    complaints,
  ] = await Promise.all([
    holidaySet(attFrom, today),
    skip(can("absensi.isi"), () => attendanceOf(user.id, today, today)),
    skip(reportAllowed, () => loadDay(user.id, today)),
    skip(reportAllowed, () =>
      loadPeriodDays(user.id, scoreChart ? scoreWeeks[0]! : week.start, today)
    ),
    skip(can("planner.lihat"), () => listEntriesInPeriod(week)),
    skip(can("absensi.rekap.semua"), () => attendanceRange(attFrom, today)),
    skip(can("absensi.rekap.semua"), () => listReporters()),
    skip(can("laporan.rekap.semua"), () => listTeamDay(today)),
    skip(can("layanan.setujui_sdm"), () => listRequests("diajukan")),
    skip(can("pengaduan.lihat"), () => complaintMonth(nowWib().month)),
  ])

  const myScore = myDays
    ? weeklyAverages([week.start], myDays)[0]!.average
    : null

  const managerTasks =
    myDay?.tasks.filter((t) => t.source === "manajer" && t.status !== "T") ?? []

  return {
    today,
    isHoliday: holidays.has(today),
    attendance: myAttendance
      ? ((myAttendance.get(today) ?? "hadir") as AttendanceStatus)
      : null,
    report: myDay && { state: myDay.state, score: myDay.score, average: myScore },
    managerTasks,
    scoreChart:
      scoreChart && myDays
        ? weeklyAverages(scoreWeeks, myDays).map((w) => ({
            start: w.start,
            average: w.average === null ? null : Math.round(w.average * 10) / 10,
          }))
        : null,
    plannerWeek: plannerEntries && entriesPerDay(plannerEntries, weekDays),
    teamAttendance:
      teamAttendance && reporters
        ? attendancePerDay(
            workdaysIn(attFrom, today, holidays),
            reporters.map((r) => r.id),
            teamAttendance
          )
        : null,
    teamToday:
      teamAttendance && reporters
        ? attendancePerDay([today], reporters.map((r) => r.id), teamAttendance)[0]!
        : null,
    reportMissing:
      teamReports
        ?.filter((r) => r.state === "terbuka" || r.state === "perlu_diperbarui")
        .map((r) => r.user.name) ?? null,
    pendingRequests: pendingRequests?.length ?? null,
    workload:
      isManager && plannerEntries
        ? workloadPerPerson(plannerEntries, week.start, week.end)
        : null,
    complaintWeeks: complaints?.summary.weeks ?? null,
  }
}

export type Dashboard = Awaited<ReturnType<typeof loadDashboard>>
