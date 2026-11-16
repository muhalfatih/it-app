"use client"

import * as React from "react"

import {
  CONTENT_STAGE_LABEL,
  ContentCard,
  type ContentStage,
} from "@workspace/ui/components/domain/content-card"
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@workspace/ui/components/reui/kanban"
import { Badge } from "@workspace/ui/components/reui/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { LONG_TITLE } from "./_data"

type Card = {
  id: string
  title: string
  channels: string[]
  assignees: { name: string }[]
  date: string
}

const INITIAL: Record<ContentStage, Card[]> = {
  ide: [
    {
      id: "k1",
      title: LONG_TITLE,
      channels: ["YouTube", "Instagram"],
      assignees: [{ name: "Nurul Hidayah" }],
      date: "Sab, 21 Nov",
    },
  ],
  draft: [
    {
      id: "k2",
      title: "Poster Pentas Seni",
      channels: ["Instagram", "WA Grup"],
      assignees: [{ name: "Siti Rahmawati" }],
      date: "Jum, 20 Nov",
    },
  ],
  review: [
    {
      id: "k3",
      title: "Video Profil Sekolah 2026",
      channels: ["YouTube", "TV Display"],
      assignees: [{ name: "Budi Santoso" }, { name: "Ahmad Fauzan" }],
      date: "Kam, 19 Nov",
    },
  ],
  disetujui: [
    {
      id: "k4",
      title: "Dokumentasi Rapat Komite",
      channels: ["Facebook"],
      assignees: [{ name: "Budi Santoso" }],
      date: "Rab, 18 Nov",
    },
  ],
  tayang: [],
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
  if (!mounted) return <Skeleton className="h-52 w-full" />

  return (
    <div className="overflow-x-auto pb-2">
      <Kanban
        value={columns}
        onValueChange={setColumns}
        getItemValue={(item) => item.id}
      >
        <KanbanBoard className="min-w-[72rem] grid-cols-5 gap-3 sm:grid-cols-5">
          {(Object.keys(columns) as ContentStage[]).map((stage) => (
            <KanbanColumn
              key={stage}
              value={stage}
              className="flex flex-col gap-2 rounded-xl bg-muted p-2"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium">
                  {CONTENT_STAGE_LABEL[stage]}
                </span>
                <Badge variant="outline">{columns[stage].length}</Badge>
              </div>
              <KanbanColumnContent
                value={stage}
                className="flex min-h-24 flex-col gap-2"
              >
                {columns[stage].map((card) => (
                  <KanbanItem key={card.id} value={card.id}>
                    <KanbanItemHandle>
                      <ContentCard
                        title={card.title}
                        stage={stage}
                        publishDate={card.date}
                        channels={card.channels}
                        assignees={card.assignees}
                        locked={LOCKED.includes(stage)}
                      />
                    </KanbanItemHandle>
                  </KanbanItem>
                ))}
              </KanbanColumnContent>
            </KanbanColumn>
          ))}
        </KanbanBoard>
        <KanbanOverlay>
          <div className="size-full rounded-2xl bg-muted" />
        </KanbanOverlay>
      </Kanban>
    </div>
  )
}
