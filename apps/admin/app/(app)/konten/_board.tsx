"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import type { Permission } from "@workspace/auth/permissions"
import { CONTENT_STAGES, type ContentStage } from "@workspace/db/schema/stages"
import { KanbanColumnEmpty } from "@workspace/ui/components/domain/kanban-column-empty"
import {
  CONTENT_STAGE_ICON,
  CONTENT_STAGE_LABEL,
  ContentCard,
} from "@workspace/ui/components/domain/content-card"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
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
  type KanbanMoveEvent,
} from "@workspace/ui/components/reui/kanban"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { allowedMoves } from "@/lib/kanban/rules"
import type { BoardCard } from "@/lib/kanban/types"

import { moveCardAction } from "./actions"
import { NoteDialog } from "./_note-dialog"

export type BoardItem = BoardCard & { publishLabel: string }

const LOCKED: readonly ContentStage[] = ["review", "disetujui", "tayang"]
const noop = () => () => {}

type Pending = { card: BoardItem; to: ContentStage }

export function Board({
  cards,
  permissions,
  allPublished,
}: {
  cards: BoardItem[]
  permissions: Permission[]
  allPublished: boolean
}) {
  const isMobile = useIsMobile()
  const router = useRouter()
  const perms = React.useMemo(() => new Set(permissions), [permissions])
  const [optimistic, applyMove] = React.useOptimistic(
    cards,
    (state, move: { id: number; to: ContentStage }) =>
      state.map((c) => (c.id === move.id ? { ...c, stage: move.to } : c))
  )
  const [, startTransition] = React.useTransition()
  const [pending, setPending] = React.useState<Pending | null>(null)
  // dnd-kit membuat id aria berbeda di server dan klien (hydration mismatch); render setelah mount saja.
  const mounted = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )

  const columns = React.useMemo(() => {
    const byStage = Object.fromEntries(
      CONTENT_STAGES.map((s) => [s, [] as BoardItem[]])
    ) as Record<ContentStage, BoardItem[]>
    for (const c of optimistic) byStage[c.stage].push(c)
    return byStage
  }, [optimistic])

  function commit(card: BoardItem, to: ContentStage, note?: string) {
    return new Promise<string | null>((resolve) => {
      startTransition(async () => {
        applyMove({ id: card.id, to })
        const result = await moveCardAction(card.id, card.stage, to, note)
        if ("error" in result) {
          // Dengan catatan, galat tampil di dialog.
          if (note === undefined) toast.error(result.error)
          resolve(result.error)
          return
        }
        // revalidatePath di aksi sudah mengirim data papan terbaru.
        toast.success(`Kartu dipindah ke ${CONTENT_STAGE_LABEL[to]}`)
        resolve(null)
      })
    })
  }

  function onMove({
    activeContainer,
    activeIndex,
    overContainer,
  }: KanbanMoveEvent) {
    if (activeContainer === overContainer) return
    const card = columns[activeContainer as ContentStage]?.[activeIndex]
    if (!card) return
    const to = overContainer as ContentStage
    const targets = allowedMoves(perms, card.stage, card.publishedCount)
    if (to === targets.forward) void commit(card, to)
    else if (to === targets.back)
      // Buka dialog setelah klik lepas-seret selesai; bila tidak, Base UI menganggapnya "outside press" dan menutup dialog pada klik berikutnya.
      setTimeout(() => setPending({ card, to }), 0)
    else if (to === "tayang")
      toast.error(
        "Kartu pindah ke Telah Tayang otomatis saat semua kanal dicentang"
      )
    else toast.error("Anda tidak berwenang memindahkan kartu ke tahap ini")
  }

  if (!mounted) return <Skeleton className="h-96 w-full" />

  return (
    <>
      <div className="overflow-x-auto pb-2">
        <Kanban
          value={columns}
          onValueChange={() => {}}
          onMove={onMove}
          getItemValue={(item) => String(item.id)}
        >
          <KanbanBoard className="grid min-w-[62rem] grid-cols-5 gap-3 sm:grid-cols-5">
            {CONTENT_STAGES.map((stage) => {
              const Icon = CONTENT_STAGE_ICON[stage]
              const items = columns[stage]
              return (
                <KanbanColumn key={stage} value={stage}>
                  <Frame spacing="sm" className="h-full">
                    <FrameHeader className="flex flex-row items-center gap-2">
                      <Icon
                        aria-hidden
                        className="size-4 text-muted-foreground"
                      />
                      <FrameTitle>{CONTENT_STAGE_LABEL[stage]}</FrameTitle>
                      <Badge
                        variant="outline"
                        size="sm"
                        className="ml-auto tabular-nums"
                      >
                        {items.length}
                      </Badge>
                    </FrameHeader>
                    {stage === "tayang" && (
                      <ToggleGroup
                        value={[allPublished ? "semua" : "30"]}
                        onValueChange={(v) => {
                          if (v[0])
                            router.push(
                              v[0] === "semua"
                                ? "/konten?tayang=semua"
                                : "/konten"
                            )
                        }}
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
                      {items.length === 0 && (
                        <KanbanColumnEmpty
                          stage={stage}
                          showAll={allPublished}
                        />
                      )}
                      {items.map((card) => {
                        const targets = allowedMoves(
                          perms,
                          card.stage,
                          card.publishedCount
                        )
                        const movable =
                          !isMobile && Boolean(targets.forward || targets.back)
                        const cardEl = (
                          <ContentCard
                            title={card.name}
                            href={`/konten/${card.id}`}
                            publishDate={card.publishLabel}
                            channels={card.channels.map((c) => c.name)}
                            assignees={card.assignees}
                            locked={LOCKED.includes(card.stage)}
                            progress={
                              card.stage === "disetujui"
                                ? `${card.publishedCount}/${card.channels.length} kanal`
                                : undefined
                            }
                          />
                        )
                        // useSortable memasang role=button/tabindex=0, padahal listener keyboard ada di handle: tab stop kosong.
                        return (
                          <KanbanItem
                            key={card.id}
                            value={String(card.id)}
                            tabIndex={-1}
                            role={undefined}
                            aria-roledescription={undefined}
                          >
                            {/* Tanpa handle, kartu tidak bisa diseret (tanpa opacity bawaan disabled). */}
                            {movable ? (
                              <KanbanItemHandle>{cardEl}</KanbanItemHandle>
                            ) : (
                              cardEl
                            )}
                          </KanbanItem>
                        )
                      })}
                    </KanbanColumnContent>
                  </Frame>
                </KanbanColumn>
              )
            })}
          </KanbanBoard>
          <KanbanOverlay className="rounded-md border-2 border-dashed bg-muted/10" />
        </Kanban>
      </div>
      <NoteDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending ? `Kembalikan ke ${CONTENT_STAGE_LABEL[pending.to]}?` : ""
        }
        description={
          pending
            ? `“${pending.card.name}” dikembalikan untuk revisi. Catatan tersimpan di riwayat kartu.`
            : ""
        }
        label="Catatan revisi"
        confirmLabel="Kembalikan"
        onConfirm={(note) =>
          pending
            ? commit(pending.card, pending.to, note)
            : Promise.resolve(null)
        }
      />
    </>
  )
}
