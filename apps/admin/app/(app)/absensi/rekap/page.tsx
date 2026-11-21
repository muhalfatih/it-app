import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { requireUser } from "@workspace/auth/session"

import { loadAttendanceRecap } from "@/lib/attendance/recap-queries"
import { resolvePeriod } from "@/lib/planner/rules"
import { listReporters } from "@/lib/report/queries"
import { parseRecapParams, periodLinks, periodTitle } from "@/lib/report/recap"

import { PeriodBar } from "../../laporan/rekap/_period-bar"
import { AttendanceRecapView, TeamAttendance } from "./_attendance-recap-view"

export const metadata: Metadata = { title: "Rekap absensi" }

export default async function RekapAbsensiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const user = await requireUser()
  const all = user.permissions.has("absensi.rekap.semua")
  if (!all && !user.permissions.has("absensi.rekap.sendiri"))
    redirect("/?akses=ditolak")

  const now = new Date()
  const { rentang, tanggal } = parseRecapParams(sp, now)
  const period = resolvePeriod({ tanggal, rentang })
  const links = periodLinks("/absensi/rekap", period, tanggal, parseRecapParams({}, now).tanggal)

  const people = all ? await listReporters() : []
  const rows = all
    ? await Promise.all(
        people.map(async (p) => ({ id: p.id, name: p.name, recap: await loadAttendanceRecap(p.id, period, now) }))
      )
    : []
  const own = all ? null : await loadAttendanceRecap(user.id, period, now)

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {all ? "Rekap absensi tim" : "Rekap absensi saya"}
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          {all
            ? "Jumlah hari per status untuk seluruh tim. Pilih nama untuk melihat tanggalnya."
            : "Jumlah hari per status absensimu pada periode ini."}
        </p>
      </div>
      <PeriodBar links={links} rentang={rentang} title={periodTitle(period)} />
      {all ? (
        <TeamAttendance rows={rows} query={`rentang=${rentang}&tanggal=${tanggal}`} />
      ) : (
        <AttendanceRecapView recap={own!} />
      )}
    </div>
  )
}
