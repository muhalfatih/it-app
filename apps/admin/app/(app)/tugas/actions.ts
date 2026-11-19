"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUser, withPermission } from "@workspace/auth/session"

import {
  createManagerTask,
  deleteManagerTask,
  updateManagerTask,
} from "@/lib/manager-task/mutations"
import type { ManagerTaskInput } from "@/lib/manager-task/schema"
import { guarded, type CrudResult } from "@/lib/setting-crud"

export const saveTask = withPermission(
  "tugas_manajer.kelola",
  async (
    id: number | null,
    input: ManagerTaskInput
  ): Promise<CrudResult & { id?: number }> => {
    const user = await getCurrentUser()
    let savedId = id ?? undefined
    const result = await guarded("/tugas", async () => {
      if (id === null) savedId = (await createManagerTask(user!.id, input)).id
      else await updateManagerTask(id, input)
    })
    if ("error" in result) return result
    // Laporan staf memuat tugas ini, jadi segarkan juga.
    revalidatePath("/laporan")
    revalidatePath(`/tugas/${savedId}`)
    return { ok: true, id: savedId }
  }
)

export const removeTask = withPermission(
  "tugas_manajer.kelola",
  async (id: number, cancelNote?: string): Promise<CrudResult> => {
    const user = await getCurrentUser()
    const result = await guarded("/tugas", () =>
      deleteManagerTask(id, user!.id, cancelNote)
    )
    if ("ok" in result) {
      revalidatePath("/laporan")
      // Susunan SDM pengajuan tertaut dibaca dari tugas; detailnya ikut berubah.
      revalidatePath("/layanan/sdm", "layout")
    }
    return result
  }
)
