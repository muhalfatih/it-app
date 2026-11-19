import type { Metadata } from "next"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"

import { requirePermission } from "@workspace/auth/session"

import { todayWib, validDate } from "@/lib/planner/rules"
import { freezeDue } from "@/lib/report/freeze"
import { listReporters, listTeamDay, loadNav } from "@/lib/report/queries"
import { REPORT_START_DATE, scoreLabel } from "@/lib/report/rules"

import { DayNav } from "../_day-nav"
import { TeamTable } from "./_team-table"

export const metadata: Metadata = { title: "Rekap tim · Laporan Harian" }

export default async function LaporanTimPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const user = await requirePermission("laporan.rekap.semua")
  const now = new Date()
  const today = todayWib(now)
  const raw = validDate(sp.tanggal) ?? today
  const date = raw > today ? today : raw

  await freezeDue((await listReporters()).map((r) => r.id), now)
  const [rows, nav] = await Promise.all([
    listTeamDay(date, now),
    loadNav(date, REPORT_START_DATE, now),
  ])

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Rekap tim</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Status dan skor laporan harian tiap staf. Pilih nama untuk membaca
          laporannya.
        </p>
      </div>
      <DayNav
        base="/laporan/tim"
        prev={nav.prev}
        next={nav.next}
        today={nav.today}
        title={format(parseISO(date), "EEEE, d MMM yyyy", { locale: localeId })}
      />
      <TeamTable
        date={date}
        canUnlock={user.permissions.has("laporan.buka_kunci")}
        rows={rows.map((r) => ({
          id: r.user.id,
          name: r.user.name,
          state: r.state,
          score: scoreLabel(r.score),
        }))}
      />
    </div>
  )
}
