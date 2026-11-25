"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CalendarCheckIcon,
  CalendarClockIcon,
  FileTextIcon,
  LayersIcon,
  RadioTowerIcon,
  UserCheckIcon,
} from "lucide-react"
import {
  useTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"

import {
  CONTENT_STAGE_LABEL,
  type ContentStage,
} from "@workspace/ui/components/domain/content-card"
import { Badge } from "@workspace/ui/components/reui/badge"
import { StatusBadge } from "@workspace/ui/components/domain/status-badge"
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

import type { ListRow } from "@/lib/planner/views"

const STAGE_VARIANT: Record<
  ContentStage,
  "outline" | "info-light" | "warning-light" | "success-light" | "primary-light"
> = {
  ide: "outline",
  draft: "info-light",
  review: "warning-light",
  disetujui: "success-light",
  tayang: "primary-light",
}

const LAYOUT = { headerBackground: false } as const

const COLUMNS: ColumnDef<DataGridFeatures, ListRow>[] = [
  {
    accessorKey: "name",
    id: "name",
    meta: gridMeta({ headerTitle: "Nama konten", icon: FileTextIcon }),
    header: ({ column }) => (
      <DataGridHeader title="Nama konten" column={column} />
    ),
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col">
        {/* Tautan asli supaya baris bisa dibuka dengan keyboard; klik baris juga membuka. */}
        <Link
          href={`/planner/${row.original.id}`}
          className="line-clamp-2 font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring"
          title={row.original.name}
          // Klik tautan ditangani Link sendiri (termasuk Ctrl/Cmd+klik ke tab baru); jangan ikut memicu onRowClick.
          onClick={(e) => e.stopPropagation()}
        >
          {row.original.name}
        </Link>
      </div>
    ),
    size: 260,
    enableSorting: false,
  },
  {
    id: "activity",
    meta: gridMeta({ headerTitle: "Kegiatan", icon: CalendarCheckIcon }),
    header: ({ column }) => (
      <DataGridHeader title="Kegiatan" column={column} />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.activity ?? "—"}</span>
    ),
    size: 130,
    enableSorting: false,
  },
  {
    id: "assignments",
    meta: gridMeta({ headerTitle: "Penugasan", icon: UserCheckIcon }),
    header: ({ column }) => (
      <DataGridHeader title="Penugasan" column={column} />
    ),
    cell: ({ row }) => (
      <span className="line-clamp-2 text-sm">{row.original.assignments}</span>
    ),
    size: 260,
    enableSorting: false,
  },
  {
    id: "channels",
    meta: gridMeta({ headerTitle: "Kanal", icon: RadioTowerIcon }),
    header: ({ column }) => (
      <DataGridHeader title="Kanal" column={column} />
    ),
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.channels.map((c) => (
          <Badge key={c} variant="outline" size="sm">
            {c}
          </Badge>
        ))}
      </div>
    ),
    size: 200,
    enableSorting: false,
  },
  {
    accessorKey: "publishDate",
    id: "publish",
    meta: gridMeta({ headerTitle: "Tayang", icon: CalendarClockIcon }),
    header: ({ column }) => (
      <DataGridHeader title="Tayang" column={column} />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {format(parseISO(row.original.publishDate), "EEE, d MMM", {
          locale: localeId,
        })}
      </span>
    ),
    size: 130,
    enableSorting: true,
  },
  {
    accessorKey: "stage",
    id: "stage",
    meta: gridMeta({ headerTitle: "Tahap", icon: LayersIcon }),
    header: ({ column }) => (
      <DataGridHeader title="Tahap" column={column} />
    ),
    cell: ({ row }) => (
      <StatusBadge variant={STAGE_VARIANT[row.original.stage]}>
        {CONTENT_STAGE_LABEL[row.original.stage]}
      </StatusBadge>
    ),
    size: 120,
    enableSorting: false,
  },
]

export function ListView({ rows }: { rows: ListRow[] }) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const table = useTable({
    features: dataGridFeatures,
    data: rows,
    columns: COLUMNS,
    getRowId: (row) => String(row.id),
    state: { sorting },
    onSortingChange: setSorting,
  })

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      i18n={DATA_GRID_I18N_ID}
      tableLayout={LAYOUT}
      onRowClick={(row) => router.push(`/planner/${row.id}`)}
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
