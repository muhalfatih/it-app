import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"

import { requirePermission } from "@workspace/auth/session"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Badge } from "@workspace/ui/components/reui/badge"

import { todayWib, validDate } from "@/lib/planner/rules"
import { freezeDue } from "@/lib/report/freeze"
import { listReporters, loadDay, loadNav } from "@/lib/report/queries"
import { firstReportDay } from "@/lib/report/rules"

import { DayNav } from "../../_day-nav"
import { ReportForm } from "../../_report-form"
import { STATE_BADGE } from "../../_state"

export const metadata: Metadata = { title: "Laporan staf · Laporan Harian" }

const SHOWN = new Set(["terbuka", "dikirim", "perlu_diperbarui", "terkunci"])

export default async function LaporanStafPage({
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
  const today = todayWib(now)
  const raw = validDate(sp.tanggal) ?? today
  const date = raw > today ? today : raw

  await freezeDue([userId], now)
  const [day, nav] = await Promise.all([
    loadDay(userId, date, now),
    loadNav(date, firstReportDay(person.createdAt), now),
  ])
  const badge = STATE_BADGE[day.state]

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/laporan/tim?tanggal=${date}`}
          aria-label="Kembali ke rekap tim"
          className={buttonVariants({ variant: "outline", size: "icon" })}
        >
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <DayNav
          base={`/laporan/tim/${userId}`}
          prev={nav.prev}
          next={nav.next}
          today={nav.today}
          title={format(parseISO(date), "EEEE, d MMM yyyy", { locale: localeId })}
        />
        <Badge variant={badge.variant} className="sm:ml-auto">
          {badge.label}
        </Badge>
      </div>
      {SHOWN.has(day.state) ? (
        <ReportForm
          key={`${userId}:${date}:${day.state}`}
          date={date}
          tasks={day.tasks}
          obstacles={day.obstacles}
          priorities={day.priorities}
          state={day.state}
          editable={false}
          readOnly
        />
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Tidak ada laporan</EmptyTitle>
            <EmptyDescription>
              Tanggal ini hari libur, di luar masa laporan, atau staf tidak
              hadir.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
