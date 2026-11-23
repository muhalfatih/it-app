import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { ssoEnabled } from "@workspace/auth/server"
import { getCurrentUser } from "@workspace/auth/session"

import { LoginClient } from "./_login"

export const metadata: Metadata = { title: "Masuk · Unit IT & Media" }

// Tata letak blok login-05: satu kolom di tengah.
export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await getCurrentUser()
  if (user && !user.disabled) redirect("/")

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginClient sso={ssoEnabled} ssoError={(await searchParams).error} />
      </div>
    </main>
  )
}
