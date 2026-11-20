// Query Inventaris (server-only).
import { db } from "@workspace/db/client"
import {
  alias,
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
} from "@workspace/db/orm"
import { equipment, loan, loanItem, unit, user } from "@workspace/db/schema"

import type { Tx } from "@/lib/manager-task/mutations"

import {
  loanStatus,
  summarizeStock,
  type EquipmentStock,
  type LoanStatus,
  type StockRow,
} from "./rules"

export type EquipmentRow = EquipmentStock & { name: string; brand: string; active: boolean }

/** Baris peminjaman yang memengaruhi stok; `ids` membatasi ke alat tertentu. */
export function stockRows(ex: Tx | typeof db, ids?: number[]): Promise<StockRow[]> {
  return ex
    .select({
      equipmentId: loanItem.equipmentId,
      qty: loanItem.qty,
      problemQty: loanItem.problemQty,
      returned: isNotNull(loan.returnedAt).mapWith(Boolean),
      resolved: isNotNull(loanItem.resolvedAt).mapWith(Boolean),
    })
    .from(loanItem)
    .innerJoin(loan, eq(loan.id, loanItem.loanId))
    .where(
      and(
        ids ? inArray(loanItem.equipmentId, ids) : undefined,
        // Hanya baris yang masih menahan stok (lihat summarizeStock).
        or(isNull(loan.returnedAt), and(ne(loanItem.problemQty, 0), isNull(loanItem.resolvedAt)))
      )
    )
}

export async function listEquipment(): Promise<EquipmentRow[]> {
  const [items, rows] = await Promise.all([
    db.select().from(equipment).orderBy(asc(equipment.name), asc(equipment.brand)),
    stockRows(db),
  ])
  const stock = summarizeStock(items, rows)
  return items.map((e, i) => ({ ...stock[i]!, name: e.name, brand: e.brand, active: e.active }))
}

export type ProblemRow = {
  loanId: number
  equipmentId: number
  equipmentName: string
  problemQty: number
  problemNote: string
  returnedAt: Date
  borrowerName: string
}

/** Alat bermasalah yang belum dipulihkan, terbaru dulu. */
export async function listOpenProblems(): Promise<ProblemRow[]> {
  const rows = await db
    .select({
      loanId: loanItem.loanId,
      equipmentId: loanItem.equipmentId,
      equipmentName: equipment.name,
      problemQty: loanItem.problemQty,
      problemNote: loanItem.problemNote,
      returnedAt: loan.returnedAt,
      borrowerName: loan.borrowerName,
    })
    .from(loanItem)
    .innerJoin(loan, eq(loan.id, loanItem.loanId))
    .innerJoin(equipment, eq(equipment.id, loanItem.equipmentId))
    .where(and(ne(loanItem.problemQty, 0), isNull(loanItem.resolvedAt)))
    .orderBy(desc(loan.returnedAt), asc(loanItem.loanId), asc(equipment.name))
  // problem_qty > 0 hanya terisi saat pengembalian, jadi catatan dan returned_at pasti ada (cek DB).
  return rows.map((r) => ({ ...r, problemNote: r.problemNote!, returnedAt: r.returnedAt! }))
}

export type LoanRow = {
  id: number
  borrowerName: string
  unitName: string
  itemsLabel: string
  startedAt: Date
  dueAt: Date
  returnedAt: Date | null
  status: LoanStatus
}

export type LoanView = LoanRow & {
  waNumber: string | null
  recordedByName: string
  returnedByName: string | null
  items: {
    equipmentId: number
    equipmentName: string
    brand: string
    qty: number
    problemQty: number
    problemNote: string | null
    resolvedAt: Date | null
  }[]
}

const loanColumns = {
  id: loan.id,
  borrowerName: loan.borrowerName,
  unitName: unit.name,
  startedAt: loan.startedAt,
  dueAt: loan.dueAt,
  returnedAt: loan.returnedAt,
}

function itemsOf(loanIds: number[]) {
  return db
    .select({
      loanId: loanItem.loanId,
      equipmentId: loanItem.equipmentId,
      equipmentName: equipment.name,
      brand: equipment.brand,
      qty: loanItem.qty,
      problemQty: loanItem.problemQty,
      problemNote: loanItem.problemNote,
      resolvedAt: loanItem.resolvedAt,
    })
    .from(loanItem)
    .innerJoin(equipment, eq(equipment.id, loanItem.equipmentId))
    .where(inArray(loanItem.loanId, loanIds))
    .orderBy(asc(equipment.name), asc(equipment.brand))
}

const label = (items: { equipmentName: string; qty: number }[]) =>
  items.map((i) => `${i.equipmentName} ×${i.qty}`).join(", ")

/** Tab Dikembalikan hanya memuat sebanyak ini (terbaru), agar kueri dan inArray tetap kecil. */
export const RETURNED_LIMIT = 200

/** Terlambat: jatuh tempo terlama dulu; lainnya terbaru dulu. */
export async function listLoans(status: LoanStatus): Promise<LoanRow[]> {
  const now = new Date()
  const open = isNull(loan.returnedAt)
  const query = db
    .select(loanColumns)
    .from(loan)
    .innerJoin(unit, eq(unit.id, loan.unitId))
    .$dynamic()
  const rows = await (status === "dikembalikan"
    ? query
        .where(isNotNull(loan.returnedAt))
        .orderBy(desc(loan.returnedAt), desc(loan.id))
        .limit(RETURNED_LIMIT)
    : status === "terlambat"
      ? query.where(and(open, lt(loan.dueAt, now))).orderBy(asc(loan.dueAt), asc(loan.id))
      : query.where(and(open, gte(loan.dueAt, now))).orderBy(desc(loan.startedAt), desc(loan.id)))
  const items = rows.length ? await itemsOf(rows.map((r) => r.id)) : []
  return rows.map((r) => ({
    ...r,
    itemsLabel: label(items.filter((i) => i.loanId === r.id)),
    status: loanStatus(r, now),
  }))
}

export async function getLoan(id: number): Promise<LoanView | null> {
  const recorder = alias(user, "recorder")
  const returner = alias(user, "returner")
  const [r] = await db
    .select({
      ...loanColumns,
      waNumber: loan.waNumber,
      recordedByName: recorder.name,
      returnedByName: returner.name,
    })
    .from(loan)
    .innerJoin(unit, eq(unit.id, loan.unitId))
    .innerJoin(recorder, eq(recorder.id, loan.recordedBy))
    .leftJoin(returner, eq(returner.id, loan.returnedBy))
    .where(eq(loan.id, id))
  if (!r) return null
  const items = (await itemsOf([id])).map(({ loanId: _, ...i }) => i)
  return { ...r, itemsLabel: label(items), status: loanStatus(r, new Date()), items }
}

/** Pilihan formulir peminjaman: unit aktif dan alat aktif yang masih tersedia. */
export async function listBorrowOptions(): Promise<{
  units: { id: number; name: string }[]
  equipment: { id: number; name: string; brand: string; available: number }[]
}> {
  const [units, items] = await Promise.all([
    db
      .select({ id: unit.id, name: unit.name })
      .from(unit)
      .where(eq(unit.active, true))
      .orderBy(asc(unit.name)),
    listEquipment(),
  ])
  return {
    units,
    equipment: items
      .filter((e) => e.active && e.available > 0)
      .map(({ id, name, brand, available }) => ({ id, name, brand, available })),
  }
}
