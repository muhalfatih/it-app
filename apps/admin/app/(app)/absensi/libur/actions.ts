"use server"

import { withPermission } from "@workspace/auth/session"

import { addHoliday, deleteHoliday } from "@/lib/attendance/mutations"
import type { IsoDate } from "@/lib/planner/types"
import { guarded, type CrudResult } from "@/lib/setting-crud"

const PATH = "/absensi/libur"

export const addHolidayAction = withPermission(
  "absensi.isi",
  async (date: IsoDate, name: string): Promise<CrudResult> =>
    guarded(PATH, () => addHoliday(date, name))
)

export const removeHolidayAction = withPermission(
  "absensi.isi",
  async (date: IsoDate): Promise<CrudResult> =>
    guarded(PATH, () => deleteHoliday(date))
)
