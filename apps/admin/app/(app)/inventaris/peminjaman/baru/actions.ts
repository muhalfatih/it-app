"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUser, withPermission } from "@workspace/auth/session"

import { createLoan } from "@/lib/inventaris/mutations"
import type { CrudResult } from "@/lib/setting-crud"

export const createLoanAction = withPermission(
  "peminjaman.catat",
  async (raw: unknown): Promise<CrudResult<number>> => {
    const user = await getCurrentUser()
    if (!user) return { error: "Sesi berakhir" }
    const result = await createLoan(raw, user.id)
    // Stok di /inventaris ikut berubah; createLoan hanya menyegarkan daftar peminjaman.
    if ("ok" in result) revalidatePath("/inventaris")
    return result
  }
)
