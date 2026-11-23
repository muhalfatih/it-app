import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { safeNext } from "@workspace/auth/rules"
import { ssoEnabled, ssoReachable } from "@workspace/auth/server"
import { getCurrentUser } from "@workspace/auth/session"

import { LoginClient } from "./_login"

export const metadata: Metadata = { title: "Masuk · Unit IT & Media" }

// Tata letak blok login-05: satu kolom di tengah.
export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; keluar?: string }>
}) {
  const params = await searchParams
  const next = safeNext(params.next)
  const user = await getCurrentUser()
  if (user && !user.disabled) redirect(next ?? "/")

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginClient
          sso={ssoEnabled}
          reachable={ssoEnabled && (await ssoReachable())}
          ssoError={params.error}
          signedOut={params.keluar === "1"}
          next={next}
        />
      </div>
    </main>
  )
}
