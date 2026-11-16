import type { Metadata } from "next"

import { requireUser } from "@workspace/auth/session"
import { Button } from "@workspace/ui/components/button"

import { signOutAction } from "@/lib/auth-actions"

import { ChangePasswordForm } from "./_form"

export const metadata: Metadata = {
  title: "Ganti kata sandi · Unit IT & Media",
}

export default async function GantiKataSandiPage() {
  const user = await requireUser({ allowPasswordChange: true })

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Ganti kata sandi
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.mustChangePassword
              ? `Halo, ${user.name}. Kata sandi Anda dibuat oleh Manajer; ganti dulu sebelum memakai aplikasi.`
              : "Sesi di perangkat lain akan dikeluarkan setelah kata sandi diganti."}
          </p>
        </div>
        <ChangePasswordForm />
        <form action={signOutAction}>
          <p className="text-sm text-muted-foreground">
            Tidak tahu kata sandi saat ini? Minta Manajer mengatur ulang, atau{" "}
            <Button type="submit" variant="link" className="h-auto p-0">
              keluar
            </Button>
            .
          </p>
        </form>
      </div>
    </main>
  )
}
