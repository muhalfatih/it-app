"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  AccountError,
  createAccount,
  resetPassword,
  setDisabled,
  updateAccount,
} from "@workspace/auth/accounts"
import { passwordSchema, usernameSchema } from "@workspace/auth/rules"
import { withPermission } from "@workspace/auth/session"
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
