"use server"

import { getCurrentUser, withPermission } from "@workspace/auth/session"

import { createComplaint } from "@/lib/layanan/complaints"
import { guarded, type CrudResult } from "@/lib/setting-crud"

export const submitComplaintAction = withPermission(
  "layanan.ajukan",
  async (raw: unknown): Promise<CrudResult> => {
    const user = (await getCurrentUser())!
    return guarded("/layanan/internet/rekap", () =>
      createComplaint(user.id, raw)
    )
  }
)
