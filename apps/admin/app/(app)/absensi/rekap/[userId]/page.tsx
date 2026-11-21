import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { requirePermission } from "@workspace/auth/session"
import { buttonVariants } from "@workspace/ui/components/button"

import { loadAttendanceRecap } from "@/lib/attendance/recap-queries"
import { resolvePeriod } from "@/lib/planner/rules"
import { listReporters } from "@/lib/report/queries"
import { parseRecapParams, periodLinks, periodTitle } from "@/lib/report/recap"

import { PeriodBar } from "../../../laporan/rekap/_period-bar"
import { AttendanceRecapView } from "../_attendance-recap-view"

export const metadata: Metadata = { title: "Rekap absensi staf" }

export default async function RekapAbsensiStafPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ userId }, sp] = await Promise.all([params, searchParams])
  await requirePermission("absensi.rekap.semua")
  const person = (await listReporters()).find((r) => r.id === userId)
  if (!person) notFound()

  const now = new Date()
  const { rentang, tanggal } = parseRecapParams(sp, now)
  const period = resolvePeriod({ tanggal, rentang })
  const links = periodLinks(
    `/absensi/rekap/${userId}`,
    period,
    tanggal,
    parseRecapParams({}, now).tanggal
  )
  const recap = await loadAttendanceRecap(userId, period, now)

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/absensi/rekap?rentang=${rentang}&tanggal=${tanggal}`}
          aria-label="Kembali ke rekap absensi tim"
          className={`${buttonVariants({ variant: "outline", size: "icon" })} print:hidden`}
        >
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
      </div>
      <PeriodBar links={links} rentang={rentang} title={periodTitle(period)} />
      <AttendanceRecapView recap={recap} />
    </div>
  )
}
