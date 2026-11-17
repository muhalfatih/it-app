import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { channel } from "./app"
import { user } from "./auth"
import { contentCard } from "./planner"
import { CARD_EVENT_KINDS, CONTENT_STAGES } from "./stages"

const inList = (values: readonly string[]) =>
  values.map((v) => `'${v}'`).join(", ")
const STAGES = inList(CONTENT_STAGES)

/** Riwayat kartu: perpindahan tahap, centang Tayang, catatan sistem (spesifikasi §6.6). */
export const contentCardEvent = pgTable(
  "content_card_event",
  {
    id: serial("id").primaryKey(),
    cardId: integer("card_id")
      .notNull()
      .references(() => contentCard.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    fromStage: text("from_stage"),
    toStage: text("to_stage"),
    channelId: integer("channel_id").references(() => channel.id, {
      onDelete: "restrict",
    }),
    note: text("note"),
    /** Orang yang memicu, termasuk untuk kejadian otomatis. */
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "content_card_event_kind_check",
      sql.raw(`kind in (${inList(CARD_EVENT_KINDS)})`)
    ),
    check(
      "content_card_event_stage_check",
      sql.raw(
        `(from_stage is null or from_stage in (${STAGES})) and (to_stage is null or to_stage in (${STAGES}))`
      )
    ),
    check(
      "content_card_event_note_check",
      sql.raw(`kind not in ('kembali', 'batal_centang') or note is not null`)
    ),
    index("content_card_event_card_idx").on(t.cardId, t.createdAt),
  ]
)

/** Komentar kartu; tidak bisa diedit/dihapus. */
export const contentCardComment = pgTable(
  "content_card_comment",
  {
    id: serial("id").primaryKey(),
    cardId: integer("card_id")
      .notNull()
      .references(() => contentCard.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("content_card_comment_card_idx").on(t.cardId, t.createdAt)]
)

/** Centang Tayang per kanal; batal centang = hapus baris (jejak di riwayat). */
export const contentCardPublication = pgTable(
  "content_card_publication",
  {
    cardId: integer("card_id")
      .notNull()
      .references(() => contentCard.id, { onDelete: "cascade" }),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channel.id, { onDelete: "restrict" }),
    url: text("url"),
    checkedBy: text("checked_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.channelId] })]
)
