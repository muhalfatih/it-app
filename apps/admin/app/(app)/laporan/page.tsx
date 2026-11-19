import type { Metadata } from "next"
import { LockIcon } from "lucide-react"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"

import { requirePermission } from "@workspace/auth/session"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Badge } from "@workspace/ui/components/reui/badge"

import { todayWib, validDate } from "@/lib/planner/rules"
import { freezeDue } from "@/lib/report/freeze"
import { loadDay, loadNav, loadUser } from "@/lib/report/queries"
import { firstReportDay, type ReportState } from "@/lib/report/rules"

import { DayNav } from "./_day-nav"
import { ReportForm } from "./_report-form"

export const metadata: Metadata = { title: "Laporan Harian" }

const BADGE: Partial<
  Record<
    ReportState,
    { label: string; variant: "outline" | "success-light" | "warning-light" | "secondary" }
  >
> = {
  terbuka: { label: "Belum dikirim", variant: "outline" },
  dikirim: { label: "Dikirim", variant: "success-light" },
  perlu_diperbarui: { label: "Perlu diperbarui", variant: "warning-light" },
  terkunci: { label: "Terkunci", variant: "secondary" },
}

const EMPTY: Partial<Record<ReportState, { title: string; text: string }>> = {
  libur: {
    title: "Hari libur",
    text: "Tidak ada laporan di hari libur atau hari Minggu.",
  },
  bukan_hari_laporan: {
    title: "Bukan hari laporan",
    text: "Laporan dimulai dari tanggal go-live atau tanggal akunmu dibuat, mana yang lebih akhir.",
  },
  disembunyikan: {
    title: "Laporan disembunyikan",
    text: "Absensimu hari ini bukan Hadir, jadi laporan tidak perlu diisi. Jawaban yang sudah ada tetap tersimpan.",
  },
}

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const user = await requirePermission("laporan.isi")
  const now = new Date()
  const today = todayWib(now)
  const raw = validDate(sp.tanggal) ?? today
  const date = raw > today ? today : raw

  await freezeDue([user.id], now)
  const [day, me] = await Promise.all([
    loadDay(user.id, date, now),
    loadUser(user.id),
  ])
  const nav = await loadNav(date, firstReportDay(me.createdAt), now)

  const badge = BADGE[day.state]
  const empty = EMPTY[day.state]
  // 03.00 UTC = 10.00 WIB pada tanggal yang sama.
  const deadline = format(parseISO(day.deadline.toISOString().slice(0, 10)), "EEEE, d MMM", {
    locale: localeId,
  })

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Laporan Harian</h1>
      <div className="flex flex-wrap items-center gap-3">
        <DayNav
          base="/laporan"
          prev={nav.prev}
          next={nav.next}
          today={nav.today}
          title={format(parseISO(date), "EEEE, d MMM yyyy", { locale: localeId })}
        />
        {badge && (
          <Badge variant={badge.variant} className="sm:ml-auto">
            {badge.label}
          </Badge>
        )}
      </div>

      {empty ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{empty.title}</EmptyTitle>
            <EmptyDescription>{empty.text}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {day.state === "terkunci" ? (
            <Alert>
              <LockIcon />
              <AlertTitle>Laporan terkunci</AlertTitle>
              <AlertDescription>
                Terkunci, hubungi Manajer untuk membuka.
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-sm text-muted-foreground">
              Batas pengisian: {deadline} pukul 10.00
            </p>
          )}
          {day.unlocked && (
            <Alert>
              <AlertTitle>Dibuka kembali oleh Manajer</AlertTitle>
              <AlertDescription>
                Isi lalu kirim ulang agar laporan terkunci lagi.
              </AlertDescription>
            </Alert>
          )}
          {/* key: remount saat data server berubah supaya state lokal ikut segar. */}
          <ReportForm
            key={`${date}:${day.state}:${day.tasks.map((t) => t.key + t.title).join("|")}`}
            date={date}
            tasks={day.tasks}
            obstacles={day.obstacles}
            priorities={day.priorities}
            state={day.state}
            editable={day.editable}
          />
        </>
      )}
    </div>
  )
}
