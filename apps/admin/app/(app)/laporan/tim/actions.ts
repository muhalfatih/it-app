"use server"

import { getCurrentUser, withPermission } from "@workspace/auth/session"

import type { IsoDate } from "@/lib/planner/types"
import { unlockReport } from "@/lib/report/mutations"
import { guarded, type CrudResult } from "@/lib/setting-crud"

// actorId dari sesi, bukan dari klien.
export const unlock = withPermission(
  "laporan.buka_kunci",
  async (userId: string, date: IsoDate): Promise<CrudResult> => {
    const actor = await getCurrentUser()
    return guarded("/laporan/tim", () => unlockReport(actor!.id, userId, date))
  }
)
