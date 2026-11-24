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
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
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
 * Navigasi berkelompok pola sidebar-08: judul > menu (link) > sub-menu
 * (dibuka lewat tombol panah terpisah). `secondary` tampil di bawah.
 */
export function NavGrouped({
  sections,
  secondary = [],
}: {
  sections: NavSection[]
  secondary?: NavItem[]
}) {
  const loc = useLocationKey()
  const urls = [...sections.flatMap((s) => s.items), ...secondary].flatMap(
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
      {secondary.length > 0 && (
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {secondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    size="sm"
                    tooltip={item.title}
                    isActive={item.url === active}
                    render={
                      <a
                        href={item.url}
                        aria-current={item.url === active ? "page" : undefined}
                      />
                    }
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
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
      render={<SidebarMenuItem />}
    >
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
      {hasSub && (
        <>
          <CollapsibleTrigger
            render={<SidebarMenuAction className="aria-expanded:rotate-90" />}
          >
            <ChevronRightIcon />
            <span className="sr-only">Buka/tutup sub-menu {item.title}</span>
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
