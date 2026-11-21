// Jalankan: pnpm --filter admin push:reminder (cron hari kerja pukul 15.45 WIB).
// Mengingatkan staf yang laporan hari ini belum dikirim (§10.2).
import { db } from "@workspace/db/client"
import { and, eq, isNotNull } from "@workspace/db/orm"
import { attendance, dailyReport } from "@workspace/db/schema"

import { todayWib } from "../lib/planner/rules"
import { notify } from "../lib/push/send"
import { allHolidays, listReporters } from "../lib/report/queries"
import { firstReportDay, isReportDay, isWorkday } from "../lib/report/rules"

const today = todayWib()
const holidays = await allHolidays()
if (!isWorkday(today, holidays)) {
  console.log(`Pengingat laporan: ${today} bukan hari kerja`)
  process.exit(0)
}

const [people, submitted, absent] = await Promise.all([
  listReporters(),
  db
    .select({ userId: dailyReport.userId })
    .from(dailyReport)
    .where(and(eq(dailyReport.date, today), isNotNull(dailyReport.submittedAt))),
  db
    .select({ userId: attendance.userId, status: attendance.status })
    .from(attendance)
    .where(eq(attendance.date, today)),
])
const done = new Set(submitted.map((r) => r.userId))
// Izin/sakit/cuti: hari ini bukan hari laporan bagi mereka (sama dengan assertWritable).
const off = new Set(absent.filter((a) => a.status !== "hadir").map((a) => a.userId))
const due = people
  .filter((p) => isReportDay(today, holidays, firstReportDay(p.createdAt), today))
  .filter((p) => !done.has(p.id) && !off.has(p.id))
  .map((p) => p.id)

await notify(
  { userIds: due },
  { title: "Pengingat laporan harian", body: "Laporan hari ini belum dikirim", url: "/laporan" }
)
console.log(`Pengingat laporan: ${due.length} staf diingatkan`)
process.exit(0)
