"use server"

import { revalidatePath } from "next/cache"

import { getCurrentUser, withPermission } from "@workspace/auth/session"

import { createEntry, deleteEntry, updateEntry } from "@/lib/planner/mutations"
import type { EntryInput } from "@/lib/planner/schema"
import { guarded, type CrudResult } from "@/lib/setting-crud"

export const saveEntry = withPermission(
  "planner.ubah",
  async (
    id: number | null,
    input: EntryInput,
    version?: string,
    /** Entri baru dari `?pengajuan=`: menyetujui pengajuan itu (createEntry memeriksa `layanan.setujui_sdm`). */
    approval?: { requestId: number; note: string | null }
  ): Promise<CrudResult & { id?: number }> => {
    const user = await getCurrentUser()
    let savedId: number | undefined = id ?? undefined
    const result = await guarded("/planner", async () => {
      if (id === null)
        savedId = (
          await createEntry(
            input,
            user!.id,
            approval && { ...approval, permissions: user!.permissions }
          )
        ).id
      else await updateEntry(id, user!.id, input, version)
    })
    if ("error" in result || savedId === undefined) return result
    revalidatePath(`/planner/${savedId}`)
    if (approval) revalidatePath("/layanan/sdm", "layout")
    return { ok: true, id: savedId }
  }
)

export const removeEntry = withPermission(
  "planner.ubah",
  async (id: number, confirmName?: string, cancelNote?: string): Promise<CrudResult> => {
    const user = await getCurrentUser()
    const result = await guarded("/planner", () =>
      deleteEntry(id, user!.permissions, confirmName, cancelNote, user!.id)
    )
    if ("ok" in result && cancelNote !== undefined) revalidatePath("/layanan/sdm", "layout")
    return result
  }
)
