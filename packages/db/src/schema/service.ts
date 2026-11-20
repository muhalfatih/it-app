import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

import { building, taskType, unit } from "./app"
import { user } from "./auth"
import { plannerEntry } from "./planner"

export const SERVICE_STATUSES = [
  "diajukan",
  "disetujui",
  "ditolak",
  "dibatalkan",
] as const
export const FOLLOW_UPS = ["planner", "tugas"] as const
export const ISSUES = ["a", "b", "c", "d", "e", "f"] as const
export const OTHERS_AFFECTED = ["ya", "tidak", "tidak_tahu"] as const

/** Snapshot susunan SDM saat dibatalkan; `label` = jenis atau judul tugas. */
export type CancelledStaff = {
  name: string
  label: string
  start: string
  end: string
}[]

const inList = (values: readonly string[]) =>
  sql.raw(values.map((v) => `'${v}'`).join(", "))

/** Pengajuan SDM dari unit (Layanan). */
export const serviceRequest = pgTable(
  "service_request",
  {
    id: serial("id").primaryKey(),
    activityName: text("activity_name").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => unit.id, { onDelete: "restrict" }),
    waNumber: text("wa_number").notNull(),
    feeAgreed: boolean("fee_agreed").notNull(),
    rundownKey: text("rundown_key"),
    rundownName: text("rundown_name"),
    rundownMime: text("rundown_mime"),
    rundownSize: integer("rundown_size"),
    status: text("status").notNull().default("diajukan"),
    followUp: text("follow_up"),
    plannerEntryId: integer("planner_entry_id").references(
      () => plannerEntry.id,
      { onDelete: "restrict" }
    ),
    managerNote: text("manager_note"),
    cancelledStaff: jsonb("cancelled_staff").$type<CancelledStaff>(),
    requestedBy: text("requested_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    decidedBy: text("decided_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("service_request_planner_entry_id_unique").on(t.plannerEntryId),
    check("service_request_dates_check", sql`${t.endDate} >= ${t.startDate}`),
    check("service_request_fee_check", sql`${t.feeAgreed} = true`),
    check(
      "service_request_status_check",
      sql`${t.status} in (${inList(SERVICE_STATUSES)})`
    ),
    check(
      "service_request_follow_up_check",
      sql`${t.followUp} is null or ${t.followUp} in (${inList(FOLLOW_UPS)})`
    ),
    check(
      "service_request_diajukan_check",
      sql`${t.status} <> 'diajukan' or (${t.followUp} is null and ${t.plannerEntryId} is null and ${t.decidedBy} is null and ${t.decidedAt} is null)`
    ),
    check(
      "service_request_disetujui_check",
      sql`${t.status} <> 'disetujui' or (${t.followUp} is not null and (${t.followUp} = 'planner') = (${t.plannerEntryId} is not null))`
    ),
    check(
      "service_request_ditolak_check",
      sql`${t.status} <> 'ditolak' or (${t.managerNote} is not null and ${t.followUp} is null)`
    ),
    check(
      "service_request_dibatalkan_check",
      sql`${t.status} <> 'dibatalkan' or (${t.managerNote} is not null and ${t.plannerEntryId} is null and ${t.cancelledStaff} is not null)`
    ),
  ]
)

/** Kebutuhan SDM dari pengaju; tidak berubah setelah diajukan. */
export const serviceRequestStaff = pgTable(
  "service_request_staff",
  {
    requestId: integer("request_id")
      .notNull()
      .references(() => serviceRequest.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    taskTypeId: integer("task_type_id")
      .notNull()
      .references(() => taskType.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.requestId, t.position] })]
)

export const internetComplaint = pgTable(
  "internet_complaint",
  {
    id: serial("id").primaryKey(),
    buildingId: integer("building_id")
      .notNull()
      .references(() => building.id, { onDelete: "restrict" }),
    room: text("room").notNull(),
    issue: text("issue").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    othersAffected: text("others_affected").notNull(),
    description: text("description"),
    reportedBy: text("reported_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("internet_complaint_started_at_idx").on(t.startedAt),
    check(
      "internet_complaint_issue_check",
      sql`${t.issue} in (${inList(ISSUES)})`
    ),
    check(
      "internet_complaint_others_check",
      sql`${t.othersAffected} in (${inList(OTHERS_AFFECTED)})`
    ),
  ]
)
