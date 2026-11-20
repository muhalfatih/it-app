// Mutasi data alat (server-only; dipanggil aksi server yang sudah dijaga izin).
import { db } from "@workspace/db/client"
import { and, eq, isNull, ne } from "@workspace/db/orm"
import { equipment, loanItem } from "@workspace/db/schema"

import { parse, validId } from "@/lib/kanban/mutations"
import { guarded, type CrudResult } from "@/lib/setting-crud"
import { UserError } from "@/lib/user-error"

import { stockRows } from "./queries"
import { summarizeStock } from "./rules"
import { equipmentInputSchema } from "./schema"

const PATH = "/inventaris"
const NOT_FOUND = "Alat tidak ditemukan"
const FK_VIOLATION = "23503"

function checkId(id: number) {
  if (!validId(id)) throw new UserError(NOT_FOUND)
}

export function createEquipment(input: unknown): Promise<CrudResult<number>> {
  return guarded(PATH, async () => {
    const values = parse(equipmentInputSchema, input)
    const [row] = await db.insert(equipment).values(values).returning({ id: equipment.id })
    return row!.id
  })
}

export function updateEquipment(id: number, input: unknown): Promise<CrudResult> {
  return guarded(PATH, async () => {
    checkId(id)
    const values = parse(equipmentInputSchema, input)
    await db.transaction(async (tx) => {
      // Kunci alat: pencatatan peminjaman ikut mengunci baris ini, jadi hitungan di bawah tidak basi.
      const [row] = await tx.select().from(equipment).where(eq(equipment.id, id)).for("update")
      if (!row) throw new UserError(NOT_FOUND)
      const [s] = summarizeStock([row], await stockRows(tx, [id]))
      const held = s!.onLoan + s!.unresolved
      if (values.total < held)
        throw new UserError(
          `Jumlah tidak boleh kurang dari ${held} yang sedang dipinjam atau bermasalah`
        )
      await tx.update(equipment).set(values).where(eq(equipment.id, id))
    })
  })
}

export function setEquipmentActive(id: number, active: boolean): Promise<CrudResult> {
  return guarded(PATH, async () => {
    checkId(id)
    const rows = await db
      .update(equipment)
      .set({ active: active === true })
      .where(eq(equipment.id, id))
      .returning({ id: equipment.id })
    if (rows.length === 0) throw new UserError(NOT_FOUND)
  })
}

export function deleteEquipment(id: number): Promise<CrudResult> {
  return guarded(PATH, async () => {
    checkId(id)
    try {
      const rows = await db
        .delete(equipment)
        .where(eq(equipment.id, id))
        .returning({ id: equipment.id })
      if (rows.length === 0) throw new UserError(NOT_FOUND)
    } catch (error) {
      const e = error as { code?: string; cause?: { code?: string } }
      if ((e.code ?? e.cause?.code) === FK_VIOLATION)
        throw new UserError(
          "Alat ini punya riwayat peminjaman. Nonaktifkan saja agar riwayat tetap terbaca."
        )
      throw error
    }
  })
}

/** Alat bermasalah sudah berfungsi lagi; stok tersedia naik sendiri. */
export function resolveProblem(
  loanId: number,
  equipmentId: number,
  actorId: string
): Promise<CrudResult> {
  return guarded(PATH, async () => {
    // Satu UPDATE bersyarat: baris terkunci selama update, jadi klik ganda hanya berhasil sekali.
    const rows =
      validId(loanId) && validId(equipmentId)
        ? await db
            .update(loanItem)
            .set({ resolvedAt: new Date(), resolvedBy: actorId })
            .where(
              and(
                eq(loanItem.loanId, loanId),
                eq(loanItem.equipmentId, equipmentId),
                ne(loanItem.problemQty, 0),
                isNull(loanItem.resolvedAt)
              )
            )
            .returning({ loanId: loanItem.loanId })
        : []
    if (rows.length === 0) throw new UserError("Alat sudah dipulihkan")
  })
}
