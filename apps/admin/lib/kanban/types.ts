import type { CardEventKind, ContentStage } from "@workspace/db/schema/stages"

import type { IsoDate } from "@/lib/planner/types"

export type BoardCard = {
  id: number
  entryId: number
  stage: ContentStage
  name: string
  publishDate: IsoDate
  channels: { id: number; name: string }[]
  /** Unik per orang, urut kemunculan penugasan. */
  assignees: { id: string; name: string }[]
  publishedCount: number
  thumbnailUrl: string | null
}

export type CardChannel = {
  id: number
  name: string
  requiresLink: boolean
  publication: { url: string | null; checkedByName: string; checkedAt: Date } | null
}

export type CardEvent = {
  id: number
  kind: CardEventKind
  fromStage: ContentStage | null
  toStage: ContentStage | null
  channelName: string | null
  note: string | null
  actorName: string
  createdAt: Date
}

export type CardDetail = Omit<BoardCard, "channels"> & {
  caption: string | null
  activity: { start: IsoDate; end: IsoDate } | null
  assignments: { personName: string; taskTypeName: string; start: IsoDate; end: IsoDate }[]
  channels: CardChannel[]
  /** Terbaru dulu. */
  events: CardEvent[]
  /** Terlama dulu. */
  comments: { id: number; authorName: string; body: string; createdAt: Date }[]
  /** Catatan pengembalian terakhir, selama kartu belum dimajukan lagi. */
  lastReturnNote: string | null
  /** Urut `position`. */
  media: CardMedia[]
  /** Thumbnail pilihan; null = bawaan. */
  thumbnailMediaId: number | null
}

export type EmbedProvider = "youtube" | "drive" | "tautan"

export type CardMedia = { id: number; position: number } & (
  | { source: "file"; mediaKind: "image" | "video"; mime: string; size: number; originalName: string }
  | { source: "embed"; url: string; provider: EmbedProvider; ref: string | null }
)
