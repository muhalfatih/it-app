import {
  AlertTriangleIcon,
  CheckIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  ClockIcon,
  EyeIcon,
  LightbulbIcon,
  PencilLineIcon,
  RadioTowerIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/reui/badge"
import { StatusBadge as IconStatusBadge } from "@workspace/ui/components/domain/status-badge"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@workspace/ui/components/reui/frame"

type Variant = React.ComponentProps<typeof Badge>["variant"]
type Item = {
  label: string
  variant: Variant
  icon?: React.ComponentType<{ "aria-hidden"?: boolean }>
  dot?: boolean
  count?: number
}

/** Legenda status per modul: satu sumber makna warna untuk seluruh aplikasi. */
const GROUPS: { module: string; hint: string; items: Item[] }[] = [
  {
    module: "Laporan harian",
    hint: "Status tugas dan laporan.",
    items: [
      { label: "Tuntas", variant: "success-light", icon: CheckIcon },
      { label: "Tindak Lanjut", variant: "info-light", icon: RefreshCwIcon },
      { label: "Tertunda 3 hari", variant: "warning-light", icon: ClockIcon },
      { label: "Perlu diperbarui", variant: "warning-outline", dot: true },
      { label: "Terkunci", variant: "destructive-light", dot: true },
    ],
  },
  {
    module: "Manajemen konten",
    hint: "Tahap kartu Kanban, dengan jumlah kartu.",
    items: [
      { label: "Ide", variant: "outline", icon: LightbulbIcon, count: 2 },
      { label: "Draft", variant: "info-light", icon: PencilLineIcon, count: 1 },
      { label: "Review", variant: "warning-light", icon: EyeIcon, count: 1 },
      {
        label: "Disetujui",
        variant: "success-light",
        icon: CircleCheckIcon,
        count: 1,
      },
      {
        label: "Telah Tayang",
        variant: "primary-light",
        icon: RadioTowerIcon,
        count: 6,
      },
    ],
  },
  {
    module: "Pengajuan SDM",
    hint: "Alur Diajukan → Disetujui / Ditolak.",
    items: [
      { label: "Diajukan", variant: "outline", icon: CircleDashedIcon },
      { label: "Disetujui", variant: "success-light", icon: CheckIcon },
      { label: "Ditolak", variant: "destructive-light", icon: XIcon },
    ],
  },
  {
    module: "Absensi",
    hint: "Diisi Manajer; selain Hadir menyembunyikan laporan dari skor.",
    items: [
      { label: "Hadir", variant: "success-light", dot: true },
      { label: "Izin", variant: "info-light", dot: true },
      { label: "Izin Kegiatan", variant: "info-outline", dot: true },
      { label: "Sakit", variant: "warning-light", dot: true },
      { label: "Tanpa Keterangan", variant: "destructive-light", dot: true },
    ],
  },
  {
    module: "Inventaris",
    hint: "Kondisi alat dan peminjaman.",
    items: [
      { label: "Tersedia", variant: "success-light", count: 4 },
      { label: "Dipinjam", variant: "info-light", count: 2 },
      {
        label: "Lewat jadwal",
        variant: "warning-light",
        icon: AlertTriangleIcon,
      },
      { label: "Rusak/Hilang", variant: "destructive-light", count: 1 },
    ],
  },
]

function StatusBadge({ label, variant, icon: Icon, dot, count }: Item) {
  return (
    <Badge variant={variant}>
      {dot ? (
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
      ) : null}
      {Icon ? <Icon aria-hidden /> : null}
      {label}
      {count !== undefined ? (
        <Badge
          variant="outline"
          size="xs"
          radius="full"
          className="tabular-nums"
        >
          {count}
        </Badge>
      ) : null}
    </Badge>
  )
}

export function BadgesDemo() {
  return (
    <Frame stacked>
      <FrameHeader>
        <FrameTitle>Legenda status</FrameTitle>
        <FrameDescription>
          Warna status hanya untuk makna: hijau selesai, biru berjalan, kuning
          perlu perhatian, merah gagal/terhenti.
        </FrameDescription>
      </FrameHeader>
      {GROUPS.map((group) => (
        <FramePanel
          key={group.module}
          className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{group.module}</span>
            <span className="text-xs text-muted-foreground">{group.hint}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => (
              <StatusBadge key={item.label} {...item} />
            ))}
          </div>
        </FramePanel>
      ))}
      <FramePanel className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Badge status berikon</span>
          <span className="text-xs text-muted-foreground">
            Ikon bawaan per nada, supaya makna tidak hanya dari warna.
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <IconStatusBadge variant="success-light">Tuntas</IconStatusBadge>
          <IconStatusBadge variant="warning-light">Tertunda</IconStatusBadge>
          <IconStatusBadge variant="info-light">Diajukan</IconStatusBadge>
          <IconStatusBadge variant="destructive-light">Ditolak</IconStatusBadge>
        </div>
      </FramePanel>
    </Frame>
  )
}
