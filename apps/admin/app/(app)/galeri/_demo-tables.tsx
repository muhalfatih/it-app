"use client"

import * as React from "react"
import {
  useTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table"
import {
  CalendarRangeIcon,
  ClipboardListIcon,
  DownloadIcon,
  PlusIcon,
  Settings2Icon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  CONTENT_STAGE_LABEL,
  type ContentStage,
} from "@workspace/ui/components/domain/content-card"
import { Progress } from "@workspace/ui/components/progress"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  DataGrid,
  dataGridFeatures,
  type DataGridFeatures,
} from "@workspace/ui/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@workspace/ui/components/reui/data-grid/data-grid-column-header"
import { DataGridColumnVisibility } from "@workspace/ui/components/reui/data-grid/data-grid-column-visibility"
import { DataGridPagination } from "@workspace/ui/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@workspace/ui/components/reui/data-grid/data-grid-scroll-area"
import {
  DataGridTable,
  DataGridTableFootRow,
  DataGridTableFootRowCell,
} from "@workspace/ui/components/reui/data-grid/data-grid-table"
import { DATA_GRID_I18N_ID } from "@workspace/ui/lib/i18n-id"

import { LONG_TITLE } from "./_data"

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

const fmtPct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`

const LAYOUT = {
  headerBackground: false,
  columnsVisibility: true,
} as const

/* ---------- Rekap laporan harian ---------- */

type SourceKey = "rutin" | "planner" | "manajer" | "sendiri"
type Source = { done: number; total: number }
type Recap = Record<SourceKey, Source> & {
  id: string
  name: string
  role: string
  field: "IT" | "Media" | "IT & Media"
  tertunda: number
}

const RECAP: Recap[] = [
  {
    id: "budi",
    name: "Budi Santoso",
    role: "SDM Khusus",
    field: "Media",
    rutin: { done: 20, total: 24 },
    planner: { done: 9, total: 10 },
    manajer: { done: 2, total: 2 },
    sendiri: { done: 3, total: 3 },
    tertunda: 0,
  },
  {
    id: "siti",
    name: "Siti Rahmawati",
    role: "SDM Strategi",
    field: "Media",
    rutin: { done: 22, total: 24 },
    planner: { done: 6, total: 8 },
    manajer: { done: 1, total: 2 },
    sendiri: { done: 1, total: 1 },
    tertunda: 1,
  },
  {
    id: "ahmad",
    name: "Ahmad Fauzan",
    role: "SDM Khusus",
    field: "IT",
    rutin: { done: 18, total: 24 },
    planner: { done: 4, total: 9 },
    manajer: { done: 0, total: 1 },
    sendiri: { done: 5, total: 5 },
    tertunda: 3,
  },
  {
    id: "nur",
    name: "Nurul Hidayah Kusumawardhani",
    role: "SDM Khusus",
    field: "IT & Media",
    rutin: { done: 23, total: 24 },
    planner: { done: 7, total: 7 },
    manajer: { done: 2, total: 2 },
    sendiri: { done: 0, total: 0 },
    tertunda: 0,
  },
  {
    id: "rina",
    name: "Rina Marlina",
    role: "Manajer",
    field: "IT & Media",
    rutin: { done: 21, total: 24 },
    planner: { done: 2, total: 3 },
    manajer: { done: 0, total: 0 },
    sendiri: { done: 4, total: 6 },
    tertunda: 1,
  },
  {
    id: "dodi",
    name: "Dodi Prasetyo",
    role: "SDM Khusus",
    field: "IT",
    rutin: { done: 15, total: 24 },
    planner: { done: 1, total: 2 },
    manajer: { done: 1, total: 3 },
    sendiri: { done: 2, total: 2 },
    tertunda: 2,
  },
]

const SOURCES: [SourceKey, string][] = [
  ["rutin", "Rutin"],
  ["planner", "Planner"],
  ["manajer", "Dari Manajer"],
  ["sendiri", "Input sendiri"],
]

const score = (r: Recap) => {
  const all = SOURCES.map(([k]) => r[k])
  const total = all.reduce((a, x) => a + x.total, 0)
  return total ? (all.reduce((a, x) => a + x.done, 0) / total) * 100 : 0
}

function statusBadge(value: number) {
  if (value >= 85) return <Badge variant="success-light">Baik</Badge>
  if (value >= 70) return <Badge variant="warning-light">Perlu perhatian</Badge>
  return <Badge variant="destructive-light">Rendah</Badge>
}

const RECAP_COLUMNS: ColumnDef<DataGridFeatures, Recap>[] = [
  {
    accessorKey: "name",
    id: "name",
    header: ({ column }) => (
      <DataGridColumnHeader title="Staf" column={column} />
    ),
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-8">
          <AvatarFallback>{initials(row.original.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">
            {row.original.name}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {row.original.role} · {row.original.field}
          </span>
        </div>
      </div>
    ),
    size: 240,
    enableSorting: true,
    enableHiding: false,
  },
  ...SOURCES.map(([key, title]): ColumnDef<DataGridFeatures, Recap> => ({
    id: key,
    meta: { headerTitle: title },
    accessorFn: (r) => r[key].done,
    header: ({ column }) => (
      <DataGridColumnHeader title={title} visibility column={column} />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original[key].done}
        <span className="text-muted-foreground">
          /{row.original[key].total}
        </span>
      </span>
    ),
    size: 110,
    enableSorting: true,
    enableHiding: true,
  })),
  {
    id: "skor",
    meta: { headerTitle: "Skor" },
    accessorFn: score,
    header: ({ column }) => (
      <DataGridColumnHeader title="Skor" visibility column={column} />
    ),
    cell: ({ getValue }) => {
      const value = Number(getValue())
      return (
        <div className="flex items-center gap-2">
          <Progress
            value={value}
            className="w-16"
            aria-label={`Skor ${fmtPct(value)}`}
          />
          <span className="text-xs font-medium tabular-nums">
            {fmtPct(value)}
          </span>
        </div>
      )
    },
    size: 150,
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "status",
    meta: { headerTitle: "Status" },
    accessorFn: score,
    header: ({ column }) => (
      <DataGridColumnHeader title="Status" visibility column={column} />
    ),
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {statusBadge(score(row.original))}
        {row.original.tertunda > 0 ? (
          <Badge variant="outline">{row.original.tertunda} tertunda</Badge>
        ) : null}
      </div>
    ),
    size: 190,
    enableHiding: true,
  },
]

export function RecapGrid() {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "skor", desc: true },
  ])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })
  const table = useTable({
    features: dataGridFeatures,
    data: RECAP,
    columns: RECAP_COLUMNS,
    getRowId: (row) => row.id,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  })

  // Statistik seluruh tim (bukan hanya halaman aktif).
  const scores = RECAP.map(score)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const low = RECAP[scores.indexOf(Math.min(...scores))]
  const high = RECAP[scores.indexOf(Math.max(...scores))]
  const visible = new Set(table.getVisibleLeafColumns().map((c) => c.id))
  const footer = (
    <DataGridTableFootRow>
      {table.getVisibleLeafColumns().map((column) => {
        const id = column.id as SourceKey | "name" | "skor" | "status"
        if (id === "name")
          return (
            <DataGridTableFootRowCell key={id}>
              <span className="font-medium">Total tim</span>
            </DataGridTableFootRowCell>
          )
        if (id === "skor")
          return (
            <DataGridTableFootRowCell key={id}>
              <span className="font-medium tabular-nums">{fmtPct(avg)}</span>
              <span className="ml-1 text-xs text-muted-foreground">
                rata-rata
              </span>
            </DataGridTableFootRowCell>
          )
        if (id === "status")
          return (
            <DataGridTableFootRowCell key={id}>
              <span className="text-xs text-muted-foreground tabular-nums">
                {RECAP.reduce((a, r) => a + r.tertunda, 0)} tugas tertunda
              </span>
            </DataGridTableFootRowCell>
          )
        const done = RECAP.reduce((a, r) => a + r[id].done, 0)
        const total = RECAP.reduce((a, r) => a + r[id].total, 0)
        return (
          <DataGridTableFootRowCell key={id}>
            <span className="tabular-nums">
              {done}
              <span className="text-muted-foreground">/{total}</span>
            </span>
          </DataGridTableFootRowCell>
        )
      })}
    </DataGridTableFootRow>
  )

  return (
    <DataGrid
      table={table}
      recordCount={RECAP.length}
      i18n={DATA_GRID_I18N_ID}
      tableLayout={LAYOUT}
    >
      <Card className="w-full gap-0 p-0">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2">
            <ClipboardListIcon
              aria-hidden
              className="size-4 text-muted-foreground"
            />
            Rekap laporan harian
          </CardTitle>
          <CardDescription>
            Pekan 16–21 November · {RECAP.length} staf wajib lapor
          </CardDescription>
          <CardAction className="flex gap-2">
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button variant="outline" size="sm">
                  <Settings2Icon data-icon="inline-start" />
                  Kolom
                </Button>
              }
            />
            <Button variant="outline" size="sm">
              <DownloadIcon data-icon="inline-start" />
              PDF
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="border-y px-0">
          <DataGridScrollArea>
            <DataGridTable footerContent={footer} />
          </DataGridScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2 border-none bg-transparent! px-4 py-2.5">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Tertinggi{" "}
              <span className="font-medium text-foreground">
                {high?.name.split(" ")[0]} {fmtPct(Math.max(...scores))}
              </span>
            </span>
            <span>
              Terendah{" "}
              <span className="font-medium text-foreground">
                {low?.name.split(" ")[0]} {fmtPct(Math.min(...scores))}
              </span>
            </span>
            <span>
              Status{" "}
              <span className="font-medium text-foreground">
                {scores.filter((s) => s >= 85).length} baik ·{" "}
                {scores.filter((s) => s >= 70 && s < 85).length} perlu perhatian
                · {scores.filter((s) => s < 70).length} rendah
              </span>
            </span>
            {visible.size < RECAP_COLUMNS.length ? (
              <span>
                {RECAP_COLUMNS.length - visible.size} kolom disembunyikan
              </span>
            ) : null}
          </div>
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  )
}

/* ---------- Daftar Planner ---------- */

type Entry = {
  id: string
  name: string
  dates: string
  people: { id: string; name: string }[]
  channels: string[]
  stage: ContentStage
  publish: string
  publishSort: string
}

const ENTRIES: Entry[] = [
  {
    id: "p1",
    name: "Video Profil Sekolah 2026",
    dates: "16–20 Nov",
    people: [
      { id: "budi", name: "Budi Santoso" },
      { id: "ahmad", name: "Ahmad Fauzan" },
    ],
    channels: ["YouTube", "TV Display"],
    stage: "review",
    publish: "Kam, 19 Nov",
    publishSort: "2026-11-19",
  },
  {
    id: "p2",
    name: "Poster Pentas Seni",
    dates: "18 Nov",
    people: [{ id: "siti", name: "Siti Rahmawati" }],
    channels: ["Instagram", "WA Grup"],
    stage: "draft",
    publish: "Jum, 20 Nov",
    publishSort: "2026-11-20",
  },
  {
    id: "p3",
    name: LONG_TITLE,
    dates: "20–21 Nov",
    people: [{ id: "nur", name: "Nurul Hidayah" }],
    channels: ["YouTube", "Instagram"],
    stage: "ide",
    publish: "Sab, 21 Nov",
    publishSort: "2026-11-21",
  },
  {
    id: "p4",
    name: "Dokumentasi Rapat Komite",
    dates: "17 Nov",
    people: [{ id: "budi", name: "Budi Santoso" }],
    channels: ["Facebook"],
    stage: "disetujui",
    publish: "Rab, 18 Nov",
    publishSort: "2026-11-18",
  },
  {
    id: "p5",
    name: "Liputan Upacara Hari Pahlawan",
    dates: "10 Nov",
    people: [{ id: "ahmad", name: "Ahmad Fauzan" }],
    channels: ["Instagram", "YouTube", "TV Display"],
    stage: "tayang",
    publish: "Sel, 10 Nov",
    publishSort: "2026-11-10",
  },
]

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

const ENTRY_COLUMNS: ColumnDef<DataGridFeatures, Entry>[] = [
  {
    accessorKey: "name",
    id: "name",
    header: ({ column }) => (
      <DataGridColumnHeader title="Konten/Kegiatan" column={column} />
    ),
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col">
        <span
          className="line-clamp-2 font-medium text-foreground"
          title={row.original.name}
        >
          {row.original.name}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          Kegiatan {row.original.dates}
        </span>
      </div>
    ),
    size: 280,
    enableSorting: true,
    enableHiding: false,
  },
  {
    id: "people",
    meta: { headerTitle: "Penugasan" },
    header: ({ column }) => (
      <DataGridColumnHeader title="Penugasan" visibility column={column} />
    ),
    cell: ({ row }) => (
      <AvatarGroup>
        {row.original.people.map((p) => (
          <Avatar key={p.id} size="sm" title={p.name}>
            <AvatarFallback>{initials(p.name)}</AvatarFallback>
          </Avatar>
        ))}
      </AvatarGroup>
    ),
    size: 120,
    enableHiding: true,
  },
  {
    id: "channels",
    meta: { headerTitle: "Kanal" },
    header: ({ column }) => (
      <DataGridColumnHeader title="Kanal" visibility column={column} />
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
    enableHiding: true,
  },
  {
    accessorKey: "stage",
    id: "stage",
    meta: { headerTitle: "Tahap" },
    header: ({ column }) => (
      <DataGridColumnHeader title="Tahap" visibility column={column} />
    ),
    cell: ({ row }) => (
      <Badge variant={STAGE_VARIANT[row.original.stage]}>
        {CONTENT_STAGE_LABEL[row.original.stage]}
      </Badge>
    ),
    size: 130,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: "publish",
    meta: { headerTitle: "Tayang" },
    accessorKey: "publishSort",
    header: ({ column }) => (
      <DataGridColumnHeader title="Tayang" visibility column={column} />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.publish}</span>
    ),
    size: 120,
    enableSorting: true,
    enableHiding: false,
  },
]

export function PlannerGrid() {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "publish", desc: false },
  ])
  const table = useTable({
    features: dataGridFeatures,
    data: ENTRIES,
    columns: ENTRY_COLUMNS,
    getRowId: (row) => row.id,
    state: { sorting },
    onSortingChange: setSorting,
  })
  const perStage = (Object.keys(CONTENT_STAGE_LABEL) as ContentStage[])
    .map(
      (stage) =>
        [stage, ENTRIES.filter((e) => e.stage === stage).length] as const
    )
    .filter(([, n]) => n > 0)

  return (
    <DataGrid
      table={table}
      recordCount={ENTRIES.length}
      i18n={DATA_GRID_I18N_ID}
      tableLayout={LAYOUT}
    >
      <Card className="w-full gap-0 p-0">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center gap-2">
            <CalendarRangeIcon
              aria-hidden
              className="size-4 text-muted-foreground"
            />
            Daftar Planner
          </CardTitle>
          <CardDescription>November 2026 · urut tanggal tayang</CardDescription>
          <CardAction className="flex gap-2">
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button variant="outline" size="sm">
                  <Settings2Icon data-icon="inline-start" />
                  Kolom
                </Button>
              }
            />
            <Button size="sm">
              <PlusIcon data-icon="inline-start" />
              Entri
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="border-y px-0">
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center gap-2 border-none bg-transparent! px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground tabular-nums">
              {ENTRIES.length}
            </span>{" "}
            entri
          </span>
          {perStage.map(([stage, n]) => (
            <Badge key={stage} variant={STAGE_VARIANT[stage]} size="sm">
              {CONTENT_STAGE_LABEL[stage]} {n}
            </Badge>
          ))}
        </CardFooter>
      </Card>
    </DataGrid>
  )
}
