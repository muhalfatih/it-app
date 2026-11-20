// Mutasi data alat (server-only; dipanggil aksi server yang sudah dijaga izin).
import { db } from "@workspace/db/client"
import { and, asc, eq, inArray, isNull, ne } from "@workspace/db/orm"
import { equipment, loan, loanItem, unit } from "@workspace/db/schema"

import { parse, validId } from "@/lib/kanban/mutations"
import { guarded, type CrudResult } from "@/lib/setting-crud"
import { UserError } from "@/lib/user-error"

import { stockRows } from "./queries"
import { summarizeStock } from "./rules"
import { equipmentInputSchema, loanInputSchema, returnInputSchema } from "./schema"

const PATH = "/inventaris"
const LOAN_PATH = "/inventaris/peminjaman"
const LOAN_NOT_FOUND = "Transaksi tidak ditemukan"
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

export function createLoan(input: unknown, actorId: string): Promise<CrudResult<number>> {
  return guarded(LOAN_PATH, async () => {
    const { items, ...values } = parse(loanInputSchema, input)
    return db.transaction(async (tx) => {
      const [u] = await tx.select().from(unit).where(eq(unit.id, values.unitId))
      if (!u?.active) throw new UserError("Unit tidak ditemukan atau nonaktif")
      const ids = items.map((i) => i.equipmentId)
      // Urut id menaik: dua pencatatan bersamaan mengunci dalam urutan sama, jadi tidak deadlock.
      const rows = await tx
        .select()
        .from(equipment)
        .where(inArray(equipment.id, ids))
        .orderBy(asc(equipment.id))
        .for("update")
      if (rows.length !== ids.length) throw new UserError(NOT_FOUND)
      const stock = summarizeStock(rows, await stockRows(tx, ids))
      rows.forEach((e, i) => {
        if (!e.active) throw new UserError(`${e.name} sedang nonaktif`)
        const { available } = stock[i]!
        if (items.find((x) => x.equipmentId === e.id)!.qty > available)
          throw new UserError(`Stok ${e.name} tersedia hanya ${available}`)
      })
      const [row] = await tx
        .insert(loan)
        .values({ ...values, recordedBy: actorId })
        .returning({ id: loan.id })
      await tx.insert(loanItem).values(items.map((i) => ({ ...i, loanId: row!.id })))
      return row!.id
    })
  })
}

/** Pengembalian sekaligus: tiap alat transaksi wajib ada di input, tidak lebih. */
export function returnLoan(loanId: number, input: unknown, actorId: string): Promise<CrudResult> {
  return guarded(LOAN_PATH, async () => {
    if (!validId(loanId)) throw new UserError(LOAN_NOT_FOUND)
    const { returnedAt, items } = parse(returnInputSchema, input)
    await db.transaction(async (tx) => {
      // Kunci transaksi: kiriman ganda menunggu di sini lalu melihat returned_at terisi.
      const [l] = await tx.select().from(loan).where(eq(loan.id, loanId)).for("update")
      if (!l) throw new UserError(LOAN_NOT_FOUND)
      if (l.returnedAt) throw new UserError("Transaksi ini sudah dikembalikan")
      if (returnedAt < l.startedAt)
        throw new UserError("Waktu kembali tidak boleh sebelum waktu pinjam")
      const lines = await tx
        .select({ equipmentId: loanItem.equipmentId, qty: loanItem.qty, name: equipment.name })
        .from(loanItem)
        .innerJoin(equipment, eq(equipment.id, loanItem.equipmentId))
        .where(eq(loanItem.loanId, loanId))
      const byId = new Map(items.map((i) => [i.equipmentId, i]))
      if (
        byId.size !== items.length ||
        byId.size !== lines.length ||
        lines.some((x) => !byId.has(x.equipmentId))
      )
        throw new UserError("Isi semua alat dalam transaksi ini")
      for (const line of lines)
        if (byId.get(line.equipmentId)!.problemQty > line.qty)
          throw new UserError(`Jumlah bermasalah ${line.name} maksimal ${line.qty}`)
      await tx.update(loan).set({ returnedAt, returnedBy: actorId }).where(eq(loan.id, loanId))
      for (const { equipmentId, problemQty, problemNote } of items)
        await tx
          .update(loanItem)
          .set({ problemQty, problemNote })
          .where(and(eq(loanItem.loanId, loanId), eq(loanItem.equipmentId, equipmentId)))
    })
  })
}
