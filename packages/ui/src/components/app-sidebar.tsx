"use client"

import * as React from "react"
import { MonitorPlayIcon } from "lucide-react"

import {
  NavGrouped,
  type NavItem,
  type NavSection,
} from "@workspace/ui/components/domain/nav-grouped"
import { NavUser } from "@workspace/ui/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

/**
 * Kerangka sidebar (pola blok sidebar-08, tetap bisa diciutkan ke ikon).
 * Menu dan pengguna dikirim dari server (sudah disaring sesuai izin peran);
 * `onSignOut` berupa server action.
 */
export function AppSidebar({
  sections,
  secondary,
  user,
  onSignOut,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  sections: NavSection[]
  secondary?: NavItem[]
  user: React.ComponentProps<typeof NavUser>["user"]
  onSignOut: () => Promise<void>
}) {
  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<a href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <MonitorPlayIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Unit IT &amp; Media</span>
                <span className="truncate text-xs">SIT Insantama</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGrouped sections={sections} secondary={secondary} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onSignOut={onSignOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
