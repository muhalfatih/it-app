"use client"

import * as React from "react"

import { NavMain } from "@workspace/ui/components/nav-main"
import { NavUser } from "@workspace/ui/components/nav-user"
import { TeamSwitcher } from "@workspace/ui/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar"
import {
  BoxIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  HeadsetIcon,
  KanbanSquareIcon,
  MonitorPlayIcon,
  Settings2Icon,
  UserCheckIcon,
} from "lucide-react"

// Menu modul Tahap 1 (PRD §4). shortcut: user & menu masih statis; filter per peran menyusul bersama login.
const data = {
  user: {
    name: "Pengguna",
    email: "Belum masuk",
    avatar: "",
  },
  teams: [
    {
      name: "Unit IT & Media",
      logo: <MonitorPlayIcon />,
      plan: "SIT Insantama",
    },
  ],
  navMain: [
    {
      title: "Media Planner",
      url: "/planner",
      icon: <CalendarDaysIcon />,
      isActive: true,
      items: [
        { title: "Daftar", url: "/planner" },
        { title: "Kalender pekanan", url: "/planner?tampilan=kalender" },
        { title: "Partisi per orang", url: "/planner?tampilan=partisi" },
      ],
    },
    {
      title: "Laporan Harian",
      url: "/laporan",
      icon: <ClipboardListIcon />,
      items: [
        { title: "Isi laporan", url: "/laporan" },
        { title: "Rekap & skor", url: "/laporan/rekap" },
      ],
    },
    {
      title: "Tugas dari Manajer",
      url: "/tugas",
      icon: <ClipboardCheckIcon />,
      items: [
        { title: "Daftar tugas", url: "/tugas" },
        { title: "Beri tugas", url: "/tugas/baru" },
      ],
    },
    {
      title: "Manajemen Konten",
      url: "/konten",
      icon: <KanbanSquareIcon />,
      items: [{ title: "Kanban", url: "/konten" }],
    },
    {
      title: "Absensi",
      url: "/absensi",
      icon: <UserCheckIcon />,
      items: [
        { title: "Isi absensi", url: "/absensi" },
        { title: "Rekap", url: "/absensi/rekap" },
        { title: "Hari libur", url: "/absensi/libur" },
      ],
    },
    {
      title: "Layanan",
      url: "/layanan",
      icon: <HeadsetIcon />,
      items: [
        { title: "Pengajuan SDM", url: "/layanan/sdm" },
        { title: "Pengajuan Saya", url: "/layanan/sdm/saya" },
        { title: "Pengaduan Internet", url: "/layanan/internet" },
        { title: "Rekap pengaduan", url: "/layanan/internet/rekap" },
      ],
    },
    {
      title: "Inventaris",
      url: "/inventaris",
      icon: <BoxIcon />,
      items: [
        { title: "Data alat", url: "/inventaris" },
        { title: "Peminjaman", url: "/inventaris/peminjaman" },
      ],
    },
    {
      title: "Setting",
      url: "/setting",
      icon: <Settings2Icon />,
      items: [
        { title: "Peran & bidang", url: "/setting/peran" },
        { title: "Daftar penugasan", url: "/setting/penugasan" },
        { title: "Kanal output", url: "/setting/kanal" },
        { title: "Tugas rutin", url: "/setting/tugas-rutin" },
        { title: "Unit & gedung", url: "/setting/unit-gedung" },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
