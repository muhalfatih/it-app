"use client"

import * as React from "react"
import { useTable, type ColumnDef } from "@tanstack/react-table"
import { id as localeId } from "date-fns/locale"

import {
  AssignmentRows,
  type Assignment,
} from "@workspace/ui/components/domain/assignment-rows"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@workspace/ui/components/reui/data-grid/data-grid"
import { DataGridTable } from "@workspace/ui/components/reui/data-grid/data-grid-table"
import { EventCalendar } from "@workspace/ui/components/reui/event-calendar/event-calendar"
import { EventCalendarContent } from "@workspace/ui/components/reui/event-calendar/event-calendar-content"
import { EventCalendarNav } from "@workspace/ui/components/reui/event-calendar/event-calendar-nav"
import type { CalendarEvent } from "@workspace/ui/components/reui/event-calendar/event-calendar-types"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { EVENT_CALENDAR_I18N_ID } from "@workspace/ui/lib/i18n-id"

import { LONG_TITLE, PEOPLE, TASK_TYPES } from "./_data"

const d = (day: number) => new Date(2026, 10, day)

const EVENTS: CalendarEvent[] = [
  {
    id: "e1",
    title: "Take footage — Budi",
    start: d(16),
    end: d(18),
    allDay: true,
    color: "var(--chart-3)",
  },
  {
    id: "e2",
    title: "Editing — Budi",
    start: d(18),
    end: d(20),
    allDay: true,
    color: "var(--chart-4)",
  },
  {
    id: "e3",
    title: "Desain poster — Siti",
    start: d(18),
    end: d(19),
    allDay: true,
    color: "var(--chart-2)",
  },
  {
    id: "e4",
    title: "📺 Tayang: Video Profil Sekolah",
    start: d(19),
    end: d(20),
    allDay: true,
    color: "var(--primary)",
  },
]

type Entry = {
  id: string
  name: string
  dates: string
  channels: string
  publish: string
}

const ENTRIES: Entry[] = [
  {
    id: "p1",
    name: "Video Profil Sekolah 2026",
    dates: "16–20 Nov",
    channels: "YouTube, TV Display",
    publish: "Kam, 19 Nov",
  },
  {
    id: "p2",
    name: "Poster Pentas Seni",
    dates: "18 Nov",
    channels: "Instagram, WA Grup",
    publish: "Jum, 20 Nov",
  },
  {
    id: "p3",
    name: LONG_TITLE,
    dates: "20–21 Nov",
    channels: "YouTube, Instagram",
    publish: "Sab, 21 Nov",
  },
]

const COLUMNS: ColumnDef<DataGridFeatures, Entry>[] = [
  {
    accessorKey: "name",
    header: "Konten/Kegiatan",
    cell: ({ getValue }) => (
      <span className="line-clamp-2">{String(getValue())}</span>
    ),
  },
  { accessorKey: "dates", header: "Tanggal kegiatan" },
  { accessorKey: "channels", header: "Kanal" },
  {
    accessorKey: "publish",
    header: "Tayang",
    cell: ({ getValue }) => (
      <Badge variant="primary-light">{String(getValue())}</Badge>
    ),
  },
]

const noop = () => () => {}

function EntryList() {
  const table = useTable({
    features: dataGridFeatures,
    data: ENTRIES,
    columns: COLUMNS,
    getRowId: (row) => row.id,
  })
  return (
    <DataGrid table={table} recordCount={ENTRIES.length}>
      <DataGridContainer>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  )
}

export function PlannerDemo() {
  const [assignments, setAssignments] = React.useState<Assignment[]>([
    {
      personId: "budi",
      taskTypeId: "footage",
      start: "2026-11-16",
      end: "2026-11-17",
    },
    {
      personId: "budi",
      taskTypeId: "editing",
      start: "2026-11-18",
      end: "2026-11-19",
    },
  ])
  // Garis "sekarang" dihitung dari jam server vs klien (hydration mismatch); render kalender setelah mount saja.
  const mounted = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Di HP kalender digeser horizontal di kontainernya sendiri (PRD §6: Planner tetap terpakai di HP). */}
      <div className="overflow-x-auto">
        {!mounted ? (
          <Skeleton className="h-[420px] w-full" />
        ) : (
          <EventCalendar
            defaultEvents={EVENTS}
            defaultView="days"
            defaultDayCount={6}
            defaultDate={d(16)}
            weekStartsOn={1}
            locale={localeId}
            views={["days", "month", "agenda"]}
            interactions={{ drag: false, resize: false }}
            i18n={EVENT_CALENDAR_I18N_ID}
            dayStartHour={7}
            dayEndHour={17}
            className="h-[420px] min-w-[44rem]"
          >
            <EventCalendarNav />
            <EventCalendarContent />
          </EventCalendar>
        )}
      </div>
      <EntryList />
      <AssignmentRows
        value={assignments}
        onChange={setAssignments}
        people={PEOPLE}
        taskTypes={TASK_TYPES}
      />
    </div>
  )
}
