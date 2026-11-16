"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { clearMustChangePassword } from "@workspace/auth/accounts"
import { passwordSchema } from "@workspace/auth/rules"
import { auth } from "@workspace/auth/server"
import { requireUser } from "@workspace/auth/session"

const schema = z
  .object({
    current: z.string().min(1, { message: "Isi kata sandi saat ini" }),
    next: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    message: "Konfirmasi tidak sama dengan kata sandi baru",
  })
  .refine((v) => v.next !== v.current, {
    path: ["next"],
    message: "Kata sandi baru harus berbeda dari yang sekarang",
  })

export type ChangePasswordState = {
  errors?: Partial<Record<"current" | "next" | "confirm", string>>
}

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const user = await requireUser({ allowPasswordChange: true })
  const parsed = schema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  })
  if (!parsed.success) {
    const errors: ChangePasswordState["errors"] = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<
        ChangePasswordState["errors"]
      >
      errors[key] ??= issue.message
    }
    return { errors }
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.current,
        newPassword: parsed.data.next,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    })
  } catch {
    return { errors: { current: "Kata sandi saat ini salah" } }
  }
  await clearMustChangePassword(user.id)
  redirect("/")
}
