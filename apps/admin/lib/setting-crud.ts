// Server-only helper untuk daftar Setting sederhana (dipanggil dari aksi server yang sudah dijaga izin).
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@workspace/db/client"
import { asc, eq } from "@workspace/db/orm"
import { building, channel, taskType, unit } from "@workspace/db/schema"

import { UserError } from "@/lib/user-error"

export type CrudResult<T = void> = { ok: true; data?: T } | { error: string }

export { UserError }
type Table = typeof unit | typeof building | typeof taskType | typeof channel

export const nameSchema = z
  .string()
  .trim()
  .min(2, { message: "Nama minimal 2 karakter" })
  .max(80, { message: "Nama maksimal 80 karakter" })

const UNIQUE_VIOLATION = "23505"

/** Galat validasi & nama ganda jadi pesan; galat lain diteruskan. */
export async function guarded<T>(
  path: string,
  fn: () => Promise<T>
): Promise<CrudResult<T>> {
  try {
    const data = await fn()
    revalidatePath(path)
    return { ok: true, data }
  } catch (error) {
    if (error instanceof UserError) return { error: error.message }
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message ?? "Isian tidak valid" }
    }
    const code =
      (error as { code?: string; cause?: { code?: string } }).code ??
      (error as { cause?: { code?: string } }).cause?.code
    if (code === UNIQUE_VIOLATION) return { error: "Nama itu sudah ada" }
    throw error
  }
}

export async function listRows(table: Table) {
  return db.select().from(table).orderBy(asc(table.name))
}

export function addRow(
  table: Table,
  path: string,
  name: unknown,
  extra?: unknown
) {
  return guarded(path, async () => {
    const values = { name: nameSchema.parse(name) }
    if (table === channel) {
      await db
        .insert(channel)
        .values({ ...values, requiresLink: z.boolean().parse(extra ?? false) })
    } else {
      await db.insert(table).values(values)
    }
  })
}

const patchSchema = z.object({
  name: nameSchema.optional(),
  active: z.boolean().optional(),
  extra: z.boolean().optional(),
})

export function updateRow(
  table: Table,
  path: string,
  id: unknown,
  patch: unknown
) {
  return guarded(path, async () => {
    const rowId = z.number().int().positive().parse(id)
    const { name, active, extra } = patchSchema.parse(patch)
    if (table === channel) {
      await db
        .update(channel)
        .set({ name, active, requiresLink: extra })
        .where(eq(channel.id, rowId))
    } else {
      await db.update(table).set({ name, active }).where(eq(table.id, rowId))
    }
  })
}
