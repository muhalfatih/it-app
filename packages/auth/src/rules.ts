// Modul murni: aturan validasi akun (dipakai aksi server dan tes).
import { z } from "zod"

import type { Role } from "@workspace/db/schema/roles"

/** Sesuai batas plugin username Better Auth: 3–30 karakter, huruf/angka/titik/garis bawah, huruf kecil. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._]{3,30}$/, {
    message: "Username 3–30 karakter: huruf, angka, titik, atau garis bawah",
  })

/** Header berisi path + query permintaan, dipasang proxy.ts agar guard tahu halaman asal. */
export const PATH_HEADER = "x-app-path"

/**
 * Tujuan setelah masuk: hanya path internal (bukan `//host` atau `/\host`, yang dibaca browser
 * sebagai domain lain) dan bukan halaman masuk/endpoint auth (mencegah loop). Selain itu undefined.
 */
export function safeNext(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith("/") || /^\/[/\\]/.test(value)) return
  if (/[\u0000-\u001f\\]/.test(value)) return
  if (/^\/(masuk|api\/auth)(\/|\?|$)/.test(value)) return
  return value
}

export function loginPath(from: string | null | undefined): string {
  const next = safeNext(from)
  return next && next !== "/"
    ? `/masuk?next=${encodeURIComponent(next)}`
    : "/masuk"
}

/**
 * Tepat satu Manajer: peran ini tidak bisa diberikan atau dicabut lewat form akun, hanya
 * dipindahkan dengan transferManager (accounts.ts). Peran lain dari isian dipakai apa adanya.
 */
export const withoutManager = (roles: readonly Role[]): Role[] =>
  roles.filter((r) => r !== "manajer")

/** Email wajib di tabel Better Auth; akun lokal memakai email sintetis yang tidak dipakai untuk apa pun. */
// shortcut: email sintetis, ganti dengan email asli saat adapter sistem informasi sekolah dipasang.
export const syntheticEmail = (username: string) => `${username}@akun.lokal`

/**
 * Profil SSO Simtama ID dari objek `account` di respons token.
 * Email diganti email sintetis dari username agar Better Auth menautkan login SSO pertama
 * ke akun lokal dengan username yang sama (atau membuat akun baru); setelah tertaut, pencarian memakai `sub`.
 * null bila profil tidak lengkap atau username tidak lolos aturan akun lokal.
 */
export function simtamaUserInfo(account: unknown) {
  const a = account as {
    sub?: unknown
    username?: unknown
    name?: unknown
  }
  if (a?.sub == null || a.sub === "" || typeof a.username !== "string")
    return null
  const username = usernameSchema.safeParse(a.username)
  if (!username.success) return null
  return {
    id: String(a.sub),
    email: syntheticEmail(username.data),
    name: typeof a.name === "string" ? a.name : username.data,
    emailVerified: false,
    username: username.data,
  }
}
