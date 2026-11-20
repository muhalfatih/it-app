import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { requirePermission } from "@workspace/auth/session"
import { buttonVariants } from "@workspace/ui/components/button"

import { resolvePeriod } from "@/lib/planner/rules"
import { freezeDue } from "@/lib/report/freeze"
import { listReporters, loadRecap } from "@/lib/report/queries"
import { parseRecapParams, periodLinks, periodTitle } from "@/lib/report/recap"

import { PeriodBar } from "../_period-bar"
import { RecapView } from "../_recap-view"

export const metadata: Metadata = { title: "Rekap staf · Laporan Harian" }

export default async function RekapStafPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ userId }, sp] = await Promise.all([params, searchParams])
  await requirePermission("laporan.rekap.semua")
  const person = (await listReporters()).find((r) => r.id === userId)
  if (!person) notFound()

  const now = new Date()
  const { rentang, tanggal } = parseRecapParams(sp, now)
  const period = resolvePeriod({ tanggal, rentang })
  const links = periodLinks(
    `/laporan/rekap/${userId}`,
    period,
    tanggal,
    parseRecapParams({}, now).tanggal
  )

  await freezeDue([userId], now)
  const recap = await loadRecap(userId, period, now)

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/laporan/rekap?rentang=${rentang}&tanggal=${tanggal}`}
          aria-label="Kembali ke rekap tim"
          className={`${buttonVariants({ variant: "outline", size: "icon" })} print:hidden`}
        >
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
      </div>
      <PeriodBar links={links} rentang={rentang} title={periodTitle(period)} />
      <RecapView recap={recap} />
    </div>
  )
}
