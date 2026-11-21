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

export const passwordSchema = z
  .string()
  .min(8, { message: "Kata sandi minimal 8 karakter" })

type AccountState = { id: string; roles: readonly Role[]; disabled: boolean }

/** Mencegah aplikasi kehilangan Manajer aktif terakhir (tidak ada lagi yang bisa mengelola akun). */
export function assertManagerRemains(
  accounts: readonly AccountState[],
  change: { id: string; roles?: readonly Role[]; disabled?: boolean }
): void {
  const after = accounts.map((a) =>
    a.id === change.id
      ? {
          ...a,
          roles: change.roles ?? a.roles,
          disabled: change.disabled ?? a.disabled,
        }
      : a
  )
  const activeManagers = after.filter(
    (a) => !a.disabled && a.roles.includes("manajer")
  )
  if (activeManagers.length === 0) {
    throw new Error("Harus ada minimal satu Manajer aktif")
  }
}

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
