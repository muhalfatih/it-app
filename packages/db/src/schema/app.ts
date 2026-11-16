import { sql } from "drizzle-orm"
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow()

/** Daftar Setting sederhana: nama unik (tanpa beda huruf besar/kecil), bisa dinonaktifkan. */
function settingTable<T extends string>(name: T) {
  return pgTable(
    name,
    {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      active: boolean("active").notNull().default(true),
      createdAt: createdAt(),
    },
    (t) => [uniqueIndex(`${name}_name_lower_idx`).on(sql`lower(${t.name})`)]
  )
}

/** Unit pengaju (Setting §3.4). */
export const unit = settingTable("unit")
/** Gedung untuk Pengaduan Internet. */
export const building = settingTable("building")
/** Daftar penugasan (Take footage, Editing, …), juga dipakai Pengajuan SDM. */
export const taskType = settingTable("task_type")

/** Kanal output; kanal "Wajib link" harus diisi link saat dicentang Tayang. */
export const channel = pgTable(
  "channel",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    requiresLink: boolean("requires_link").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("channel_name_lower_idx").on(sql`lower(${t.name})`)]
)

/** Peran akun (multi-peran). Akun tanpa baris = Staf Unit Lain. FK ke user ditambahkan bersama skema auth. */
export const userRole = pgTable(
  "user_role",
  {
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.role] })]
)

/** Tugas rutin per orang, muncul setiap hari kerja di laporan harian. */
export const routineTask = pgTable("routine_task", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
})
