"use client"

import * as React from "react"

import { authClient } from "@workspace/auth/client"
import { LoginForm } from "@workspace/ui/components/login-form"

/** Kode galat dari callback SSO (`/masuk?error=...`): Better Auth, IdP Simtama, atau hook akun nonaktif. */
function ssoMessageFor(code: string) {
  if (code === "access_denied")
    return "Simtama ID belum memberi Anda akses ke aplikasi ini. Hubungi Manajer unit."
  if (code === "account_disabled")
    return "Akun Anda dinonaktifkan. Hubungi Manajer unit."
  return "Gagal masuk dengan Simtama ID. Coba lagi."
}

export function LoginClient({
  sso,
  reachable,
  ssoError,
  signedOut,
  next,
}: {
  sso: boolean
  /** Simtama ID terjangkau saat halaman dimuat. */
  reachable: boolean
  ssoError?: string
  signedOut: boolean
  next?: string
}) {
  const [error, setError] = React.useState(() =>
    !sso
      ? "Login Simtama ID belum dikonfigurasi di server. Hubungi admin aplikasi."
      : ssoError
        ? ssoMessageFor(ssoError)
        : !reachable
          ? "Simtama ID sedang gangguan, jadi belum bisa masuk. Coba lagi beberapa saat lagi."
          : undefined
  )
  const [pending, setPending] = React.useState(false)
  const started = React.useRef(false)

  const start = React.useCallback(async () => {
    setPending(true)
    setError(undefined)
    // Better Auth mengarahkan browser ke Simtama ID (state + PKCE disimpan di server).
    const { error: failure } = await authClient.signIn.social({
      provider: "simtama",
      callbackURL: next ?? "/",
      errorCallbackURL: "/masuk",
    })
    if (failure) {
      setError(ssoMessageFor(failure.code ?? ""))
      setPending(false)
    }
  }, [next])

  // Langsung ke Simtama bila tidak ada yang perlu dibaca pengguna dulu. Setelah galat atau
  // keluar tidak otomatis, agar tidak terjadi loop atau langsung masuk lagi.
  React.useEffect(() => {
    if (started.current || !sso || !reachable || ssoError || signedOut) return
    started.current = true
    void start()
  }, [sso, reachable, ssoError, signedOut, start])

  return (
    <LoginForm
      error={error}
      notice={
        signedOut
          ? "Anda sudah keluar. Di perangkat bersama, keluar juga dari Simtama ID."
          : undefined
      }
      pending={pending}
      onSso={sso ? () => void start() : undefined}
    />
  )
}
