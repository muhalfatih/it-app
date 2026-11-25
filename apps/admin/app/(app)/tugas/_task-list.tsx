"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTable, type ColumnDef } from "@tanstack/react-table"
import {
  CalendarIcon,
  CheckIcon,
  ClipboardListIcon,
  StickyNoteIcon,
  UsersIcon,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"

import { Badge } from "@workspace/ui/components/reui/badge"
import {
  DataGrid,
  dataGridFeatures,
  type DataGridFeatures,
} from "@workspace/ui/components/reui/data-grid/data-grid"
import { DataGridHeader, gridMeta } from "@workspace/ui/components/domain/data-grid-header"
import { DataGridStacked } from "@workspace/ui/components/domain/data-grid-stacked"
import { DataGridScrollArea } from "@workspace/ui/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@workspace/ui/components/reui/data-grid/data-grid-table"
import { DATA_GRID_I18N_ID } from "@workspace/ui/lib/i18n-id"

import type { ManagerTaskRow } from "@/lib/manager-task/queries"

const LAYOUT = { headerBackground: false } as const

/** "5 Des", "1–5 Des", atau "28 Nov – 2 Des". */
function rangeLabel(start: string, end: string): string {
  const f = (iso: string, p: string) =>
    format(parseISO(iso), p, { locale: localeId })
  if (start === end) return f(start, "d MMM")
  if (f(start, "MMM yyyy") === f(end, "MMM yyyy"))
    return `${f(start, "d")}–${f(end, "d MMM")}`
  return `${f(start, "d MMM")} – ${f(end, "d MMM")}`
}

const COLUMNS: ColumnDef<DataGridFeatures, ManagerTaskRow>[] = [
  {
    accessorKey: "title",
    id: "title",
    meta: gridMeta({ headerTitle: "Judul", icon: ClipboardListIcon }),
    header: ({ column }) => <DataGridHeader title="Judul" column={column} />,
    cell: ({ row }) => (
      <Link
        href={`/tugas/${row.original.id}`}
        className="line-clamp-2 font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring"
        title={row.original.title}
        onClick={(e) => e.stopPropagation()}
      >
        {row.original.title}
      </Link>
    ),
    size: 260,
    enableSorting: false,
  },
  {
    id: "assignees",
    meta: gridMeta({ headerTitle: "Staf", icon: UsersIcon }),
    header: ({ column }) => <DataGridHeader title="Staf" column={column} />,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.assignees.map((a) => (
          <Badge
            key={a.id}
            variant={a.done ? "success-light" : "outline"}
            size="sm"
          >
            {a.done && <CheckIcon aria-hidden />}
            {a.name}
            {a.done && <span className="sr-only"> (tuntas)</span>}
          </Badge>
        ))}
      </div>
    ),
    size: 280,
    enableSorting: false,
  },
  {
    id: "range",
    meta: gridMeta({ headerTitle: "Tanggal", icon: CalendarIcon }),
    header: ({ column }) => <DataGridHeader title="Tanggal" column={column} />,
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {rangeLabel(row.original.startDate, row.original.endDate)}
      </span>
    ),
    size: 140,
    enableSorting: false,
  },
  {
    id: "note",
    meta: gridMeta({ headerTitle: "Catatan", icon: StickyNoteIcon }),
    header: ({ column }) => <DataGridHeader title="Catatan" column={column} />,
    cell: ({ row }) => (
      <span className="line-clamp-2 text-sm text-muted-foreground">
        {row.original.note ?? "—"}
      </span>
    ),
    size: 260,
    enableSorting: false,
  },
]

export function TaskList({ rows }: { rows: ManagerTaskRow[] }) {
  const router = useRouter()
  const table = useTable({
    features: dataGridFeatures,
    data: rows,
    columns: COLUMNS,
    getRowId: (row) => String(row.id),
  })

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      i18n={DATA_GRID_I18N_ID}
      tableLayout={LAYOUT}
      onRowClick={(row) => router.push(`/tugas/${row.id}`)}
    >
      <div className="rounded-lg border">
        <DataGridScrollArea className="hidden md:block">
          <DataGridTable />
        </DataGridScrollArea>
        <DataGridStacked />
      </div>
    </DataGrid>
  )
}
