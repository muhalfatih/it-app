import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"

import { requirePermission } from "@workspace/auth/session"
import { buttonVariants } from "@workspace/ui/components/button"
import { PartitionGrid } from "@workspace/ui/components/domain/partition-grid"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

import {
  applyMyWork,
  buildPlannerHref,
  parsePlannerParams,
  resolvePeriod,
  shiftPeriod,
  todayWib,
} from "@/lib/planner/rules"
import { listEntriesInPeriod, listStaff } from "@/lib/planner/queries"
import type { Period } from "@/lib/planner/types"
import {
  toCalendarEvents,
  toListRows,
  toPartitionRows,
  weekDays,
} from "@/lib/planner/views"

import { CalendarView } from "./_calendar-view"
import { ListView } from "./_list-view"
import { PlannerToolbar } from "./_toolbar"

export const metadata: Metadata = { title: "Media Planner" }

function periodTitle(period: Period): string {
  const f = (iso: string, p: string) =>
    format(parseISO(iso), p, { locale: localeId })
  if (period.kind === "bulan") return f(period.start, "MMMM yyyy")
  if (f(period.start, "MMM yyyy") === f(period.end, "MMM yyyy"))
    return `${f(period.start, "d")}–${f(period.end, "d MMM yyyy")}`
  return `${f(period.start, "d MMM")} – ${f(period.end, "d MMM yyyy")}`
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const user = await requirePermission("planner.lihat")
  const params = parsePlannerParams(sp, user.roles)
  const period = resolvePeriod(params)
  const canEdit = user.permissions.has("planner.ubah")

  const all = await listEntriesInPeriod(period)
  const entries = params.saya ? applyMyWork(all, user.id, period) : all
  const myWorkUserId = params.saya ? user.id : undefined

  const href = (patch: Parameters<typeof buildPlannerHref>[1]) =>
    buildPlannerHref(params, patch)
  const tabs = (["daftar", "kalender", "partisi"] as const).map((value) => ({
    value,
    label: { daftar: "Daftar", kalender: "Kalender", partisi: "Partisi" }[value],
    href: href({ tampilan: value }),
  }))

  let body: React.ReactNode
  if (params.tampilan === "partisi") {
    const staff = await listStaff()
    const rows = toPartitionRows(staff, entries, period, { myWorkUserId })
    body = (
      <div className="overflow-x-auto">
        <PartitionGrid days={weekDays(period, rows)} rows={rows} />
      </div>
    )
  } else if (entries.length === 0) {
    body = (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Belum ada entri di periode ini</EmptyTitle>
          <EmptyDescription>
            {params.saya
              ? "Tidak ada penugasan untuk Anda. Matikan “Pekerjaan saya saja” untuk melihat semua entri."
              : "Buat entri baru untuk mulai mengisi Planner."}
          </EmptyDescription>
        </EmptyHeader>
        {canEdit && (
          <EmptyContent>
            <Link
              href="/planner/baru"
              data-slot="button"
              className={buttonVariants()}
            >
              <PlusIcon data-icon="inline-start" />
              Entri baru
            </Link>
          </EmptyContent>
        )}
      </Empty>
    )
  } else if (params.tampilan === "kalender") {
    body = (
      <CalendarView
        events={toCalendarEvents(entries, { myWorkUserId })}
        start={period.start}
      />
    )
  } else {
    body = <ListView rows={toListRows(entries)} />
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Media Planner</h1>
      <PlannerToolbar
        title={periodTitle(period)}
        tabs={tabs}
        active={params.tampilan}
        prevHref={href({ tanggal: shiftPeriod(period, -1) })}
        nextHref={href({ tanggal: shiftPeriod(period, 1) })}
        todayHref={href({ tanggal: todayWib() })}
        rentang={
          params.tampilan === "daftar"
            ? {
                active: params.rentang,
                pekanHref: href({ rentang: "pekan" }),
                bulanHref: href({ rentang: "bulan" }),
              }
            : null
        }
        saya={params.saya}
        sayaHref={href({ saya: !params.saya })}
        newHref={canEdit ? "/planner/baru" : null}
      />
      {body}
    </div>
  )
}
