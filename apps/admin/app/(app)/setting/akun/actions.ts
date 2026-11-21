"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  AccountError,
  createAccount,
  createSimtamaAccount,
  existingSimtama,
  resetPassword,
  setDisabled,
  updateAccount,
} from "@workspace/auth/accounts"
import { passwordSchema, usernameSchema } from "@workspace/auth/rules"
import { withPermission } from "@workspace/auth/session"
import {
  getStaff,
  grantAccess,
  searchStaff,
  type DirectoryStaff,
} from "@workspace/auth/simtama-api"
import { BIDANG, ROLES } from "@workspace/db/schema/roles"

export type ActionResult = { ok: true } | { error: string }

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(80),
  roles: z.array(z.enum(ROLES)),
  bidang: z.array(z.enum(BIDANG)),
  unitId: z.number().int().positive().nullable(),
})

const PATH = "/setting/akun"

/** Galat validasi/aturan jadi pesan untuk form; galat lain diteruskan (bug). */
async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    revalidatePath(PATH)
    return { ok: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message ?? "Isian tidak valid" }
    }
    if (error instanceof AccountError) return { error: error.message }
    if (
      error instanceof Error &&
      error.message.startsWith("Harus ada minimal satu Manajer")
    ) {
      return { error: error.message }
    }
    throw error
  }
}

export const createAccountAction = withPermission(
  "setting.kelola",
  async (input: unknown): Promise<ActionResult> =>
    run(async () => {
      const data = profileSchema
        .extend({ username: usernameSchema, password: passwordSchema })
        .parse(input)
      await createAccount({ ...data, mustChangePassword: true })
    })
)

export const updateAccountAction = withPermission(
  "setting.kelola",
  async (id: string, input: unknown): Promise<ActionResult> =>
    run(async () => {
      const data = profileSchema.parse(input)
      await updateAccount(z.string().min(1).parse(id), data)
    })
)

export const resetPasswordAction = withPermission(
  "setting.kelola",
  async (id: string, password: string): Promise<ActionResult> =>
    run(async () => {
      await resetPassword(
        z.string().min(1).parse(id),
        passwordSchema.parse(password)
      )
    })
)

export const setDisabledAction = withPermission(
  "setting.kelola",
  async (id: string, disabled: boolean): Promise<ActionResult> =>
    run(async () => {
      await setDisabled(
        z.string().min(1).parse(id),
        z.boolean().parse(disabled)
      )
    })
)

export type StaffResult = DirectoryStaff & { added: boolean }

/** Cari pegawai di direktori Simtama; `added` bila sudah punya akun di aplikasi ini. */
export const searchSimtamaAction = withPermission(
  "setting.kelola",
  async (q: unknown): Promise<{ rows: StaffResult[] } | { error: string }> => {
    try {
      const rows = await searchStaff(z.string().max(80).parse(q))
      const existing = await existingSimtama(
        rows.map((r) => r.uid),
        rows.map((r) => r.username.toLowerCase())
      )
      return {
        rows: rows.map((r) => ({
          ...r,
          added:
            existing.uids.has(r.uid) ||
            existing.usernames.has(r.username.toLowerCase()),
        })),
      }
    } catch (error) {
      console.error(error)
      return { error: "Direktori Simtama tidak bisa dihubungi. Coba lagi." }
    }
  }
)

/**
 * Buat akun dari pegawai Simtama. Identitas (uid, username, nama) diambil ulang dari Simtama
 * menurut account_id, bukan dari isian browser. Akses Simtama diberikan dulu: aman diulang,
 * dan akun lokal tanpa akses Simtama tidak bisa dipakai login.
 */
export const createFromSimtamaAction = withPermission(
  "setting.kelola",
  async (input: unknown): Promise<ActionResult> =>
    run(async () => {
      const { accountId, ...profile } = profileSchema
        .omit({ name: true })
        .extend({ accountId: z.number().int().positive() })
        .parse(input)
      const staff = await getStaff(accountId)
      if (!staff)
        throw new AccountError(
          "Pegawai tidak ditemukan atau tidak aktif di Simtama"
        )
      if (!usernameSchema.safeParse(staff.username).success)
        throw new AccountError(
          `Username Simtama "${staff.username}" tidak didukung aplikasi ini (3–30 karakter: huruf, angka, titik, garis bawah)`
        )
      try {
        await grantAccess(accountId)
      } catch (error) {
        console.error(error)
        throw new AccountError(
          "Gagal memberi akses di Simtama, akun belum dibuat. Coba lagi."
        )
      }
      await createSimtamaAccount({
        ...profile,
        uid: staff.uid,
        username: staff.username,
        name: staff.name.trim().length >= 2 ? staff.name : staff.username,
      })
    })
)
