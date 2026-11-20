"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUser, withPermission } from "@workspace/auth/session"

import { returnLoan } from "@/lib/inventaris/mutations"
import type { CrudResult } from "@/lib/setting-crud"

export const returnLoanAction = withPermission(
  "peminjaman.catat",
  async (loanId: number, raw: unknown): Promise<CrudResult> => {
    const user = await getCurrentUser()
    if (!user) return { error: "Sesi berakhir" }
    const result = await returnLoan(loanId, raw, user.id)
    // Stok /inventaris dan halaman detail ikut berubah; returnLoan hanya menyegarkan daftar.
    if ("ok" in result) {
      revalidatePath("/inventaris")
      revalidatePath(`/inventaris/peminjaman/${loanId}`)
    }
    return result
  }
)
