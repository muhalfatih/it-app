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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { MediaPlayer } from "@workspace/ui/components/domain/media-player"
import { PartitionGrid } from "@workspace/ui/components/domain/partition-grid"
import { ThemeToggle } from "@workspace/ui/components/domain/theme-toggle"
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
import { cn } from "@workspace/ui/lib/utils"

import { ChartDemo } from "./_demo-chart"
import { FormsDemo } from "./_demo-forms"
import { KanbanDemo } from "./_demo-kanban"
import { OverlaysDemo } from "./_demo-overlays"
import { PlannerDemo } from "./_demo-planner"
import { SidebarDemo } from "./_demo-sidebar"
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

export default function GaleriPage() {
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
        <ThemeToggle />
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
        <div className="flex flex-wrap gap-2">
          <Badge variant="success-light">Tuntas</Badge>
          <Badge variant="info-light">Tindak Lanjut</Badge>
          <Badge variant="warning-light">Tertunda 3 hari</Badge>
          <Badge variant="destructive-light">Ditolak</Badge>
          <Badge variant="outline">Diajukan</Badge>
          <Badge variant="success-light">Disetujui</Badge>
          <Badge variant="warning-light">Perlu diperbarui</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {["Ide", "Draft", "Review", "Disetujui", "Telah Tayang"].map(
            (stage) => (
              <Badge key={stage} variant="primary-light">
                {stage}
              </Badge>
            )
          )}
        </div>
      </Section>

      <Section title="Alert">
        <div className="grid gap-3 md:grid-cols-2">
          <Alert variant="warning">
            <RefreshCwIcon />
            <AlertTitle>Perlu diperbarui</AlertTitle>
            <AlertDescription>
              Penugasan &quot;Editing Video Profil Sekolah&quot; berubah.
              Jawaban lama tetap terisi — cukup isi tugas yang baru.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <LockIcon />
            <AlertTitle>Laporan terkunci</AlertTitle>
            <AlertDescription>
              Batas pengisian Sabtu 10.00 WIB sudah lewat. Hubungi Manajer untuk
              membuka kunci.
            </AlertDescription>
          </Alert>
          <Alert variant="success">
            <CalendarCheckIcon />
            <AlertTitle>Pengaduan terkirim</AlertTitle>
            <AlertDescription>
              Terima kasih, pengaduan Anda sudah kami terima dan akan menjadi
              bahan evaluasi layanan internet sekolah.
            </AlertDescription>
          </Alert>
          <Alert variant="info">
            <InboxIcon />
            <AlertTitle>Pengajuan SDM baru</AlertTitle>
            <AlertDescription>
              Unit SD mengajukan 2 SDM untuk Pentas Seni, 22–23 November.
            </AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="Skor laporan">
        <Progress value={54.5} className="max-w-md">
          <ProgressLabel>Skor hari ini (6/11)</ProgressLabel>
          <ProgressValue />
        </Progress>
      </Section>

      <Section title="Tabel">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Rutin</TableHead>
              <TableHead>Planner</TableHead>
              <TableHead>dari Manajer</TableHead>
              <TableHead>Input sendiri</TableHead>
              <TableHead className="text-right">Rata-rata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["Budi Santoso", "20/24", "9/10", "2/2", "3/3", "87,2%"],
              ["Siti Rahmawati", "22/24", "6/8", "1/2", "1/1", "85,7%"],
              ["Ahmad Fauzan", "18/24", "4/9", "0/1", "5/5", "69,2%"],
            ].map(([name, ...cells]) => (
              <TableRow key={name}>
                <TableCell className="font-medium">{name}</TableCell>
                {cells.map((cell, i) => (
                  <TableCell
                    key={i}
                    className={
                      i === cells.length - 1
                        ? "text-right tabular-nums"
                        : "tabular-nums"
                    }
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Partisi per orang">
        <PartitionGrid days={DAYS} rows={PARTITION_ROWS} />
      </Section>

      <Section title="Planner: kalender pekanan, daftar, penugasan">
        <PlannerDemo />
      </Section>

      <Section title="Kanban konten">
        <KanbanDemo />
      </Section>

      <Section title="Pemutar media">
        <div className="max-w-md">
          <MediaPlayer
            src="/galeri/contoh.svg"
            kind="image"
            alt="Contoh thumbnail konten"
          />
        </div>
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

      <Section title="Rekap (chart)">
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
        <SidebarDemo />
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
