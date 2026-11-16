// Aturan murni Planner (tanpa db/next): periode, parameter URL, filter, dan izin hapus.
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"

import { defaultMyWorkOnly, type Permission } from "@workspace/auth/permissions"
import type { Role } from "@workspace/db/schema/roles"
import { LOCKED_STAGES, type ContentStage } from "@workspace/db/schema/stages"

import type {
  IsoDate,
  Period,
  PlannerEntry,
  PlannerParams,
  PlannerView,
} from "./types"

const ISO = "yyyy-MM-dd"
const VIEWS: readonly PlannerView[] = ["daftar", "kalender", "partisi"]

const fmt = (d: Date): IsoDate => format(d, ISO)

export function todayWib(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    now
  )
}

/** Hanya string tunggal yyyy-MM-dd yang benar-benar ada di kalender (tolak 2026-02-30). */
function validDate(value: string | string[] | undefined): IsoDate | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null
  const d = parseISO(value)
  return isValid(d) && fmt(d) === value ? value : null
}

export function parsePlannerParams(
  sp: Record<string, string | string[] | undefined>,
  roles: readonly Role[],
  now: Date = new Date()
): PlannerParams {
  const tampilan = VIEWS.find((v) => v === sp.tampilan) ?? "daftar"
  const rentang =
    tampilan === "daftar" && sp.rentang === "bulan" ? "bulan" : "pekan"
  const saya =
    sp.saya === "1" ? true : sp.saya === "0" ? false : defaultMyWorkOnly(roles)
  return { tampilan, tanggal: validDate(sp.tanggal) ?? todayWib(now), rentang, saya }
}

export function resolvePeriod(
  p: Pick<PlannerParams, "tanggal" | "rentang">
): Period {
  const d = parseISO(p.tanggal)
  if (p.rentang === "bulan")
    return { kind: "bulan", start: fmt(startOfMonth(d)), end: fmt(endOfMonth(d)) }
  const start = startOfWeek(d, { weekStartsOn: 1 })
  return { kind: "pekan", start: fmt(start), end: fmt(addDays(start, 6)) }
}

/** Tanggal awal periode sebelum (-1) atau berikutnya (+1), untuk tombol ‹ ›. */
export function shiftPeriod(period: Period, dir: -1 | 1): IsoDate {
  const start = parseISO(period.start)
  return fmt(
    period.kind === "bulan" ? addMonths(start, dir) : addDays(start, 7 * dir)
  )
}

export function rangesOverlap(
  aStart: IsoDate,
  aEnd: IsoDate,
  bStart: IsoDate,
  bEnd: IsoDate
): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

export function inPeriod(entry: PlannerEntry, period: Period): boolean {
  const { start, end } = period
  return (
    (entry.activityStart !== null &&
      entry.activityEnd !== null &&
      rangesOverlap(entry.activityStart, entry.activityEnd, start, end)) ||
    entry.assignments.some((a) => rangesOverlap(a.start, a.end, start, end)) ||
    (entry.publishDate >= start && entry.publishDate <= end)
  )
}

/** Urutan Daftar: awal kegiatan, kalau tak ada penugasan paling awal, kalau tak ada tanggal tayang. */
export function sortKey(entry: PlannerEntry): IsoDate {
  if (entry.activityStart) return entry.activityStart
  const starts = entry.assignments.map((a) => a.start).sort()
  return starts[0] ?? entry.publishDate
}

export function sortEntries(entries: PlannerEntry[]): PlannerEntry[] {
  return [...entries].sort(
    (x, y) =>
      sortKey(x).localeCompare(sortKey(y)) || x.name.localeCompare(y.name, "id")
  )
}

/** "Pekerjaan saya saja": entri yang punya penugasan saya yang beririsan dengan periode. */
export function applyMyWork(
  entries: PlannerEntry[],
  userId: string,
  period: Period
): PlannerEntry[] {
  return entries.filter((e) =>
    e.assignments.some(
      (a) =>
        a.userId === userId &&
        rangesOverlap(a.start, a.end, period.start, period.end)
    )
  )
}

export function needsNameConfirm(stage: ContentStage): boolean {
  return LOCKED_STAGES.includes(stage)
}

export function canDeleteEntry(
  permissions: ReadonlySet<Permission>,
  stage: ContentStage
): boolean {
  return permissions.has(
    needsNameConfirm(stage) ? "planner.hapus_terkunci" : "planner.ubah"
  )
}
