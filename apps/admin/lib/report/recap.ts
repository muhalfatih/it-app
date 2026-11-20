// Modul murni (tanpa db/next): ringkasan rekap laporan harian per periode (spesifikasi §5.7).
import type { AnswerStatus, TaskSource } from "@workspace/db/schema/stages"

import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"

import { shiftPeriod, todayWib, validDate } from "../planner/rules"
import type { IsoDate, Period } from "../planner/types"
import type { DayScore, ReportState } from "./rules"

export type Rentang = "pekan" | "bulan"

/** Tautan navigasi periode; `next` null bila periode berikutnya belum dimulai. */
export function periodLinks(
  base: string,
  period: Period,
  tanggal: IsoDate,
  today: IsoDate
) {
  const q = (r: Rentang, d: IsoDate) => `${base}?rentang=${r}&tanggal=${d}`
  const next = shiftPeriod(period, 1)
  return {
    prev: q(period.kind, shiftPeriod(period, -1)),
    next: next <= today ? q(period.kind, next) : null,
    today: q(period.kind, today),
    pekan: q("pekan", tanggal),
    bulan: q("bulan", tanggal),
  }
}

export function periodTitle(period: Period): string {
  const f = (iso: IsoDate, p: string) => format(parseISO(iso), p, { locale: localeId })
  if (period.kind === "bulan") return f(period.start, "MMMM yyyy")
  if (f(period.start, "MMM yyyy") === f(period.end, "MMM yyyy"))
    return `${f(period.start, "d")}–${f(period.end, "d MMM yyyy")}`
  return `${f(period.start, "d MMM")} – ${f(period.end, "d MMM yyyy")}`
}

/** Query rekap: `rentang` (bawaan bulan) dan `tanggal` (bawaan/maksimum hari ini). */
export function parseRecapParams(
  sp: Record<string, string | string[] | undefined>,
  now: Date = new Date()
): { rentang: Rentang; tanggal: IsoDate } {
  const today = todayWib(now)
  const raw = validDate(sp.tanggal) ?? today
  return {
    rentang: sp.rentang === "pekan" ? "pekan" : "bulan",
    tanggal: raw > today ? today : raw,
  }
}

export type RecapDay = {
  date: IsoDate
  state: ReportState
  tasks: {
    key: string
    source: TaskSource
    title: string
    status: AnswerStatus | null
    overdueDays: number
  }[]
  obstacles: string
  score: DayScore
}

export type Recap = {
  days: { date: IsoDate; state: ReportState; pct: number | null }[]
  /** Rata-rata persentase harian; null bila tidak ada hari yang dihitung. */
  average: number | null
  bySource: DayScore["bySource"]
  open: {
    date: IsoDate
    key: string
    title: string
    source: TaskSource
    status: AnswerStatus | null
    overdueDays: number
  }[]
  obstacles: { date: IsoDate; text: string }[]
}

/** Hari libur, absen, dan di luar masa laporan tidak ikut skor (§5.4). */
const COUNTED: ReadonlySet<ReportState> = new Set([
  "terbuka",
  "dikirim",
  "perlu_diperbarui",
  "terkunci",
])

const percent = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
export const formatPercent = (n: number) => `${percent.format(n)}%`

export function summarizeRecap(days: RecapDay[]): Recap {
  const bySource: Recap["bySource"] = {
    rutin: { done: 0, total: 0 },
    planner: { done: 0, total: 0 },
    manajer: { done: 0, total: 0 },
    sendiri: { done: 0, total: 0 },
  }
  const open: Recap["open"] = []
  const obstacles: Recap["obstacles"] = []
  const pcts: number[] = []

  const rows = days.map((d) => {
    const counted = COUNTED.has(d.state)
    const pct = counted && d.score.total > 0 ? (d.score.done / d.score.total) * 100 : null
    if (pct !== null) pcts.push(pct)
    if (counted) {
      for (const s of Object.keys(bySource) as TaskSource[]) {
        bySource[s].done += d.score.bySource[s].done
        bySource[s].total += d.score.bySource[s].total
      }
      for (const t of d.tasks)
        if (t.status !== "T" && (t.status === "TL" || t.overdueDays > 0))
          open.push({
            date: d.date,
            key: t.key,
            title: t.title,
            source: t.source,
            status: t.status,
            overdueDays: t.overdueDays,
          })
    }
    if (d.obstacles.trim()) obstacles.push({ date: d.date, text: d.obstacles.trim() })
    return { date: d.date, state: d.state, pct }
  })

  return {
    days: rows,
    average: pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null,
    bySource,
    open,
    obstacles,
  }
}
