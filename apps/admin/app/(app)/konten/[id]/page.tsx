import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { cache } from "react"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { ArrowLeftIcon, LockIcon, MessageSquareWarningIcon } from "lucide-react"

import { requirePermission } from "@workspace/auth/session"
import { buttonVariants } from "@workspace/ui/components/button"
import { CONTENT_STAGE_LABEL } from "@workspace/ui/components/domain/content-card"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/reui/alert"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@workspace/ui/components/reui/frame"
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@workspace/ui/components/reui/timeline"

import { MAX_MEDIA_ITEMS } from "@/lib/kanban/media-rules"
import { getCard } from "@/lib/kanban/queries"
import {
  allowedMoves,
  canCheck,
  canEditContent,
  canUncheck,
  formatWib,
} from "@/lib/kanban/rules"
import type { CardEvent } from "@/lib/kanban/types"

import { CaptionForm } from "./_caption"
import { CommentForm } from "./_comments"
import { CardMediaSection } from "./_media"
import { PublishList } from "./_publish-list"
import { StageActions } from "./_stage-actions"

type Props = { params: Promise<{ id: string }> }

const loadCard = cache(async (id: string) => {
  const cardId = /^\d+$/.test(id) ? Number(id) : NaN
  return Number.isSafeInteger(cardId) && cardId >= 1 && cardId <= 2_147_483_647
    ? getCard(cardId)
    : null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requirePermission("kanban.lihat")
  const card = await loadCard((await params).id)
  if (!card) notFound()
  return { title: `${card.name} · Manajemen Konten` }
}

const day = (iso: string) => format(parseISO(iso), "d MMM yyyy", { locale: localeId })
const range = (start: string, end: string) =>
  start === end ? day(start) : `${day(start)} – ${day(end)}`

function eventTitle(e: CardEvent): string {
  const to = e.toStage ? CONTENT_STAGE_LABEL[e.toStage] : ""
  switch (e.kind) {
    case "maju":
      return e.toStage === "disetujui" ? "Disetujui" : `Dipindah ke ${to}`
    case "kembali":
      return `Dikembalikan ke ${to}`
    case "centang":
      return `Tayang di ${e.channelName}`
    case "batal_centang":
      return `Centang ${e.channelName} dibatalkan`
    case "otomatis":
      return `Otomatis pindah ke ${to}`
    case "catatan_sistem":
      return "Catatan sistem"
  }
}

export default async function KartuPage({ params }: Props) {
  const user = await requirePermission("kanban.lihat")
  const card = await loadCard((await params).id)
  if (!card) notFound()

  const perms = user.permissions
  const moves = allowedMoves(perms, card.stage, card.publishedCount)
  const editable = canEditContent(perms, card.stage)
  const locked = card.stage !== "ide" && card.stage !== "draft"
  const showPublish = card.stage === "disetujui" || card.stage === "tayang"

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/konten"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start" })}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Manajemen Konten
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-balance break-words">{card.name}</h1>
          <Badge variant="outline">
            {locked && <LockIcon aria-hidden />}
            {CONTENT_STAGE_LABEL[card.stage]}
          </Badge>
          <div className="sm:ml-auto">
            <StageActions
              cardId={card.id}
              name={card.name}
              stage={card.stage}
              forward={moves.forward}
              back={moves.back}
            />
          </div>
        </div>
      </div>

      {card.lastReturnNote && (
        <Alert variant="warning">
          <MessageSquareWarningIcon />
          <AlertTitle>Catatan revisi</AlertTitle>
          <AlertDescription className="whitespace-pre-line">
            {card.lastReturnNote}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Frame spacing="sm">
            <FrameHeader className="flex flex-row items-center gap-2">
              <FrameTitle>Data Planner</FrameTitle>
              <Link
                href={`/planner/${card.entryId}`}
                className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Buka di Planner
              </Link>
            </FrameHeader>
            <FramePanel>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
                <dt className="text-muted-foreground">Tanggal tayang</dt>
                <dd className="tabular-nums">{day(card.publishDate)}</dd>
                {card.activity && (
                  <>
                    <dt className="text-muted-foreground">Kegiatan</dt>
                    <dd className="tabular-nums">{range(card.activity.start, card.activity.end)}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">Kanal</dt>
                <dd className="flex flex-wrap gap-1">
                  {card.channels.map((c) => (
                    <Badge key={c.id} variant="outline" size="sm">
                      {c.name}
                    </Badge>
                  ))}
                </dd>
                <dt className="text-muted-foreground">Penugasan</dt>
                <dd>
                  <ul className="flex flex-col gap-1">
                    {card.assignments.map((a, i) => (
                      <li key={i}>
                        <span className="font-medium">{a.personName}</span>{" "}
                        <span className="text-muted-foreground">
                          {a.taskTypeName}, {range(a.start, a.end)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </dl>
            </FramePanel>
          </Frame>

          <Frame spacing="sm">
            <FrameHeader className="flex flex-row items-center gap-2">
              <FrameTitle>
                Konten{" "}
                <span className="font-normal text-muted-foreground tabular-nums">
                  ({card.media.length} dari {MAX_MEDIA_ITEMS})
                </span>
              </FrameTitle>
              {locked && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Terkunci sejak Review
                </span>
              )}
            </FrameHeader>
            <FramePanel>
              {!editable && card.media.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada konten.</p>
              ) : (
                <CardMediaSection
                  cardId={card.id}
                  media={card.media}
                  thumbnailMediaId={card.thumbnailMediaId}
                  disabled={!editable}
                />
              )}
            </FramePanel>
          </Frame>

          <Frame spacing="sm">
            <FrameHeader className="flex flex-row items-center gap-2">
              <FrameTitle>Caption</FrameTitle>
              {locked && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Terkunci sejak Review
                </span>
              )}
            </FrameHeader>
            <FramePanel>
              {editable ? (
                <CaptionForm key={card.caption ?? ""} cardId={card.id} caption={card.caption} />
              ) : card.caption ? (
                <p className="text-sm break-words whitespace-pre-line">{card.caption}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada caption.</p>
              )}
            </FramePanel>
          </Frame>

          {showPublish && (
            <Frame spacing="sm">
              <FrameHeader className="flex flex-row items-center gap-2">
                <FrameTitle>Tayang per kanal</FrameTitle>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {card.publishedCount}/{card.channels.length} kanal
                </span>
              </FrameHeader>
              <FramePanel>
                <PublishList
                  cardId={card.id}
                  canCheck={canCheck(perms, card.stage)}
                  canUncheck={canUncheck(perms, card.stage)}
                  channels={card.channels.map((c) => ({
                    ...c,
                    checkedLabel: c.publication ? formatWib(c.publication.checkedAt) : null,
                  }))}
                />
              </FramePanel>
            </Frame>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Frame spacing="sm">
            <FrameHeader>
              <FrameTitle>Riwayat</FrameTitle>
            </FrameHeader>
            <FramePanel>
              {card.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Kartu masih di tahap awal; belum ada perpindahan.
                </p>
              ) : (
                <Timeline value={card.events.length}>
                  {card.events.map((e, i) => (
                    <TimelineItem key={e.id} step={i + 1}>
                      <TimelineHeader>
                        <TimelineSeparator />
                        <TimelineDate className="tabular-nums">{formatWib(e.createdAt)}</TimelineDate>
                        <TimelineTitle>
                          {eventTitle(e)}{" "}
                          <span className="font-normal text-muted-foreground">oleh {e.actorName}</span>
                        </TimelineTitle>
                        <TimelineIndicator />
                      </TimelineHeader>
                      {e.note && (
                        <TimelineContent className="whitespace-pre-line">{e.note}</TimelineContent>
                      )}
                    </TimelineItem>
                  ))}
                </Timeline>
              )}
            </FramePanel>
          </Frame>

          <Frame spacing="sm">
            <FrameHeader>
              <FrameTitle>Komentar</FrameTitle>
            </FrameHeader>
            <FramePanel className="flex flex-col gap-4">
              {card.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada komentar. Masukan ringan bisa ditulis di sini tanpa memindahkan kartu.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {card.comments.map((c) => (
                    <li key={c.id} className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{c.authorName}</span>,{" "}
                        <span className="tabular-nums">{formatWib(c.createdAt)}</span>
                      </span>
                      <p className="text-sm break-words whitespace-pre-line">{c.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              <CommentForm cardId={card.id} />
            </FramePanel>
          </Frame>
        </div>
      </div>
    </div>
  )
}
