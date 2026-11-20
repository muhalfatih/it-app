import type { Metadata } from "next"
import {
  CalendarCheckIcon,
  InboxIcon,
  LockIcon,
  RefreshCwIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@workspace/ui/components/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@workspace/ui/components/progress"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import { PartitionGrid } from "@workspace/ui/components/domain/partition-grid"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/reui/alert"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@workspace/ui/components/reui/timeline"
import { Pattern as TabsSetting } from "@workspace/ui/components/examples/c-tabs-4"
import { Pattern as TabsStatus } from "@workspace/ui/components/examples/c-tabs-7"
import { Pattern as TabsView } from "@workspace/ui/components/examples/c-tabs-9"
import { requireUser } from "@workspace/auth/session"
import { cn } from "@workspace/ui/lib/utils"

import { AlertsDemo } from "./_demo-alerts"
import { BadgesDemo } from "./_demo-badges"
import { ChartDemo } from "./_demo-chart"
import { FormsDemo } from "./_demo-forms"
import { KanbanDemo } from "./_demo-kanban"
import { MediaDemo } from "./_demo-media"
import { UploadDemo } from "./_demo-upload"
import { MiscDemo } from "./_demo-misc"
import { OverlaysDemo } from "./_demo-overlays"
import { NeedsDemo, PlannerDemo } from "./_demo-planner"
import { ReuiDemo } from "./_demo-reui"
import { RecapGrid } from "./_demo-tables"
import { DateDemo } from "./_demo-date"
import { DAYS, PARTITION_ROWS } from "./_data"

export const metadata: Metadata = { title: "Galeri Komponen · Unit IT & Media" }

const SWATCHES = [
  ["bg-background", "background"],
  ["bg-card", "card"],
  ["bg-primary", "primary"],
  ["bg-secondary", "secondary"],
  ["bg-muted", "muted"],
  ["bg-accent", "accent"],
  ["bg-border", "border"],
  ["bg-ring", "ring"],
  ["bg-chart-1", "chart-1"],
  ["bg-chart-2", "chart-2"],
  ["bg-chart-3", "chart-3"],
  ["bg-chart-4", "chart-4"],
  ["bg-chart-5", "chart-5"],
  ["bg-success", "success"],
  ["bg-warning", "warning"],
  ["bg-info", "info"],
  ["bg-destructive", "destructive"],
  ["bg-invert", "invert"],
] as const

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

export default async function GaleriPage() {
  await requireUser()
  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-8 px-4 py-6 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Galeri Komponen
          </h1>
          <p className="text-sm text-muted-foreground">
            Design system Unit IT &amp; Media — tinjau di mode terang dan gelap.
          </p>
        </div>
      </header>

      <Section title="Warna">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SWATCHES.map(([className, name]) => (
            <div key={name} className="flex flex-col gap-1">
              <div
                className={cn(
                  className,
                  "h-12 rounded-lg ring-1 ring-foreground/10"
                )}
              />
              <span className="font-mono text-xs text-muted-foreground">
                {name}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografi">
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-semibold tracking-tight">
            Laporan Harian — Senin, 16 November
          </p>
          <p className="text-sm">
            Teks isi: tugas rutin, Planner, dari Manajer, dan input sendiri.
          </p>
          <p className="text-sm text-muted-foreground">
            Teks pendamping: terkunci besok pukul 10.00 WIB.
          </p>
          <p className="font-mono text-sm tabular-nums">Skor 6/11 · 54,5%</p>
        </div>
      </Section>

      <Section title="Tombol">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Kirim laporan</Button>
          <Button variant="secondary">Simpan draf</Button>
          <Button variant="outline">Unduh PDF</Button>
          <Button variant="ghost">Batal</Button>
          <Button variant="destructive">Hapus entri</Button>
          <Button variant="link">Lihat riwayat</Button>
          <Button size="sm">Kecil</Button>
          <Button size="lg">Besar</Button>
          <Button size="icon" aria-label="Muat ulang">
            <RefreshCwIcon />
          </Button>
          <Button disabled>
            <Spinner data-icon="inline-start" />
            Mengirim…
          </Button>
        </div>
      </Section>

      <Section title="Form">
        <FormsDemo />
      </Section>

      <Section title="Badge status">
        <BadgesDemo />
      </Section>

      <Section title="Alert">
        <AlertsDemo />
      </Section>

      <Section title="Input, pilihan & daftar pengaturan">
        <MiscDemo />
      </Section>

      <Section title="Komponen reui: cascader, filter, berkas">
        <ReuiDemo />
      </Section>

      <Section title="Skor laporan">
        <Progress value={54.5} className="max-w-md">
          <ProgressLabel>Skor hari ini (6/11)</ProgressLabel>
          <ProgressValue />
        </Progress>
      </Section>

      <Section title="Tabel rekap laporan harian">
        <RecapGrid />
      </Section>

      <Section title="Pemilih tanggal (Date Picker)">
        <DateDemo />
      </Section>

      <Section title="Tabs">
        <div className="grid min-w-0 gap-6 md:grid-cols-2">
          <TabsStatus />
          <TabsView />
          <div className="md:col-span-2">
            <TabsSetting />
          </div>
        </div>
      </Section>

      <Section title="Partisi per orang">
        <PartitionGrid days={DAYS} rows={PARTITION_ROWS} />
      </Section>

      <Section title="Planner: kalender pekanan, daftar, penugasan">
        <PlannerDemo />
      </Section>

      <Section title="Kebutuhan SDM (penugasan mode jenis)">
        <NeedsDemo />
      </Section>

      <Section title="Kanban konten">
        <KanbanDemo />
      </Section>

      <Section title="Media konten">
        <MediaDemo />
      </Section>

      <Section title="Unggah media konten">
        <UploadDemo />
      </Section>

      <Section title="Riwayat kartu">
        <Timeline defaultValue={3} className="max-w-md">
          {[
            ["10 Nov 09.12", "Dibuat dari Planner", "Kartu masuk tahap Ide."],
            [
              "11 Nov 13.40",
              "Dipindah ke Draft oleh SDM Strategi",
              "Caption dan foto diunggah.",
            ],
            [
              "12 Nov 14.20",
              "Disetujui oleh Direktur",
              "Siap tayang di YouTube dan Instagram.",
            ],
          ].map(([date, title, content], i) => (
            <TimelineItem key={title} step={i + 1}>
              <TimelineHeader>
                <TimelineSeparator />
                <TimelineDate>{date}</TimelineDate>
                <TimelineTitle>{title}</TimelineTitle>
                <TimelineIndicator />
              </TimelineHeader>
              <TimelineContent>{content}</TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </Section>

      <Section title="Chart">
        <ChartDemo />
      </Section>

      <Section title="Overlay & notifikasi">
        <OverlaysDemo />
      </Section>

      <Section title="Navigasi">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Beranda</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Media Planner</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Video Profil Sekolah 2026</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Section>

      <Section title="Keadaan kosong & memuat">
        <div className="grid gap-4 md:grid-cols-2">
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <InboxIcon />
              </EmptyMedia>
              <EmptyTitle>Belum ada peminjaman</EmptyTitle>
              <EmptyDescription>
                Catat peminjaman alat pertama untuk melihat daftarnya di sini.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button>Catat peminjaman</Button>
            </EmptyContent>
          </Empty>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <AvatarGroup>
                {["BS", "SR", "AF"].map((initials) => (
                  <Avatar key={initials}>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
              <Spinner />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </Section>
    </div>
  )
}
