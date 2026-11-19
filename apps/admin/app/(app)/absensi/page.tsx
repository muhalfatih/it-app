import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { addDays, format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"

import { requirePermission } from "@workspace/auth/session"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { buttonVariants } from "@workspace/ui/components/button"
import { ButtonGroup } from "@workspace/ui/components/button-group"

import { attendanceFor, holidaySet } from "@/lib/attendance/queries"
import { todayWib, validDate } from "@/lib/planner/rules"
import { listReporters } from "@/lib/report/queries"
import { isWorkday } from "@/lib/report/rules"

import { AttendanceTable } from "./_attendance-table"

export const metadata: Metadata = { title: "Absensi" }

const iso = (d: Date) => format(d, "yyyy-MM-dd")

export default async function AbsensiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  await requirePermission("absensi.isi")
  const today = todayWib()
  const raw = validDate(sp.tanggal) ?? today
  const date = raw > today ? today : raw
  const [reporters, statuses, holidays] = await Promise.all([
    listReporters(),
    attendanceFor(date),
    holidaySet(date, date),
  ])
  const workday = isWorkday(date, holidays)
  const prev = iso(addDays(parseISO(date), -1))
  const next = iso(addDays(parseISO(date), 1))

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Absensi</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Tanpa pilihan berarti Hadir. Status selain Hadir menyembunyikan
          laporan harian orang itu.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ButtonGroup>
          <Link
            href={`?tanggal=${prev}`}
            aria-label="Hari sebelumnya"
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <ChevronLeftIcon />
          </Link>
          {date < today ? (
            <Link
              href={`?tanggal=${next}`}
              aria-label="Hari berikutnya"
              className={buttonVariants({ variant: "outline", size: "icon" })}
            >
              <ChevronRightIcon />
            </Link>
          ) : null}
        </ButtonGroup>
        <Link href="/absensi" className={buttonVariants({ variant: "outline" })}>
          Hari ini
        </Link>
        <h2 className="ml-1 text-base font-medium">
          {format(parseISO(date), "EEEE, d MMM yyyy", { locale: localeId })}
        </h2>
      </div>
      {workday ? null : (
        <Alert>
          <AlertTitle>Bukan hari kerja</AlertTitle>
          <AlertDescription>
            Tanggal ini Minggu atau hari libur, jadi absensi tidak diisi.
          </AlertDescription>
        </Alert>
      )}
      <AttendanceTable
        key={date}
        date={date}
        disabled={!workday}
        rows={reporters.map((r) => ({
          id: r.id,
          name: r.name,
          status: statuses.get(r.id) ?? null,
        }))}
      />
    </div>
  )
}
