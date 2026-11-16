"use client"

import * as React from "react"

import {
  CONTENT_STAGE_ICON,
  CONTENT_STAGE_LABEL,
  ContentCard,
  type ContentStage,
} from "@workspace/ui/components/domain/content-card"
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

const LOCKED: ContentStage[] = ["review", "disetujui", "tayang"]

const noop = () => () => {}

export function KanbanDemo() {
  const [columns, setColumns] = React.useState(INITIAL)
  // dnd-kit membuat id aria berbeda di server dan klien (hydration mismatch); render setelah mount saja.
  const mounted = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  if (!mounted) return <Skeleton className="h-64 w-full" />

  return (
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
                  <KanbanColumnContent
                    value={stage}
                    className="flex min-h-20 flex-col gap-2 p-0.5"
                  >
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
  )
}
