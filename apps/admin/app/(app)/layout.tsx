import { ROLE_LABEL } from "@workspace/auth/permissions"
import { requireUser } from "@workspace/auth/session"
import { AppSidebar } from "@workspace/ui/components/app-sidebar"
import { ThemeToggle } from "@workspace/ui/components/domain/theme-toggle"
import { Separator } from "@workspace/ui/components/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"

import { signOutAction } from "@/lib/auth-actions"
import { menuFor } from "@/lib/menu"

// Kerangka aplikasi (blok sidebar-07). Layout bukan gerbang keamanan:
// setiap halaman dan aksi server tetap memeriksa izinnya sendiri.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()
  const subtitle =
    user.roles.map((r) => ROLE_LABEL[r]).join(", ") || "Staf unit lain"

  return (
    <SidebarProvider>
      <AppSidebar
        navMain={menuFor(user)}
        user={{ name: user.name, subtitle }}
        onSignOut={signOutAction}
      />
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <span className="text-sm font-medium">Unit IT &amp; Media</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
