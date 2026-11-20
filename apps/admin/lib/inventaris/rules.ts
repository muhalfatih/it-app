// Aturan murni Inventaris (tanpa db/next): status transaksi dan stok tersedia.

export type LoanStatus = "dipinjam" | "terlambat" | "dikembalikan"

export const STATUS_LABELS: Record<LoanStatus, string> = {
  dipinjam: "Dipinjam",
  terlambat: "Terlambat",
  dikembalikan: "Dikembalikan",
}

/** Perbandingan instan; zona WIB hanya untuk label tanggal di layar. */
export function loanStatus(
  loan: { dueAt: Date; returnedAt: Date | null },
  now: Date
): LoanStatus {
  if (loan.returnedAt) return "dikembalikan"
  return loan.dueAt.getTime() < now.getTime() ? "terlambat" : "dipinjam"
}

export type StockRow = {
  equipmentId: number
  qty: number
  problemQty: number
  returned: boolean
  resolved: boolean
}

export type EquipmentStock = {
  id: number
  total: number
  onLoan: number
  unresolved: number
  available: number
}

/** Belum kembali menahan `qty` penuh; sudah kembali menahan `problemQty` sampai dipulihkan. */
export function summarizeStock(
  equipment: { id: number; total: number }[],
  rows: StockRow[]
): EquipmentStock[] {
  const held = new Map<number, { onLoan: number; unresolved: number }>()
  for (const r of rows) {
    const h = held.get(r.equipmentId) ?? { onLoan: 0, unresolved: 0 }
    if (!r.returned) h.onLoan += r.qty
    else if (!r.resolved) h.unresolved += r.problemQty
    held.set(r.equipmentId, h)
  }
  return equipment.map(({ id, total }) => {
    const { onLoan, unresolved } = held.get(id) ?? { onLoan: 0, unresolved: 0 }
    return { id, total, onLoan, unresolved, available: total - onLoan - unresolved }
  })
}
