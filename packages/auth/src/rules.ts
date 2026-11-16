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
