import type { ReactNode } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { CheckCircle2Icon, ShieldAlertIcon } from "lucide-react"

import { requireUser } from "@workspace/auth/session"
import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/reui/alert"
import {
  AttendanceChart,
  type AttendanceChartDay,
} from "@workspace/ui/components/domain/attendance-chart"
import { ScoreChart } from "@workspace/ui/components/domain/score-chart"
import { WorkloadChart } from "@workspace/ui/components/domain/workload-chart"

import { STATUS_LABEL } from "@/lib/attendance/recap"
import { loadDashboard } from "@/lib/dashboard/queries"
import { formatPercent } from "@/lib/report/recap"

import { WeekChart } from "./layanan/internet/rekap/_week-chart"

const day = (iso: string, p: string) =>
  format(parseISO(iso), p, { locale: localeId })

const REPORT_LABEL: Record<string, string> = {
  terbuka: "Belum dikirim",
  perlu_diperbarui: "Perlu diperbarui",
  dikirim: "Sudah dikirim",
  terkunci: "Terkunci",
  libur: "Hari libur",
  disembunyikan: "Tidak perlu (tidak hadir)",
  bukan_hari_laporan: "Bukan hari laporan",
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  )
}

function StatCard({
  title,
  description,
  href,
  action,
  children,
}: {
  title: string
  description?: string
  href?: string
  action?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
      {href ? (
        <CardFooter>
          <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {action ?? "Buka"}
          </Link>
        </CardFooter>
      ) : null}
    </Card>
  )
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ akses?: string }>
}) {
  const user = await requireUser()
  const { akses } = await searchParams
  const d = await loadDashboard(user)

  const todo: { text: string; href: string }[] = []
  if (d.report && (d.report.state === "terbuka" || d.report.state === "perlu_diperbarui"))
    todo.push({ text: "Laporan hari ini belum dikirim", href: "/laporan" })
  for (const t of d.managerTasks.filter((t) => t.overdueDays > 0))
    todo.push({
      text: `Tugas "${t.title}" lewat tenggat ${t.overdueDays} hari kerja`,
      href: "/laporan",
    })

  const attendanceDays: AttendanceChartDay[] | null =
    d.teamAttendance?.map((x) => ({ ...x, label: day(x.date, "EEE d") })) ?? null
  const hasMine = d.attendance || d.report || d.scoreChart || d.managerTasks.length > 0
  const hasMedia = d.plannerWeek !== null
  const hasTeam =
    d.teamToday ||
    d.reportMissing ||
    d.pendingRequests !== null ||
    d.workload ||
    d.complaintWeeks

  return (
    <div className="flex min-w-0 flex-col gap-8 p-4 sm:p-6">
      {akses === "ditolak" ? (
        <Alert variant="warning" className="max-w-xl">
          <ShieldAlertIcon />
          <AlertTitle>Halaman itu tidak tersedia untuk akun Anda</AlertTitle>
          <AlertDescription>
            Menu yang bisa Anda buka ada di sidebar. Bila perlu akses lain,
            minta Manajer menambah peran Anda.
          </AlertDescription>
        </Alert>
      ) : null}

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Halo, {user.name}</h1>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {day(d.today, "EEEE, d MMMM yyyy")}
          {d.isHoliday ? <Badge variant="secondary">Hari libur</Badge> : null}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Perlu tindakan</h2>
        {todo.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <CheckCircle2Icon />
              <EmptyTitle>Semua beres</EmptyTitle>
              <EmptyDescription>Tidak ada yang menunggu Anda hari ini.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {todo.map((t) => (
              <li key={t.text}>
                <Alert variant="warning">
                  <AlertDescription>
                    <Link href={t.href} className="underline underline-offset-4">
                      {t.text}
                    </Link>
                  </AlertDescription>
                </Alert>
              </li>
            ))}
          </ul>
        )}
      </section>

      {hasMine ? (
        <Section title="Kerja saya">
          {d.attendance ? (
            <StatCard title="Absensi hari ini" href="/absensi" action="Isi absensi">
              <Badge variant={d.attendance === "hadir" ? "secondary" : "outline"} className="w-fit">
                {STATUS_LABEL[d.attendance]}
              </Badge>
            </StatCard>
          ) : null}
          {d.report ? (
            <StatCard
              title="Laporan harian"
              description={REPORT_LABEL[d.report.state]}
              href="/laporan"
              action="Isi laporan"
            >
              <p className="text-sm tabular-nums">
                Skor hari ini: {d.report.score.done} dari {d.report.score.total} tuntas
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                Skor pekan ini:{" "}
                {d.report.average === null ? "belum ada" : formatPercent(d.report.average)}
              </p>
            </StatCard>
          ) : null}
          {d.report ? (
            <StatCard title="Tugas dari Manajer" description="Aktif dan belum tuntas" href="/laporan">
              {d.managerTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada tugas aktif.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {d.managerTasks.slice(0, 5).map((t) => (
                    <li key={t.key} className="flex items-center justify-between gap-2">
                      <span className="truncate">{t.title}</span>
                      {t.overdueDays > 0 ? (
                        <Badge variant="destructive">Lewat {t.overdueDays} hr</Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </StatCard>
          ) : null}
          {d.scoreChart ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardHeader>
                <CardTitle>Skor laporan saya</CardTitle>
                <CardDescription>Rata-rata per pekan, 8 pekan terakhir</CardDescription>
              </CardHeader>
              <CardContent>
                <ScoreChart
                  weeks={d.scoreChart.map((w) => ({
                    label: day(w.start, "d MMM"),
                    score: w.average,
                  }))}
                />
              </CardContent>
            </Card>
          ) : null}
        </Section>
      ) : null}

      {hasMedia ? (
        <Section title="Konten & media">
          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle>Jadwal Media Planner pekan ini</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {d.plannerWeek!.map((p) => (
                  <li key={p.date} className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
                    <span className="font-medium">{day(p.date, "EEEE, d MMM")}</span>
                    {p.entries.length === 0 ? (
                      <span className="text-muted-foreground">Tidak ada jadwal</span>
                    ) : (
                      <>
                        {p.entries.slice(0, 2).map((e) => (
                          <Link key={e.id} href={`/planner/${e.id}`} className="truncate underline-offset-4 hover:underline">
                            {e.name}
                          </Link>
                        ))}
                        {p.entries.length > 2 ? (
                          <span className="text-muted-foreground">+{p.entries.length - 2} lainnya</span>
                        ) : null}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/planner" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Buka planner
              </Link>
            </CardFooter>
          </Card>
        </Section>
      ) : null}

      {hasTeam ? (
        <Section title="Pantau tim">
          {d.teamToday ? (
            <StatCard title="Kehadiran tim hari ini" href="/absensi/rekap" action="Rekap absensi">
              <ul className="flex flex-col gap-1 text-sm tabular-nums">
                {(["hadir", "izin", "izin_kegiatan", "sakit", "tanpa_keterangan"] as const).map((s) => (
                  <li key={s} className="flex justify-between">
                    <span>{STATUS_LABEL[s]}</span>
                    <span>{d.teamToday![s]}</span>
                  </li>
                ))}
              </ul>
            </StatCard>
          ) : null}
          {d.reportMissing ? (
            <StatCard title="Belum mengisi laporan hari ini" href="/laporan/tim" action="Laporan tim">
              {d.reportMissing.length === 0 ? (
                <p className="text-sm text-muted-foreground">Semua sudah mengisi.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {d.reportMissing.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </StatCard>
          ) : null}
          {d.pendingRequests !== null ? (
            <StatCard title="Pengajuan SDM menunggu" href="/layanan/sdm/persetujuan" action="Tinjau">
              <p className="text-3xl font-semibold tabular-nums">{d.pendingRequests}</p>
            </StatCard>
          ) : null}
          {attendanceDays ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardHeader>
                <CardTitle>Kehadiran tim per hari</CardTitle>
                <CardDescription>Dua pekan terakhir, hari kerja</CardDescription>
              </CardHeader>
              <CardContent>
                <AttendanceChart days={attendanceDays} />
              </CardContent>
            </Card>
          ) : null}
          {d.workload ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardHeader>
                <CardTitle>Beban kerja per orang</CardTitle>
                <CardDescription>Jumlah penugasan planner pekan ini</CardDescription>
              </CardHeader>
              <CardContent>
                {d.workload.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada penugasan pekan ini.</p>
                ) : (
                  <WorkloadChart people={d.workload} />
                )}
              </CardContent>
            </Card>
          ) : null}
          {d.complaintWeeks ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardHeader>
                <CardTitle>Pengaduan internet per pekan</CardTitle>
                <CardDescription>Bulan ini</CardDescription>
              </CardHeader>
              <CardContent>
                <WeekChart weeks={d.complaintWeeks} />
              </CardContent>
              <CardFooter>
                <Link href="/layanan/internet/rekap" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Rekap pengaduan
                </Link>
              </CardFooter>
            </Card>
          ) : null}
        </Section>
      ) : null}

      <p className="text-sm">
        <Link href="/galeri" className="text-muted-foreground underline underline-offset-4">
          Galeri komponen
        </Link>
      </p>
    </div>
  )
}
