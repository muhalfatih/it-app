"use client"

import * as React from "react"
import { MonitorPlayIcon } from "lucide-react"

import {
  NavGrouped,
  type NavSection,
} from "@workspace/ui/components/domain/nav-grouped"
import { NavUser } from "@workspace/ui/components/nav-user"
import { TeamSwitcher } from "@workspace/ui/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

/**
 * Kerangka sidebar (blok sidebar-07, menu berkelompok per judul).
 * Menu dan pengguna dikirim dari server (sudah disaring sesuai izin peran);
 * `onSignOut` berupa server action.
 */
export function AppSidebar({
  sections,
  accountItems,
  user,
  onSignOut,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  sections: NavSection[]
  accountItems?: React.ComponentProps<typeof NavUser>["items"]
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
        <NavGrouped sections={sections} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} items={accountItems} onSignOut={onSignOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
