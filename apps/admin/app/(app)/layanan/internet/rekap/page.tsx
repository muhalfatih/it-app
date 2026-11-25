import type { Metadata } from "next"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  Building2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  HashIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  UserIcon,
  UsersIcon,
  WifiOffIcon,
  type LucideIcon,
} from "lucide-react"

import { requirePermission } from "@workspace/auth/session"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { complaintMonth } from "@/lib/layanan/complaints"
import { ISSUE_LABELS, nowWib, OTHERS_LABELS } from "@/lib/layanan/rules"
import type { Issue, OthersAffected } from "@/lib/layanan/types"

import { WeekChart } from "./_week-chart"

export const metadata: Metadata = { title: "Rekap Pengaduan Internet" }

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number)
  return new Date(Date.UTC(y!, m! - 1 + by, 1)).toISOString().slice(0, 7)
}

const timeWib = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

export default async function RekapPengaduanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("pengaduan.lihat")
  const { bulan } = await searchParams
  const current = nowWib().month
  const month =
    typeof bulan === "string" && MONTH_RE.test(bulan) ? bulan : current
  const { summary, rows } = await complaintMonth(month)

  const title = format(parseISO(`${month}-01`), "MMMM yyyy", {
    locale: localeId,
  })
  const prev = shiftMonth(month, -1)
  const next = shiftMonth(month, 1)
  const arrow = buttonVariants({ variant: "outline", size: "icon" })
  const href = (m: string) => `/layanan/internet/rekap?bulan=${m}`

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Rekap Pengaduan Internet
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Pengaduan per bulan menurut waktu mulai terjadi (WIB), dikelompokkan
          per pekan Senin–Minggu, per gedung, dan per jenis kendala.
        </p>
      </div>

      <nav aria-label="Pilih bulan" className="flex flex-wrap items-center gap-2">
        <Link
          href={href(prev)}
          aria-label="Bulan sebelumnya"
          className={arrow}
        >
          <ChevronLeftIcon />
        </Link>
        <Link
          href={href(next)}
          aria-label="Bulan berikutnya"
          className={arrow}
        >
          <ChevronRightIcon />
        </Link>
        {month !== current && (
          <Link
            href={href(current)}
            className={buttonVariants({ variant: "outline" })}
          >
            Bulan ini
          </Link>
        )}
        <h2 className="ml-1 text-base font-medium capitalize">
          {title}
        </h2>
      </nav>

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Belum ada pengaduan</EmptyTitle>
            <EmptyDescription>
              Tidak ada pengaduan internet yang mulai terjadi di {title}.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Per pekan</CardTitle>
              <CardDescription>
                <span className="tabular-nums">{rows.length}</span> pengaduan
                di {title}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WeekChart weeks={summary.weeks} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <CountTable
              title="Per gedung"
              head="Gedung"
              icon={Building2Icon}
              rows={summary.buildings.map((b) => ({
                key: b.name,
                label: b.name,
                count: b.count,
              }))}
            />
            <CountTable
              title="Per jenis kendala"
              head="Jenis kendala"
              icon={WifiOffIcon}
              rows={summary.issues.map((i) => ({
                key: i.issue,
                label: `${i.issue}. ${i.label}`,
                count: i.count,
              }))}
            />
          </div>

          <section aria-labelledby="daftar" className="flex flex-col gap-3">
            <h2 id="daftar" className="text-base font-medium">
              Daftar pengaduan
            </h2>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead icon={ClockIcon}>Mulai (WIB)</TableHead>
                    <TableHead icon={MapPinIcon}>Lokasi</TableHead>
                    <TableHead icon={WifiOffIcon}>Jenis kendala</TableHead>
                    <TableHead icon={UsersIcon}>Pengguna lain</TableHead>
                    <TableHead icon={MessageSquareTextIcon}>Deskripsi</TableHead>
                    <TableHead icon={UserIcon}>Pelapor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell icon={ClockIcon} data-label="Mulai (WIB)" className="align-top tabular-nums">
                        {timeWib.format(r.startedAt)}
                      </TableCell>
                      <TableCell icon={MapPinIcon} data-label="Lokasi" className="max-w-48 align-top whitespace-normal">
                        <div className="font-medium">{r.buildingName}</div>
                        <div className="text-muted-foreground break-words">
                          {r.room}
                        </div>
                      </TableCell>
                      <TableCell icon={WifiOffIcon} data-label="Jenis kendala" className="max-w-72 align-top whitespace-normal">
                        {r.issue}. {ISSUE_LABELS[r.issue as Issue]}
                      </TableCell>
                      <TableCell icon={UsersIcon} data-label="Pengguna lain" className="align-top">
                        {OTHERS_LABELS[r.othersAffected as OthersAffected]}
                      </TableCell>
                      <TableCell icon={MessageSquareTextIcon} data-label="Deskripsi" className="max-w-80 align-top whitespace-normal break-words">
                        {r.description ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell icon={UserIcon} data-label="Pelapor" className="align-top">
                        {r.reporterName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function CountTable({
  title,
  head,
  icon,
  rows,
}: {
  title: string
  head: string
  icon: LucideIcon
  rows: { key: string; label: string; count: number }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead icon={icon}>{head}</TableHead>
              <TableHead icon={HashIcon} numeric>Jumlah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell icon={icon} data-label={head} className="whitespace-normal">{r.label}</TableCell>
                <TableCell icon={HashIcon} numeric data-label="Jumlah">
                  {r.count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
