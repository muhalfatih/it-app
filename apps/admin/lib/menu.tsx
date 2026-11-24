import {
  BarChart3Icon,
  BellIcon,
  BoxIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  DatabaseIcon,
  HeadsetIcon,
  KanbanSquareIcon,
  LayoutDashboardIcon,
  PackageOpenIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react"

import type { Permission } from "@workspace/auth/permissions"
import type { CurrentUser } from "@workspace/auth/session"
import type {
  NavItem,
  NavSection,
} from "@workspace/ui/components/domain/nav-grouped"

/**
 * Tanpa `permission` = tampil untuk semua akun (termasuk Staf Unit Lain).
 * `hideIf`: disembunyikan bila akun punya izin itu (versi "saya" untuk akun yang melihat versi tim).
 */
type Link = {
  title: string
  url: string
  permission?: Permission
  hideIf?: Permission
}
/** Menu berisi sub-menu memakai `items`; menu tunggal memakai `url` + `permission`. */
type Entry =
  | (Link & { icon: React.ReactNode; items?: undefined })
  | { title: string; icon: React.ReactNode; items: Link[] }

const MENU: { title: string; items: Entry[] }[] = [
  {
    title: "Kerja saya",
    items: [
      { title: "Beranda", url: "/", icon: <LayoutDashboardIcon /> },
      {
        title: "Absensi",
        icon: <UserCheckIcon />,
        items: [
          { title: "Isi absensi", url: "/absensi", permission: "absensi.isi" },
          {
            title: "Rekap saya",
            url: "/absensi/rekap",
            permission: "absensi.rekap.sendiri",
            hideIf: "absensi.rekap.semua",
          },
        ],
      },
      {
        title: "Laporan Harian",
        icon: <ClipboardListIcon />,
        items: [
          { title: "Isi laporan", url: "/laporan", permission: "laporan.isi" },
          {
            title: "Rekap & skor",
            url: "/laporan/rekap",
            permission: "laporan.rekap.sendiri",
            hideIf: "laporan.rekap.semua",
          },
        ],
      },
      {
        title: "Layanan",
        icon: <HeadsetIcon />,
        items: [
          {
            title: "Ajukan SDM",
            url: "/layanan/sdm",
            permission: "layanan.ajukan",
          },
          {
            title: "Pengajuan saya",
            url: "/layanan/sdm/saya",
            permission: "layanan.ajukan",
          },
          {
            title: "Pengaduan internet",
            url: "/layanan/internet",
            permission: "layanan.ajukan",
          },
        ],
      },
      {
        title: "Peminjaman alat",
        url: "/inventaris/peminjaman",
        permission: "peminjaman.catat",
        icon: <PackageOpenIcon />,
      },
    ],
  },
  {
    title: "Konten & media",
    items: [
      {
        title: "Media Planner",
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
        title: "Kanban konten",
        url: "/konten",
        permission: "kanban.lihat",
        icon: <KanbanSquareIcon />,
      },
    ],
  },
  {
    title: "Pantau tim",
    items: [
      {
        title: "Tugas tim",
        icon: <ClipboardCheckIcon />,
        items: [
          {
            title: "Daftar tugas",
            url: "/tugas",
            permission: "tugas_manajer.kelola",
          },
          {
            title: "Beri tugas baru",
            url: "/tugas/baru",
            permission: "tugas_manajer.kelola",
          },
        ],
      },
      {
        title: "Laporan tim",
        icon: <BarChart3Icon />,
        items: [
          {
            title: "Rekap & skor tim",
            url: "/laporan/rekap",
            permission: "laporan.rekap.semua",
          },
          {
            title: "Laporan harian",
            url: "/laporan/tim",
            permission: "laporan.rekap.semua",
          },
        ],
      },
      {
        title: "Absensi tim",
        url: "/absensi/rekap",
        permission: "absensi.rekap.semua",
        icon: <CalendarCheckIcon />,
      },
      {
        title: "Persetujuan & rekap",
        icon: <ShieldCheckIcon />,
        items: [
          {
            title: "Persetujuan SDM",
            url: "/layanan/sdm/persetujuan",
            permission: "layanan.setujui_sdm",
          },
          {
            title: "Rekap pengaduan",
            url: "/layanan/internet/rekap",
            permission: "pengaduan.lihat",
          },
        ],
      },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      {
        title: "Akun & peran",
        url: "/setting/akun",
        permission: "setting.kelola",
        icon: <UsersIcon />,
      },
      {
        title: "Data master",
        icon: <DatabaseIcon />,
        items: [
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
          // Menu khusus admin; halamannya tetap memakai izin absensi.isi.
          {
            title: "Hari libur",
            url: "/absensi/libur",
            permission: "setting.kelola",
          },
        ],
      },
      {
        title: "Inventaris alat",
        url: "/inventaris",
        permission: "inventaris.kelola",
        icon: <BoxIcon />,
      },
    ],
  },
]

/** Link di pop-up akun (footer sidebar); tampil untuk semua akun. */
export const NAV_ACCOUNT = [
  { title: "Notifikasi", url: "/notifikasi", icon: <BellIcon /> },
]

/**
 * Menu sesuai izin akun (tampilan saja, bukan pengaman). Menu tanpa sub-menu
 * yang lolos dibuang; menu dengan satu sub-menu tersisa menjadi link langsung
 * ke sub-menu itu; judul kosong dibuang.
 */
export function menuFor(user: CurrentUser): NavSection[] {
  const allowed = (link: Link) =>
    (link.permission === undefined || user.permissions.has(link.permission)) &&
    (link.hideIf === undefined || !user.permissions.has(link.hideIf))

  return MENU.map((section) => ({
    title: section.title,
    items: section.items.flatMap((entry): NavItem[] => {
      if (!entry.items) {
        return allowed(entry)
          ? [{ title: entry.title, url: entry.url, icon: entry.icon, items: [] }]
          : []
      }
      const subs = entry.items
        .filter(allowed)
        .map(({ title, url }) => ({ title, url }))
      const [first] = subs
      if (!first) return []
      return [
        {
          title: entry.title,
          url: first.url,
          icon: entry.icon,
          items: subs.length > 1 ? subs : [],
        },
      ]
    }),
  })).filter((section) => section.items.length > 0)
}
