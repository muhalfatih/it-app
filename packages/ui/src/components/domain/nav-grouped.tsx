"use client"

import * as React from "react"
import { ChevronRightIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@workspace/ui/components/sidebar"
import { activeUrl } from "@workspace/ui/lib/active-url"

export type NavLink = { title: string; url: string }
/** Ikon berupa elemen (bukan komponen) supaya bisa dikirim dari server. */
export type NavItem = NavLink & { icon: React.ReactNode; items: NavLink[] }
export type NavSection = { title: string; items: NavItem[] }

const subscribe = () => () => {}
// shortcut: lokasi dibaca sekali dari window karena sidebar memakai <a href> (muat ulang tiap klik); ganti ke usePathname bila pindah ke next/link.
function useLocationKey() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.location.pathname + window.location.search,
    () => null
  )
}

/**
 * Navigasi berkelompok bergaya sidebar-07: judul > menu > sub-menu. Menu
 * bersub-menu membuka/menutup saat diklik; menu tanpa sub-menu berupa link.
 */
export function NavGrouped({ sections }: { sections: NavSection[] }) {
  const loc = useLocationKey()
  const urls = sections.flatMap((s) => s.items).flatMap(
    (item) => [item.url, ...item.items.map((sub) => sub.url)]
  )
  let active: string | null = null
  if (loc) {
    const url = new URL(loc, "http://x")
    active = activeUrl(urls, url.pathname, url.search)
  }

  return (
    <>
      {sections.map((section) => (
        <SidebarGroup key={section.title}>
          <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
          <SidebarMenu>
            {section.items.map((item) => (
              <NavEntry key={item.title} item={item} active={active} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}

function NavEntry({ item, active }: { item: NavItem; active: string | null }) {
  const hasSub = item.items.length > 0
  const subActive = item.items.some((sub) => sub.url === active)
  const selfActive = !hasSub && item.url === active
  return (
    // key: defaultOpen hanya dibaca saat mount, jadi pasang ulang setelah lokasi terbaca di klien.
    <Collapsible
      key={subActive ? "open" : "closed"}
      defaultOpen={subActive}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      {!hasSub && (
        <SidebarMenuButton
          tooltip={item.title}
          isActive={selfActive}
          render={
            <a href={item.url} aria-current={selfActive ? "page" : undefined} />
          }
        >
          {item.icon}
          <span>{item.title}</span>
        </SidebarMenuButton>
      )}
      {hasSub && (
        <>
          <CollapsibleTrigger
            render={<SidebarMenuButton tooltip={item.title} />}
          >
            {item.icon}
            <span>{item.title}</span>
            <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.items.map((sub) => (
                <SidebarMenuSubItem key={sub.url}>
                  <SidebarMenuSubButton
                    isActive={sub.url === active}
                    render={
                      <a
                        href={sub.url}
                        aria-current={sub.url === active ? "page" : undefined}
                      />
                    }
                  >
                    <span>{sub.title}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </>
      )}
    </Collapsible>
  )
}
