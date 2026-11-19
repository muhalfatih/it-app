import type { Metadata } from "next"

import { requirePermission } from "@workspace/auth/session"

import { listHolidays } from "@/lib/attendance/queries"

import { HolidayList } from "./_holiday-list"

export const metadata: Metadata = { title: "Hari libur" }

export default async function LiburPage() {
  await requirePermission("absensi.isi")
  const holidays = await listHolidays()
  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Hari libur</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Hari libur tidak punya laporan harian dan tidak dihitung dalam skor.
        </p>
      </div>
      <HolidayList holidays={holidays} />
    </div>
  )
}
