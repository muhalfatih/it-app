// Modul murni (tanpa db/next): hitungan rekap absensi (spesifikasi §7.3).
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@workspace/db/schema/stages"

import type { IsoDate } from "../planner/types"
import { addDays, isWorkday } from "../report/rules"

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  hadir: "Hadir",
  izin: "Izin",
  izin_kegiatan: "Izin Kegiatan",
  sakit: "Sakit",
  tanpa_keterangan: "Tanpa Keterangan",
}

/** Hari kerja (Senin–Sabtu, bukan libur) dari `start` sampai `end`. */
export function workdaysIn(
  start: IsoDate,
  end: IsoDate,
  holidays: ReadonlySet<IsoDate>
): IsoDate[] {
  const days: IsoDate[] = []
  for (let d = start; d <= end; d = addDays(d, 1))
    if (isWorkday(d, holidays)) days.push(d)
  return days
}

/**
 * Tanpa baris = Hadir (§5.4). Baris di luar `workdays` diabaikan.
 * `absences` berisi hari yang statusnya bukan Hadir, urut tanggal.
 */
export function summarizeAttendance(
  workdays: readonly IsoDate[],
  rows: ReadonlyMap<IsoDate, AttendanceStatus>
): {
  counts: Record<AttendanceStatus, number>
  total: number
  absences: { date: IsoDate; status: AttendanceStatus }[]
} {
  const counts = Object.fromEntries(
    ATTENDANCE_STATUSES.map((s) => [s, 0])
  ) as Record<AttendanceStatus, number>
  const absences: { date: IsoDate; status: AttendanceStatus }[] = []
  for (const date of workdays) {
    const status = rows.get(date) ?? "hadir"
    counts[status]++
    if (status !== "hadir") absences.push({ date, status })
  }
  return { counts, total: workdays.length, absences }
}
