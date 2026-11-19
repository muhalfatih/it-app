"use server"

import { getCurrentUser, withPermission } from "@workspace/auth/session"
import type { AttendanceStatus } from "@workspace/db/schema/stages"

import { setAttendance } from "@/lib/attendance/mutations"
import type { IsoDate } from "@/lib/planner/types"
import { guarded, type CrudResult } from "@/lib/setting-crud"

export const saveAttendance = withPermission(
  "absensi.isi",
  async (
    userId: string,
    date: IsoDate,
    status: AttendanceStatus
  ): Promise<CrudResult> => {
    const user = await getCurrentUser()
    return guarded("/absensi", () =>
      setAttendance(user!.id, userId, date, status)
    )
  }
)
