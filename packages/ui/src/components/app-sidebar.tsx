"use client"

import * as React from "react"
import { MonitorPlayIcon } from "lucide-react"

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

type NavItem = React.ComponentProps<typeof NavMain>["items"][number]

/**
 * Kerangka sidebar (blok sidebar-07). Menu dan pengguna dikirim dari server
 * (sudah disaring sesuai izin peran); `onSignOut` berupa server action.
 */
export function AppSidebar({
  navMain,
  user,
  onSignOut,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navMain: NavItem[]
  user: React.ComponentProps<typeof NavUser>["user"]
  onSignOut: () => Promise<void>
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          teams={[
            {
              name: "Unit IT & Media",
              logo: <MonitorPlayIcon />,
              plan: "SIT Insantama",
            },
          ]}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onSignOut={onSignOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
