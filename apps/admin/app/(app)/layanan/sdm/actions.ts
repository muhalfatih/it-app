"use server"

import { getCurrentUser, withPermission } from "@workspace/auth/session"

import { createRequest } from "@/lib/layanan/mutations"
import { startRundownUpload } from "@/lib/layanan/rundown"
import { guarded, type CrudResult } from "@/lib/setting-crud"

export const submitRequestAction = withPermission(
  "layanan.ajukan",
  async (raw: unknown): Promise<CrudResult<{ id: number }>> => {
    const user = (await getCurrentUser())!
    return guarded("/layanan/sdm/saya", () => createRequest(user.id, raw))
  }
)

export const startRundownUploadAction = withPermission(
  "layanan.ajukan",
  (file: { name: string; size: number; mime: string }) =>
    guarded("/layanan/sdm", () => startRundownUpload(file))
)
