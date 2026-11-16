import {
  BoxIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  HeadsetIcon,
  KanbanSquareIcon,
  Settings2Icon,
  UserCheckIcon,
} from "lucide-react"

import type { Permission } from "@workspace/auth/permissions"
import type { CurrentUser } from "@workspace/auth/session"

type SubItem = { title: string; url: string; permission: Permission }

/** Ikon berupa elemen, bukan komponen: fungsi tidak bisa dikirim dari server ke sidebar (client). */
export type MenuItem = {
  title: string
  url: string
  icon: React.ReactNode
  isActive?: boolean
  items: SubItem[]
}

const MENU: Omit<MenuItem, "isActive">[] = [
  {
    title: "Media Planner",
    url: "/planner",
    icon: <CalendarDaysIcon />,
    items: [
      { title: "Daftar", url: "/planner", permission: "planner.lihat" },
      {
        title: "Kalender pekanan",
        url: "/planner?tampilan=kalender",
        permission: "planner.lihat",
      },
      {
        title: "Partisi per orang",
        url: "/planner?tampilan=partisi",
        permission: "planner.lihat",
      },
    ],
  },
  {
    title: "Laporan Harian",
    url: "/laporan",
    icon: <ClipboardListIcon />,
    items: [
      { title: "Isi laporan", url: "/laporan", permission: "laporan.isi" },
      {
        title: "Rekap & skor",
        url: "/laporan/rekap",
        permission: "laporan.rekap.sendiri",
      },
      {
        title: "Rekap tim",
        url: "/laporan/rekap",
        permission: "laporan.rekap.semua",
      },
    ],
  },
  {
    title: "Tugas dari Manajer",
    url: "/tugas",
    icon: <ClipboardCheckIcon />,
    items: [
      {
        title: "Beri & kelola tugas",
        url: "/tugas",
        permission: "tugas_manajer.kelola",
      },
    ],
  },
  {
    title: "Manajemen Konten",
    url: "/konten",
    icon: <KanbanSquareIcon />,
    items: [{ title: "Kanban", url: "/konten", permission: "kanban.lihat" }],
  },
  {
    title: "Absensi",
    url: "/absensi",
    icon: <UserCheckIcon />,
    items: [
      { title: "Isi absensi", url: "/absensi", permission: "absensi.isi" },
      { title: "Hari libur", url: "/absensi/libur", permission: "absensi.isi" },
      {
        title: "Rekap saya",
        url: "/absensi/rekap",
        permission: "absensi.rekap.sendiri",
      },
      {
        title: "Rekap tim",
        url: "/absensi/rekap",
        permission: "absensi.rekap.semua",
      },
    ],
  },
  {
    title: "Layanan",
    url: "/layanan",
    icon: <HeadsetIcon />,
    items: [
      {
        title: "Pengajuan SDM",
        url: "/layanan/sdm",
        permission: "layanan.ajukan",
      },
      {
        title: "Pengajuan Saya",
        url: "/layanan/sdm/saya",
        permission: "layanan.ajukan",
      },
      {
        title: "Persetujuan SDM",
        url: "/layanan/sdm/persetujuan",
        permission: "layanan.setujui_sdm",
      },
      {
        title: "Pengaduan Internet",
        url: "/layanan/internet",
        permission: "layanan.ajukan",
      },
      {
        title: "Rekap pengaduan",
        url: "/layanan/internet/rekap",
        permission: "pengaduan.lihat",
      },
    ],
  },
  {
    title: "Inventaris",
    url: "/inventaris",
    icon: <BoxIcon />,
    items: [
      {
        title: "Peminjaman",
        url: "/inventaris/peminjaman",
        permission: "peminjaman.catat",
      },
      {
        title: "Data alat",
        url: "/inventaris",
        permission: "inventaris.kelola",
      },
    ],
  },
  {
    title: "Setting",
    url: "/setting",
    icon: <Settings2Icon />,
    items: [
      {
        title: "Akun & peran",
        url: "/setting/akun",
        permission: "setting.kelola",
      },
      {
        title: "Daftar penugasan",
        url: "/setting/penugasan",
        permission: "setting.kelola",
      },
      {
        title: "Kanal output",
        url: "/setting/kanal",
        permission: "setting.kelola",
      },
      {
        title: "Tugas rutin",
        url: "/setting/tugas-rutin",
        permission: "setting.kelola",
      },
      {
        title: "Unit & gedung",
        url: "/setting/unit-gedung",
        permission: "setting.kelola",
      },
    ],
  },
]

/** Menu sesuai izin akun: sub-item tanpa izin dibuang, grup kosong dibuang (tampilan saja, bukan pengaman). */
export function menuFor(user: CurrentUser): MenuItem[] {
  const visible = MENU.map((group) => {
    const allowed = group.items.filter((item) =>
      user.permissions.has(item.permission)
    )
    // Multi-peran bisa punya dua entri untuk URL yang sama (mis. rekap saya & rekap tim): yang terakhir menang.
    const byUrl = new Map(allowed.map((item) => [item.url, item]))
    return { ...group, items: [...byUrl.values()] }
  }).filter((group) => group.items.length > 0)
  return visible.map((group, i) => ({ ...group, isActive: i === 0 }))
}
