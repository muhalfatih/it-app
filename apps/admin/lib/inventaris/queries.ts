// Query Inventaris (server-only).
import { db } from "@workspace/db/client"
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne } from "@workspace/db/orm"
import { equipment, loan, loanItem } from "@workspace/db/schema"

import type { Tx } from "@/lib/manager-task/mutations"

import { summarizeStock, type EquipmentStock, type StockRow } from "./rules"

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
    .where(ids ? inArray(loanItem.equipmentId, ids) : undefined)
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
