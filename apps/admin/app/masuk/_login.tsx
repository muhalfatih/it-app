"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { authClient } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"
import { LoginForm } from "@workspace/ui/components/login-form"

/** Pesan galat dalam bahasa pengguna; kode dari Better Auth. */
function messageFor(error: {
  code?: string
  message?: string
  status?: number
}) {
  if (error.status === 429)
    return "Terlalu banyak percobaan. Coba lagi beberapa menit lagi."
  if (error.code === "INVALID_USERNAME_OR_PASSWORD")
    return "Username atau kata sandi salah."
  if (error.message === "Akun dinonaktifkan")
    return "Akun Anda dinonaktifkan. Hubungi Manajer."
  return "Gagal masuk. Periksa koneksi lalu coba lagi."
}

/** Kode galat dari callback SSO (`/masuk?error=...`): Better Auth atau IdP Simtama. */
function ssoMessageFor(code: string) {
  if (code === "access_denied")
    return "Akses ke aplikasi ini ditolak oleh Simtama ID."
  return "Gagal masuk dengan Simtama ID. Coba lagi."
}

export function LoginClient({
  sso,
  ssoError,
}: {
  sso: boolean
  ssoError?: string
}) {
  const router = useRouter()
  const [error, setError] = React.useState(
    ssoError ? ssoMessageFor(ssoError) : undefined
  )
  const [pending, setPending] = React.useState(false)

  const form = (
    <LoginForm
      error={error}
      pending={pending}
      onSubmit={async (event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        setPending(true)
        setError(undefined)
        const { error: failure } = await authClient.signIn.username({
          username: String(form.get("username") ?? "")
            .trim()
            .toLowerCase(),
          password: String(form.get("password") ?? ""),
        })
        if (failure) {
          setError(messageFor(failure))
          setPending(false)
          // Arahkan pengguna langsung ke field yang perlu diperbaiki.
          const password = event.currentTarget.elements.namedItem("password")
          if (password instanceof HTMLInputElement) password.select()
          return
        }
        router.replace("/")
        router.refresh()
      }}
    />
  )
  if (!sso) return form

  return (
    <div className="flex flex-col gap-4">
      {form}
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          setError(undefined)
          // Better Auth mengarahkan browser ke Simtama ID (state + PKCE disimpan di server).
          const { error: failure } = await authClient.signIn.social({
            provider: "simtama",
            callbackURL: "/",
            errorCallbackURL: "/masuk",
          })
          if (failure) {
            setError(ssoMessageFor(failure.code ?? ""))
            setPending(false)
          }
        }}
      >
        Masuk dengan Simtama ID
      </Button>
    </div>
  )
}
