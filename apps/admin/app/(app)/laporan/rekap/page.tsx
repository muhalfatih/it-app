import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { requireUser } from "@workspace/auth/session"

import { resolvePeriod } from "@/lib/planner/rules"
import { freezeDue } from "@/lib/report/freeze"
import { listReporters, loadRecap } from "@/lib/report/queries"
import { parseRecapParams, periodLinks, periodTitle } from "@/lib/report/recap"

import { PeriodBar } from "./_period-bar"
import { RecapView } from "./_recap-view"
import { TeamRecap } from "./_team-recap"

export const metadata: Metadata = { title: "Rekap laporan · Laporan Harian" }

export default async function RekapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const user = await requireUser()
  const all = user.permissions.has("laporan.rekap.semua")
  if (!all && !user.permissions.has("laporan.rekap.sendiri"))
    redirect("/?akses=ditolak")

  const now = new Date()
  const { rentang, tanggal } = parseRecapParams(sp, now)
  const period = resolvePeriod({ tanggal, rentang })
  const today = parseRecapParams({}, now).tanggal
  const links = periodLinks("/laporan/rekap", period, tanggal, today)

  // Manajer & Direktur: tabel seluruh tim; staf: rekap dirinya sendiri (spesifikasi §5.7).
  const people = all ? await listReporters() : []
  await freezeDue(all ? people.map((p) => p.id) : [user.id], now)
  const rows = all
    ? await Promise.all(
        people.map(async (p) => ({ id: p.id, name: p.name, recap: await loadRecap(p.id, period, now) }))
      )
    : []
  const own = all ? null : await loadRecap(user.id, period, now)

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {all ? "Rekap tim" : "Rekap & skor"}
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          {all
            ? "Ringkasan skor laporan harian seluruh tim. Pilih nama untuk melihat rinciannya."
            : "Skor laporan harianmu per pekan atau bulan, beserta tugas TL dan hambatan."}
        </p>
      </div>
      <PeriodBar links={links} rentang={rentang} title={periodTitle(period)} />
      {all ? (
        <TeamRecap rows={rows} query={`rentang=${rentang}&tanggal=${tanggal}`} />
      ) : (
        <RecapView recap={own!} />
      )}
    </div>
  )
}
