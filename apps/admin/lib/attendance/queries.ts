// Query absensi dan hari libur (server-only).
import { db } from "@workspace/db/client"
import { and, asc, eq, gte, lte } from "@workspace/db/orm"
import { attendance, holiday } from "@workspace/db/schema"
import type { AttendanceStatus } from "@workspace/db/schema/stages"

import type { IsoDate } from "@/lib/planner/types"

export async function listHolidays(
  from?: IsoDate,
  to?: IsoDate
): Promise<{ date: IsoDate; name: string }[]> {
  const rows = await db
    .select({ date: holiday.date, name: holiday.name })
    .from(holiday)
    .where(
      and(from ? gte(holiday.date, from) : undefined, to ? lte(holiday.date, to) : undefined)
    )
    .orderBy(asc(holiday.date))
  return rows
}

export async function holidaySet(from: IsoDate, to: IsoDate): Promise<Set<IsoDate>> {
  return new Set((await listHolidays(from, to)).map((h) => h.date))
}

export async function attendanceFor(
  date: IsoDate
): Promise<Map<string, AttendanceStatus>> {
  const rows = await db
    .select({ userId: attendance.userId, status: attendance.status })
    .from(attendance)
    .where(eq(attendance.date, date))
  return new Map(rows.map((r) => [r.userId, r.status as AttendanceStatus]))
}

export async function attendanceOf(
  userId: string,
  from: IsoDate,
  to: IsoDate
): Promise<Map<IsoDate, AttendanceStatus>> {
  const rows = await db
    .select({ date: attendance.date, status: attendance.status })
    .from(attendance)
    .where(
      and(eq(attendance.userId, userId), gte(attendance.date, from), lte(attendance.date, to))
    )
  return new Map(rows.map((r) => [r.date, r.status as AttendanceStatus]))
}
