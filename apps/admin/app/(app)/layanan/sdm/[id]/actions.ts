"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUser, withPermission } from "@workspace/auth/session"

import {
  approveWithTasks,
  cancelApprovedRequest,
  rejectRequest,
  withdrawRequest,
} from "@/lib/layanan/mutations"
import { guarded, type CrudResult } from "@/lib/setting-crud"

// Daftar & detail pengajuan ada di bawah /layanan/sdm; segarkan semuanya.
const done = (result: CrudResult) => {
  if ("ok" in result) revalidatePath("/layanan/sdm", "layout")
  return result
}

/** Pemilik saja; withdrawRequest menolak pengajuan milik orang lain. */
export const withdrawAction = withPermission(
  "layanan.ajukan",
  async (id: number): Promise<CrudResult> => {
    const user = (await getCurrentUser())!
    return done(await guarded("/layanan/sdm/saya", () => withdrawRequest(user.id, id)))
  }
)

export const rejectAction = withPermission(
  "layanan.setujui_sdm",
  async (id: number, reason: string): Promise<CrudResult> => {
    const user = (await getCurrentUser())!
    return done(await guarded("/layanan/sdm/persetujuan", () => rejectRequest(user.id, id, reason)))
  }
)

export const approveTasksAction = withPermission(
  "layanan.setujui_sdm",
  async (id: number, raw: unknown): Promise<CrudResult> => {
    const user = (await getCurrentUser())!
    const result = await guarded("/tugas", () => approveWithTasks(user.id, id, raw))
    if ("ok" in result) revalidatePath("/laporan")
    return done(result)
  }
)

// cancelApprovedRequest tidak memeriksa izin sendiri; withPermission di sini yang menjaganya.
export const cancelAction = withPermission(
  "layanan.setujui_sdm",
  async (id: number, note: string, confirmName?: string): Promise<CrudResult> => {
    const user = (await getCurrentUser())!
    const result = await guarded("/planner", () =>
      cancelApprovedRequest(user.id, id, note, user.permissions, confirmName)
    )
    if ("ok" in result) {
      revalidatePath("/tugas")
      revalidatePath("/laporan")
    }
    return done(result)
  }
)
