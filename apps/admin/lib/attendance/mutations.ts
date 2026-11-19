// Mutasi absensi dan hari libur (server-only; dipanggil aksi server yang sudah dijaga izin).
import { z } from "zod"

import { db } from "@workspace/db/client"
import { eq } from "@workspace/db/orm"
import { attendance, holiday } from "@workspace/db/schema"
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@workspace/db/schema/stages"

import { todayWib, validDate } from "@/lib/planner/rules"
import type { IsoDate } from "@/lib/planner/types"
import { listReporters } from "@/lib/report/queries"
import { isWorkday } from "@/lib/report/rules"
import { UserError } from "@/lib/user-error"

import { holidaySet } from "./queries"

const holidayName = z
  .string()
  .trim()
  .min(2, { message: "Nama minimal 2 karakter" })
  .max(80, { message: "Nama maksimal 80 karakter" })

const UNIQUE_VIOLATION = "23505"
const BAD_DATE = "Tanggal tidak valid"

export async function setAttendance(
  actorId: string,
  userId: string,
  date: IsoDate,
  status: AttendanceStatus
): Promise<void> {
  if (!ATTENDANCE_STATUSES.includes(status)) throw new UserError("Status tidak valid")
  if (!validDate(date)) throw new UserError(BAD_DATE)
  if (date > todayWib()) throw new UserError("Tanggal belum tiba")
  if (!isWorkday(date, await holidaySet(date, date)))
    throw new UserError("Hari itu hari libur atau Minggu")
  if (!(await listReporters()).some((r) => r.id === userId))
    throw new UserError("Staf tidak valid")
  await db
    .insert(attendance)
    .values({ userId, date, status, updatedBy: actorId })
    .onConflictDoUpdate({
      target: [attendance.userId, attendance.date],
      set: { status, updatedBy: actorId, updatedAt: new Date() },
    })
}

export async function addHoliday(date: IsoDate, name: string): Promise<void> {
  const parsed = holidayName.parse(name)
  if (!validDate(date)) throw new UserError(BAD_DATE)
  try {
    await db.insert(holiday).values({ date, name: parsed })
  } catch (error) {
    const code =
      (error as { code?: string }).code ??
      (error as { cause?: { code?: string } }).cause?.code
    if (code === UNIQUE_VIOLATION)
      throw new UserError("Tanggal sudah ditandai libur")
    throw error
  }
}

export async function deleteHoliday(date: IsoDate): Promise<void> {
  await db.delete(holiday).where(eq(holiday.date, date))
}
