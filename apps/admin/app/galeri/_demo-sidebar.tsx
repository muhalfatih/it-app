"use client"

import {
  BoxIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  HeadsetIcon,
  KanbanSquareIcon,
  SettingsIcon,
  UserCheckIcon,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"

const MENU = [
  { label: "Media Planner", icon: CalendarDaysIcon, active: true },
  { label: "Laporan Harian", icon: ClipboardListIcon, badge: "1" },
  { label: "Manajemen Konten", icon: KanbanSquareIcon },
  { label: "Absensi", icon: UserCheckIcon },
  { label: "Layanan", icon: HeadsetIcon },
  { label: "Inventaris", icon: BoxIcon },
  { label: "Setting", icon: SettingsIcon },
]

export function SidebarDemo() {
  return (
    <SidebarProvider className="min-h-0 w-fit overflow-hidden rounded-2xl ring-1 ring-foreground/10">
      <Sidebar collapsible="none">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Unit IT &amp; Media</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {MENU.map(({ label, icon: Icon, active, badge }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton isActive={active}>
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                    {badge ? (
                      <SidebarMenuBadge>{badge}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}
