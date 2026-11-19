// Modul murni (tanpa db/next): aturan tanggal, daftar tugas, skor, dan status laporan harian.
import { todayWib } from "../planner/rules"
import type { IsoDate } from "../planner/types"

/** Placeholder go-live modul; dikonfirmasi pengguna saat rilis. */
export const REPORT_START_DATE: IsoDate = "2026-12-01"

const DAY_MS = 86_400_000
const toMs = (d: IsoDate) => Date.parse(`${d}T00:00:00Z`)
const fromMs = (ms: number): IsoDate => new Date(ms).toISOString().slice(0, 10)
const addDays = (d: IsoDate, n: number): IsoDate => fromMs(toMs(d) + n * DAY_MS)

export function isWorkday(date: IsoDate, holidays: ReadonlySet<IsoDate>): boolean {
  return new Date(toMs(date)).getUTCDay() !== 0 && !holidays.has(date)
}

export function nextWorkday(date: IsoDate, holidays: ReadonlySet<IsoDate>): IsoDate {
  let d = addDays(date, 1)
  while (!isWorkday(d, holidays)) d = addDays(d, 1)
  return d
}

/** Pukul 10.00 WIB (= 03.00 UTC) hari kerja berikutnya. */
export function lockDeadline(date: IsoDate, holidays: ReadonlySet<IsoDate>): Date {
  return new Date(`${nextWorkday(date, holidays)}T03:00:00.000Z`)
}

export function firstReportDay(accountCreatedAt: Date): IsoDate {
  const created = todayWib(accountCreatedAt)
  return created > REPORT_START_DATE ? created : REPORT_START_DATE
}

export function isReportDay(
  date: IsoDate,
  holidays: ReadonlySet<IsoDate>,
  first: IsoDate,
  today: IsoDate
): boolean {
  return isWorkday(date, holidays) && first <= date && date <= today
}

/** Jumlah hari kerja di (after, upTo]. */
export function workdaysBetween(
  after: IsoDate,
  upTo: IsoDate,
  holidays: ReadonlySet<IsoDate>
): number {
  let n = 0
  for (let d = addDays(after, 1); d <= upTo; d = addDays(d, 1))
    if (isWorkday(d, holidays)) n++
  return n
}
