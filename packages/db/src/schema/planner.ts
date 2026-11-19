import { sql } from "drizzle-orm"
import {
  type AnyPgColumn,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

import { channel, taskType } from "./app"
import { user } from "./auth"
import { contentCardMedia } from "./kanban"
import { CONTENT_STAGES } from "./stages"

/** Entri Media Planner: satu konten dengan kegiatan (opsional), penugasan, kanal, dan tanggal tayang. */
export const plannerEntry = pgTable(
  "planner_entry",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    activityStart: date("activity_start", { mode: "string" }),
    activityEnd: date("activity_end", { mode: "string" }),
    publishDate: date("publish_date", { mode: "string" }).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check(
      "planner_entry_activity_check",
      sql`(${t.activityStart} is null and ${t.activityEnd} is null) or (${t.activityStart} is not null and ${t.activityEnd} is not null and ${t.activityEnd} >= ${t.activityStart})`
    ),
  ]
)

/** Penugasan: siapa mengerjakan jenis apa, pada rentang tanggal berapa. */
export const plannerAssignment = pgTable(
  "planner_assignment",
  {
    id: serial("id").primaryKey(),
    entryId: integer("entry_id")
      .notNull()
      .references(() => plannerEntry.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    taskTypeId: integer("task_type_id")
      .notNull()
      .references(() => taskType.id, { onDelete: "restrict" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
  },
  (t) => [
    check(
      "planner_assignment_dates_check",
      sql`${t.endDate} >= ${t.startDate}`
    ),
    index("planner_assignment_user_dates_idx").on(
      t.userId,
      t.startDate,
      t.endDate
    ),
    index("planner_assignment_entry_idx").on(t.entryId),
  ]
)

export const plannerEntryChannel = pgTable(
  "planner_entry_channel",
  {
    entryId: integer("entry_id")
      .notNull()
      .references(() => plannerEntry.id, { onDelete: "cascade" }),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channel.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.channelId] })]
)

/** Kartu konten minimal (tahap Ide saja di Tahap 1); satu kartu per entri. */
export const contentCard = pgTable(
  "content_card",
  {
    id: serial("id").primaryKey(),
    entryId: integer("entry_id")
      .notNull()
      .references(() => plannerEntry.id, { onDelete: "cascade" }),
    stage: text("stage").notNull().default("ide"),
    caption: text("caption"),
    /** Thumbnail pilihan; null = bawaan (foto pertama / ubin YouTube). */
    thumbnailMediaId: integer("thumbnail_media_id").references(
      (): AnyPgColumn => contentCardMedia.id,
      { onDelete: "set null" }
    ),
    /** Diisi setiap tahap berubah; batas 30 hari kolom Telah Tayang. */
    stageChangedAt: timestamp("stage_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("content_card_entry_unique").on(t.entryId),
    check(
      "content_card_stage_check",
      sql.raw(
        `stage in (${CONTENT_STAGES.map((s) => `'${s}'`).join(", ")})`
      )
    ),
  ]
)
