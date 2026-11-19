// Modul murni (tanpa db/next): aturan tanggal, daftar tugas, skor, dan status laporan harian.
import type {
  AnswerStatus,
  AttendanceStatus,
  TaskSource,
} from "@workspace/db/schema/stages"

import { todayWib } from "../planner/rules"
import type { IsoDate } from "../planner/types"

/** Tanggal go-live modul laporan harian (dikonfirmasi pengguna: 2026-12-01). */
export const REPORT_START_DATE: IsoDate = "2026-12-01"

const DAY_MS = 86_400_000
const toMs = (d: IsoDate) => Date.parse(`${d}T00:00:00Z`)
const fromMs = (ms: number): IsoDate => new Date(ms).toISOString().slice(0, 10)
export const addDays = (d: IsoDate, n: number): IsoDate => fromMs(toMs(d) + n * DAY_MS)

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

export type RangeSource = {
  id: number
  title: string
  startDate: IsoDate
  endDate: IsoDate
}
export type ReportTask = {
  key: string
  source: TaskSource
  title: string
  overdueDays: number
}

export const taskKey = (source: TaskSource, id: number) => `${source}:${id}`

export function tasksForDay(input: {
  date: IsoDate
  routine: { id: number; title: string }[]
  planner: RangeSource[]
  manager: RangeSource[]
  self: { id: number; title: string }[]
  tuntasBefore: ReadonlySet<string>
  holidays: ReadonlySet<IsoDate>
}): ReportTask[] {
  const { date, tuntasBefore, holidays } = input
  const plain = (source: TaskSource, rows: { id: number; title: string }[]) =>
    rows.map((r) => ({
      key: taskKey(source, r.id),
      source,
      title: r.title,
      overdueDays: 0,
    }))
  const ranged = (source: TaskSource, rows: RangeSource[]): ReportTask[] =>
    rows
      .filter((r) => r.startDate <= date && !tuntasBefore.has(taskKey(source, r.id)))
      .map((r) => ({
        key: taskKey(source, r.id),
        source,
        title: r.title,
        overdueDays: date > r.endDate ? workdaysBetween(r.endDate, date, holidays) : 0,
      }))
  return [
    ...plain("rutin", input.routine),
    ...ranged("planner", input.planner),
    ...ranged("manajer", input.manager),
    ...plain("sendiri", input.self),
  ]
}

export type DayScore = {
  done: number
  total: number
  bySource: Record<TaskSource, { done: number; total: number }>
}

export function dayScore(
  tasks: { key: string; source: TaskSource }[],
  answers: ReadonlyMap<string, AnswerStatus>
): DayScore {
  const s: DayScore = {
    done: 0,
    total: tasks.length,
    bySource: {
      rutin: { done: 0, total: 0 },
      planner: { done: 0, total: 0 },
      manajer: { done: 0, total: 0 },
      sendiri: { done: 0, total: 0 },
    },
  }
  for (const t of tasks) {
    s.bySource[t.source].total++
    if (answers.get(t.key) === "T") {
      s.done++
      s.bySource[t.source].done++
    }
  }
  return s
}

export function needsUpdate(
  submitted: { key: string; title: string }[] | null,
  current: ReportTask[]
): boolean {
  if (!submitted) return false
  const sig = (r: { key: string; title: string }[]) =>
    r.map((t) => `${t.key}|${t.title}`).sort().join("\n")
  return sig(submitted) !== sig(current)
}

export type ReportState =
  | "libur"
  | "bukan_hari_laporan"
  | "disembunyikan"
  | "terbuka"
  | "dikirim"
  | "perlu_diperbarui"
  | "terkunci"

export function reportState(i: {
  workday: boolean
  inRange: boolean
  attendance: AttendanceStatus | null
  frozen: boolean
  editable: boolean
  submitted: boolean
  stale: boolean
}): ReportState {
  if (!i.workday) return "libur"
  if (!i.inRange) return "bukan_hari_laporan"
  if (i.attendance !== null && i.attendance !== "hadir") return "disembunyikan"
  if (i.frozen || !i.editable) return "terkunci"
  if (i.submitted && i.stale) return "perlu_diperbarui"
  return i.submitted ? "dikirim" : "terbuka"
}

export function isEditable(i: {
  date: IsoDate
  holidays: ReadonlySet<IsoDate>
  now: Date
  unlocked: boolean
  frozen: boolean
}): boolean {
  return !i.frozen && (i.unlocked || i.now < lockDeadline(i.date, i.holidays))
}

/** Hari laporan sebelum (-1) atau sesudah (+1) `date`; null bila lewat batas awal atau hari ini. */
export function adjacentReportDay(
  date: IsoDate,
  dir: 1 | -1,
  holidays: ReadonlySet<IsoDate>,
  first: IsoDate,
  today: IsoDate
): IsoDate | null {
  let d = date
  // 400 hari lebih dari cukup melewati libur beruntun; kembali null bila tak ketemu.
  for (let i = 0; i < 400; i++) {
    d = addDays(d, dir)
    if (d < first || d > today) return null
    if (isReportDay(d, holidays, first, today)) return d
  }
  return null
}

const pct = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function scoreLabel(s: DayScore): string | null {
  if (s.total === 0) return null
  return `${s.done} dari ${s.total} tuntas · ${pct.format((s.done / s.total) * 100)}%`
}
