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
    version?: string
  ): Promise<CrudResult & { id?: number }> => {
    const user = await getCurrentUser()
    let savedId: number | undefined = id ?? undefined
    const result = await guarded("/planner", async () => {
      if (id === null) savedId = (await createEntry(input, user!.id)).id
      else await updateEntry(id, input, version)
    })
    if ("error" in result || savedId === undefined) return result
    revalidatePath(`/planner/${savedId}`)
    return { ok: true, id: savedId }
  }
)

export const removeEntry = withPermission(
  "planner.ubah",
  async (id: number, confirmName?: string): Promise<CrudResult> => {
    const user = await getCurrentUser()
    return guarded("/planner", () =>
      deleteEntry(id, user!.permissions, confirmName)
    )
  }
)
