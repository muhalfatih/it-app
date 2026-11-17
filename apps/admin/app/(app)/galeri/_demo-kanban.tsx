"use client"

import * as React from "react"

import {
  CONTENT_STAGE_ICON,
  CONTENT_STAGE_LABEL,
  ContentCard,
  type ContentStage,
} from "@workspace/ui/components/domain/content-card"
import { KanbanColumnEmpty } from "@workspace/ui/components/domain/kanban-column-empty"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  Frame,
  FrameHeader,
  FrameTitle,
} from "@workspace/ui/components/reui/frame"
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@workspace/ui/components/reui/kanban"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { LONG_TITLE } from "./_data"

type Card = {
  id: string
  title: string
  channels: string[]
  assignees: { id: string; name: string }[]
  date: string
}

const BUDI = { id: "budi", name: "Budi Santoso" }
const SITI = { id: "siti", name: "Siti Rahmawati" }
const AHMAD = { id: "ahmad", name: "Ahmad Fauzan" }
const NUR = { id: "nur", name: "Nurul Hidayah" }

const INITIAL: Record<ContentStage, Card[]> = {
  ide: [
    {
      id: "k1",
      title: LONG_TITLE,
      channels: ["YouTube", "Instagram"],
      assignees: [NUR],
      date: "Sab, 21 Nov",
    },
    {
      id: "k5",
      title: "Ucapan Hari Guru Nasional",
      channels: ["Instagram", "WA Grup"],
      assignees: [SITI, NUR],
      date: "Rab, 25 Nov",
    },
  ],
  draft: [
    {
      id: "k2",
      title: "Poster Pentas Seni",
      channels: ["Instagram", "WA Grup"],
      assignees: [SITI],
      date: "Jum, 20 Nov",
    },
  ],
  review: [
    {
      id: "k3",
      title: "Video Profil Sekolah 2026",
      channels: ["YouTube", "TV Display"],
      assignees: [BUDI, AHMAD],
      date: "Kam, 19 Nov",
    },
  ],
  disetujui: [
    {
      id: "k4",
      title: "Dokumentasi Rapat Komite",
      channels: ["Facebook"],
      assignees: [BUDI],
      date: "Rab, 18 Nov",
    },
  ],
  tayang: [
    {
      id: "k6",
      title: "Liputan Upacara Hari Pahlawan",
      channels: ["Instagram", "YouTube", "TV Display"],
      assignees: [AHMAD],
      date: "Sel, 10 Nov",
    },
  ],
}

const EMPTY: Record<ContentStage, Card[]> = {
  ide: [],
  draft: [],
  review: [],
  disetujui: [],
  tayang: [],
}

type Fill = "berisi" | "sebagian" | "kosong"
const FILLS: { value: Fill; label: string }[] = [
  { value: "berisi", label: "Berisi" },
  { value: "sebagian", label: "Sebagian kosong" },
  { value: "kosong", label: "Kosong" },
]
const PRESETS: Record<Fill, Record<ContentStage, Card[]>> = {
  berisi: INITIAL,
  sebagian: { ...INITIAL, draft: [], disetujui: [] },
  kosong: EMPTY,
}

// Kartu lama: hanya tampil saat rentang "Semua" (di luar 30 hari terakhir).
const OLD_TAYANG: Card = {
  id: "k7",
  title: "Liputan Pentas Seni Oktober",
  channels: ["Instagram"],
  assignees: [BUDI],
  date: "Sab, 3 Okt",
}

const LOCKED: ContentStage[] = ["review", "disetujui", "tayang"]

const noop = () => () => {}

export function KanbanDemo() {
  const [columns, setColumns] = React.useState(INITIAL)
  const [fill, setFill] = React.useState<Fill>("berisi")
  const [showAll, setShowAll] = React.useState(false)
  // dnd-kit membuat id aria berbeda di server dan klien (hydration mismatch); render setelah mount saja.
  const mounted = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  if (!mounted) return <Skeleton className="h-64 w-full" />

  function pickFill(next: Fill) {
    setFill(next)
    setColumns(
      showAll && next !== "kosong"
        ? { ...PRESETS[next], tayang: [...PRESETS[next].tayang, OLD_TAYANG] }
        : PRESETS[next]
    )
  }

  function pickRange(all: boolean) {
    setShowAll(all)
    setColumns((c) => {
      const rest = c.tayang.filter((x) => x.id !== OLD_TAYANG.id)
      return { ...c, tayang: all ? [...rest, OLD_TAYANG] : rest }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        value={[fill]}
        onValueChange={(v) => v[0] && pickFill(v[0] as Fill)}
        variant="outline"
        size="sm"
        aria-label="Isi papan contoh"
      >
        {FILLS.map((f) => (
          <ToggleGroupItem key={f.value} value={f.value}>
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="overflow-x-auto pb-2">
        <Kanban
          value={columns}
          onValueChange={setColumns}
          getItemValue={(item) => item.id}
        >
          <KanbanBoard className="grid min-w-[62rem] auto-rows-fr grid-cols-5 gap-3 sm:grid-cols-5">
            {(Object.keys(columns) as ContentStage[]).map((stage) => {
              const Icon = CONTENT_STAGE_ICON[stage]
              return (
                <KanbanColumn key={stage} value={stage}>
                  <Frame spacing="sm" className="h-full">
                    <FrameHeader className="flex flex-row items-center gap-2">
                      <Icon
                        aria-hidden
                        className="size-4 text-muted-foreground"
                      />
                      <FrameTitle>{CONTENT_STAGE_LABEL[stage]}</FrameTitle>
                      <Badge variant="outline" size="sm" className="ml-auto">
                        {columns[stage].length}
                      </Badge>
                    </FrameHeader>
                    {stage === "tayang" && (
                      <ToggleGroup
                        value={[showAll ? "semua" : "30"]}
                        onValueChange={(v) =>
                          v[0] && pickRange(v[0] === "semua")
                        }
                        variant="outline"
                        size="sm"
                        spacing={0}
                        aria-label="Rentang kartu telah tayang"
                        className="w-full"
                      >
                        <ToggleGroupItem value="30" className="flex-1">
                          30 hari
                        </ToggleGroupItem>
                        <ToggleGroupItem value="semua" className="flex-1">
                          Semua
                        </ToggleGroupItem>
                      </ToggleGroup>
                    )}
                    <KanbanColumnContent
                      value={stage}
                      className="flex min-h-20 flex-1 flex-col gap-2 p-0.5"
                    >
                      {columns[stage].length === 0 && (
                        <KanbanColumnEmpty stage={stage} showAll={showAll} />
                      )}
                      {columns[stage].map((card) => (
                        <KanbanItem key={card.id} value={card.id}>
                          <KanbanItemHandle>
                            <ContentCard
                              title={card.title}
                              publishDate={card.date}
                              channels={card.channels}
                              assignees={card.assignees}
                              locked={LOCKED.includes(stage)}
                            />
                          </KanbanItemHandle>
                        </KanbanItem>
                      ))}
                    </KanbanColumnContent>
                  </Frame>
                </KanbanColumn>
              )
            })}
          </KanbanBoard>
          <KanbanOverlay className="rounded-md border-2 border-dashed bg-muted/10" />
        </Kanban>
      </div>
    </div>
  )
}
