// Pembentuk data tiga tampilan Planner (murni).
import { addDays, format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"

import type { PartitionRow } from "@workspace/ui/components/domain/partition-grid"
import type { CalendarEvent } from "@workspace/ui/components/reui/event-calendar/event-calendar-types"
import type { ContentStage } from "@workspace/db/schema/stages"

import { sortEntries } from "./rules"
import type { IsoDate, Period, PlannerEntry, StaffMember } from "./types"

export type PlannerEventData = { entryId: number; kind: "tugas" | "tayang" }

export type ListRow = {
  id: number
  name: string
  activity: string | null
  assignments: string
  channels: string[]
  publishDate: IsoDate
  stage: ContentStage
}

const ISO = "yyyy-MM-dd"
const iso = (d: Date): IsoDate => format(d, ISO)

/** "16–18 Nov", "20 Nov", atau "30 Nov – 2 Des". */
function rangeText(start: IsoDate, end: IsoDate): string {
  const s = parseISO(start)
  const e = parseISO(end)
  const f = (d: Date, p: string) => format(d, p, { locale: localeId })
  if (start === end) return f(s, "d MMM")
  if (f(s, "MMM yyyy") === f(e, "MMM yyyy")) return `${f(s, "d")}–${f(e, "d MMM")}`
  return `${f(s, "d MMM")} – ${f(e, "d MMM")}`
}

export function toListRows(entries: PlannerEntry[]): ListRow[] {
  return sortEntries(entries).map((e) => ({
    id: e.id,
    name: e.name,
    activity:
      e.activityStart && e.activityEnd
        ? rangeText(e.activityStart, e.activityEnd)
        : null,
    assignments: e.assignments
      .map((a) => `${a.userName} · ${a.taskTypeName}`)
      .join(", "),
    channels: e.channels.map((c) => c.name),
    publishDate: e.publishDate,
    stage: e.stage,
  }))
}

/** Kalender membagi hari menurut Asia/Jakarta (prop timeZone di CalendarView), bukan zona server. */
const wibMidnight = (d: IsoDate) => new Date(`${d}T00:00:00+07:00`)

/** end eksklusif (hari selesai + 1); batas = tengah malam WIB, apa pun zona server. */
function allDay(start: IsoDate, end: IsoDate) {
  return {
    start: wibMidnight(start),
    end: wibMidnight(iso(addDays(parseISO(end), 1))),
    allDay: true as const,
  }
}

export function toCalendarEvents(
  entries: PlannerEntry[],
  opts: { myWorkUserId?: string } = {}
): CalendarEvent<PlannerEventData>[] {
  const mine = opts.myWorkUserId
  const events: CalendarEvent<PlannerEventData>[] = []
  for (const e of entries) {
    const tasks = mine
      ? e.assignments.filter((a) => a.userId === mine)
      : e.assignments
    if (mine && tasks.length === 0) continue
    for (const a of tasks)
      events.push({
        id: `t-${a.id}`,
        title: `${a.taskTypeName} · ${a.userName} — ${e.name}`,
        ...allDay(a.start, a.end),
        color: "var(--chart-3)",
        data: { entryId: e.id, kind: "tugas" },
      })
    events.push({
      id: `p-${e.id}`,
      title: `Tayang: ${e.name}`,
      ...allDay(e.publishDate, e.publishDate),
      color: "var(--warning)",
      data: { entryId: e.id, kind: "tayang" },
    })
  }
  return events
}

export function toPartitionRows(
  staff: StaffMember[],
  entries: PlannerEntry[],
  period: Period,
  opts: { myWorkUserId?: string } = {}
): PartitionRow[] {
  const days = Array.from({ length: 7 }, (_, i) =>
    iso(addDays(parseISO(period.start), i))
  )
  const rows = new Map<string, PartitionRow>(
    staff.map((s) => [
      s.id,
      {
        personId: s.id,
        name: s.name,
        items: Object.fromEntries(days.map((d) => [d, []])),
      },
    ])
  )
  const busy = new Set<string>()
  const extra: StaffMember[] = []
  for (const e of entries)
    for (const a of e.assignments) {
      let row = rows.get(a.userId)
      if (!row) {
        // Akun yang kini bukan staf unit (mis. hanya direktur): tugasnya tetap tampil.
        row = { personId: a.userId, name: a.userName, items: Object.fromEntries(days.map((d) => [d, []])) }
        rows.set(a.userId, row)
        extra.push({ id: a.userId, name: a.userName, disabled: true })
      }
      for (const day of days) {
        if (a.start > day || day > a.end) continue
        busy.add(a.userId)
        row.items[day].push({
          id: `t-${a.id}`,
          label: `${a.taskTypeName} — ${e.name}`,
          href: `/planner/${e.id}`,
        })
      }
    }

  const seen = new Set<string>()
  return [...staff, ...extra]
    .filter((s) => !seen.has(s.id) && !!seen.add(s.id))
    .filter((s) => !opts.myWorkUserId || s.id === opts.myWorkUserId)
    .filter((s) => !s.disabled || busy.has(s.id))
    .sort((x, y) => x.name.localeCompare(y.name, "id"))
    .map((s) => rows.get(s.id)!)
}

/** Senin–Sabtu; Minggu hanya bila ada penugasan di hari itu. */
export function weekDays(
  period: Period,
  rows: PartitionRow[]
): { key: IsoDate; label: string }[] {
  const start = parseISO(period.start)
  const count = (key: IsoDate) => rows.some((r) => (r.items[key]?.length ?? 0) > 0)
  const sunday = iso(addDays(start, 6))
  const keys = Array.from({ length: 6 }, (_, i) => iso(addDays(start, i)))
  if (count(sunday)) keys.push(sunday)
  return keys.map((key) => ({
    key,
    label: format(parseISO(key), "EEE d", { locale: localeId }),
  }))
}
