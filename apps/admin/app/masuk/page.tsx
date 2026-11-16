import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { MonitorPlayIcon } from "lucide-react"

import { getCurrentUser } from "@workspace/auth/session"

import { LoginClient } from "./_login"

export const metadata: Metadata = { title: "Masuk · Unit IT & Media" }

const today = () =>
  new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

export default async function MasukPage() {
  const user = await getCurrentUser()
  if (user && !user.disabled) redirect("/")

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Panel identitas: ritme kerja harian unit, bukan gambar dekoratif. */}
      <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/10">
            <MonitorPlayIcon aria-hidden className="size-4" />
          </span>
          Unit IT &amp; Media · SIT Insantama
        </div>
        <div className="flex max-w-md flex-col gap-3">
          <p className="text-4xl leading-tight font-semibold tracking-tight text-balance">
            {today()}
          </p>
          <p className="text-sm text-primary-foreground/80">
            Laporan harian bisa diisi sampai hari kerja berikutnya pukul 10.00
            WIB. Pengingat dikirim pukul 15.45.
          </p>
        </div>
      </aside>

      <main className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center gap-2 text-sm font-medium lg:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MonitorPlayIcon aria-hidden className="size-4" />
          </span>
          Unit IT &amp; Media
        </div>
        <div className="flex flex-1 items-center">
          <div className="w-full max-w-sm">
            <LoginClient />
          </div>
        </div>
      </main>
    </div>
  )
}
