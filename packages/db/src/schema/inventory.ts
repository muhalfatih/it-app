import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { unit } from "./app"
import { user } from "./auth"

/** Data alat; stok tersedia dihitung dari `loan_item`, tidak disimpan. */
export const equipment = pgTable(
  "equipment",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    total: integer("total").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("equipment_name_brand_lower_idx").on(
      sql`lower(${t.name})`,
      sql`lower(${t.brand})`
    ),
    check("equipment_total_check", sql`${t.total} > 0`),
  ]
)

/** Transaksi peminjaman alat. */
export const loan = pgTable(
  "loan",
  {
    id: serial("id").primaryKey(),
    borrowerName: text("borrower_name").notNull(),
    unitId: integer("unit_id")
      .notNull()
      .references(() => unit.id, { onDelete: "restrict" }),
    waNumber: text("wa_number"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    returnedBy: text("returned_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("loan_returned_at_idx").on(t.returnedAt),
    index("loan_due_at_idx").on(t.dueAt),
    check("loan_due_check", sql`${t.dueAt} > ${t.startedAt}`),
    check("loan_returned_check", sql`${t.returnedAt} >= ${t.startedAt}`),
    check(
      "loan_returned_by_with_returned_at",
      sql`(${t.returnedAt} is null) = (${t.returnedBy} is null)`
    ),
  ]
)

/** Baris alat dalam transaksi, termasuk jumlah bermasalah saat kembali. */
export const loanItem = pgTable(
  "loan_item",
  {
    loanId: integer("loan_id")
      .notNull()
      .references(() => loan.id, { onDelete: "cascade" }),
    equipmentId: integer("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "restrict" }),
    qty: integer("qty").notNull(),
    problemQty: integer("problem_qty").notNull().default(0),
    problemNote: text("problem_note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by").references(() => user.id, {
      onDelete: "restrict",
    }),
  },
  (t) => [
    primaryKey({ columns: [t.loanId, t.equipmentId] }),
    index("loan_item_equipment_id_idx").on(t.equipmentId),
    check("loan_item_qty_check", sql`${t.qty} > 0`),
    check(
      "loan_item_problem_qty_check",
      sql`${t.problemQty} >= 0 and ${t.problemQty} <= ${t.qty}`
    ),
    check(
      "loan_item_note_with_problem",
      sql`(${t.problemQty} > 0) = (${t.problemNote} is not null)`
    ),
    check(
      "loan_item_resolve_needs_problem",
      sql`${t.problemQty} > 0 or (${t.resolvedAt} is null and ${t.resolvedBy} is null)`
    ),
    check(
      "loan_item_resolved_by_with_at",
      sql`(${t.resolvedAt} is null) = (${t.resolvedBy} is null)`
    ),
  ]
)
