import Link from "next/link"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  CalendarIcon,
  CircleDotIcon,
  UserIcon,
  UserCheckIcon,
  CalendarCheckIcon,
  CircleCheckIcon,
  FileTextIcon,
  ThermometerIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { ATTENDANCE_STATUSES } from "@workspace/db/schema/stages"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { StatusBadge } from "@workspace/ui/components/domain/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { STATUS_LABEL } from "@/lib/attendance/recap"
import type { AttendanceRecap } from "@/lib/attendance/recap-queries"

// Selaras dengan legenda di /galeri.
const ABSENCE_VARIANT = {
  hadir: "success-light",
  izin: "info-light",
  izin_kegiatan: "info-outline",
  sakit: "warning-light",
  tanpa_keterangan: "destructive-light",
} as const

const STATUS_ICON = {
  hadir: CircleCheckIcon,
  izin: FileTextIcon,
  izin_kegiatan: CalendarCheckIcon,
  sakit: ThermometerIcon,
  tanpa_keterangan: TriangleAlertIcon,
} as const

const day = (iso: string) => format(parseISO(iso), "EEE, d MMM", { locale: localeId })

/** Rekap absensi satu orang untuk satu periode (spesifikasi §7.3); server component. */
export function AttendanceRecapView({ recap }: { recap: AttendanceRecap }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-5">
        {ATTENDANCE_STATUSES.map((s) => (
          <div key={s} className="bg-background p-4">
            <dt className="text-sm text-muted-foreground">{STATUS_LABEL[s]}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{recap.counts[s]}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        Dari {recap.total} hari kerja pada periode ini. Hari tanpa catatan dihitung Hadir.
      </p>
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Hari tidak hadir</h3>
        {recap.absences.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UserCheckIcon />
              </EmptyMedia>
              <EmptyTitle>Tidak ada hari tidak hadir</EmptyTitle>
              <EmptyDescription>Semua hari kerja pada periode ini tercatat hadir.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead icon={CalendarIcon}>Tanggal</TableHead>
                  <TableHead icon={CircleDotIcon}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recap.absences.map((a) => (
                  <TableRow key={a.date}>
                    <TableCell icon={CalendarIcon} data-label="Tanggal" className="whitespace-nowrap">{day(a.date)}</TableCell>
                    <TableCell icon={CircleDotIcon} data-label="Status">
                      <StatusBadge variant={ABSENCE_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}

/** Tabel ringkasan seluruh tim; `query` dipertahankan di tautan nama. */
export function TeamAttendance({
  rows,
  query,
}: {
  rows: { id: string; name: string; recap: AttendanceRecap }[]
  query: string
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead icon={UserIcon}>Nama</TableHead>
            {ATTENDANCE_STATUSES.map((s) => (
              <TableHead key={s} numeric icon={STATUS_ICON[s]} className="whitespace-nowrap">
                {STATUS_LABEL[s]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ id, name, recap }) => (
            <TableRow key={id}>
              <TableCell icon={UserIcon} data-label="Nama" className="font-medium">
                <Link
                  href={`/absensi/rekap/${id}?${query}`}
                  className="underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {name}
                </Link>
              </TableCell>
              {ATTENDANCE_STATUSES.map((s) => (
                <TableCell numeric icon={STATUS_ICON[s]} data-label={STATUS_LABEL[s]} key={s}>
                  {recap.counts[s]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
