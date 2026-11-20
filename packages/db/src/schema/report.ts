import { sql } from "drizzle-orm"
import {
  check,
  date,
  index,
  jsonb,
  pgTable,
  primaryKey,
  integer,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { user } from "./auth"
import { serviceRequest } from "./service"
import {
  ANSWER_STATUSES,
  ATTENDANCE_STATUSES,
  type FrozenReport,
} from "./stages"

const inList = (values: readonly string[]) =>
  sql.raw(values.map((v) => `'${v}'`).join(", "))

export const holiday = pgTable("holiday", {
  date: date("date", { mode: "string" }).primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** Tanpa baris = belum diisi = Hadir. */
export const attendance = pgTable(
  "attendance",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    status: text("status").notNull(),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.date] }),
    check(
      "attendance_status_check",
      sql`${t.status} in (${inList(ATTENDANCE_STATUSES)})`
    ),
  ]
)

export const managerTask = pgTable(
  "manager_task",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    note: text("note"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    serviceRequestId: integer("service_request_id").references(
      () => serviceRequest.id,
      { onDelete: "restrict" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("manager_task_dates_check", sql`${t.endDate} >= ${t.startDate}`),
    index("manager_task_service_request_idx").on(t.serviceRequestId),
  ]
)

export const managerTaskAssignee = pgTable(
  "manager_task_assignee",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => managerTask.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.userId] })]
)

/** Tugas input sendiri; hanya berlaku untuk satu tanggal. */
export const selfTask = pgTable(
  "self_task",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("self_task_user_date_idx").on(t.userId, t.date)]
)

export const dailyReport = pgTable(
  "daily_report",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    obstacles: text("obstacles").notNull().default(""),
    priorities: text("priorities").notNull().default(""),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedTasks: jsonb("submitted_tasks").$type<
      { key: string; title: string }[]
    >(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    unlockedBy: text("unlocked_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    frozen: jsonb("frozen").$type<FrozenReport>(),
    frozenAt: timestamp("frozen_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })]
)

export const dailyReportAnswer = pgTable(
  "daily_report_answer",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    taskKey: text("task_key").notNull(),
    status: text("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.date, t.taskKey] }),
    check(
      "daily_report_answer_status_check",
      sql`${t.status} in (${inList(ANSWER_STATUSES)})`
    ),
  ]
)
