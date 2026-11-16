// Server-only: satu-satunya jalur pembuatan/perubahan akun dan kredensial.
// Ditulis langsung lewat Drizzle (saran resmi Better Auth: pakai instance db sendiri);
// hash kata sandi memakai fungsi hash milik Better Auth agar cocok saat login.
import { randomUUID } from "node:crypto"

import { db } from "@workspace/db/client"
import { and, asc, eq } from "@workspace/db/orm"
import { account, session, user, userRole } from "@workspace/db/schema"
import type { Bidang, Role } from "@workspace/db/schema/roles"

import { passwordSchema, usernameSchema } from "./rules"
import { auth } from "./server"

/** Email wajib di tabel Better Auth; akun lokal memakai email sintetis yang tidak dipakai untuk apa pun. */
// shortcut: email sintetis, ganti dengan email asli saat adapter sistem informasi sekolah dipasang.
const syntheticEmail = (username: string) => `${username}@akun.lokal`

async function hashPassword(password: string) {
  const ctx = await auth.$context
  return ctx.password.hash(passwordSchema.parse(password))
}

export type AccountInput = {
  name: string
  roles: Role[]
  bidang: Bidang[]
  unitId: number | null
}

export class AccountError extends Error {}

export async function createAccount(
  input: AccountInput & {
    username: string
    password: string
    mustChangePassword?: boolean
  }
): Promise<{ id: string }> {
  const username = usernameSchema.parse(input.username)
  const [taken] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
  if (taken) throw new AccountError("Username sudah dipakai")

  const id = randomUUID()
  const password = await hashPassword(input.password)
  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id,
      name: input.name.trim(),
      email: syntheticEmail(username),
      emailVerified: false,
      username,
      displayUsername: username,
      unitId: input.unitId,
      bidang: input.bidang.join(",") || null,
      mustChangePassword: input.mustChangePassword ?? true,
    })
    await tx.insert(account).values({
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password,
    })
    if (input.roles.length) {
      await tx
        .insert(userRole)
        .values(input.roles.map((role) => ({ userId: id, role })))
    }
  })
  return { id }
}

export async function updateAccount(
  id: string,
  input: AccountInput
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({
        name: input.name.trim(),
        unitId: input.unitId,
        bidang: input.bidang.join(",") || null,
      })
      .where(eq(user.id, id))
    await tx.delete(userRole).where(eq(userRole.userId, id))
    if (input.roles.length) {
      await tx
        .insert(userRole)
        .values(input.roles.map((role) => ({ userId: id, role })))
    }
  })
}

/** Atur ulang oleh Manajer: wajib ganti kata sandi lagi dan semua sesi lama dicabut. */
export async function resetPassword(
  id: string,
  newPassword: string
): Promise<void> {
  const password = await hashPassword(newPassword)
  await db.transaction(async (tx) => {
    await tx
      .update(account)
      .set({ password })
      .where(and(eq(account.userId, id), eq(account.providerId, "credential")))
    await tx
      .update(user)
      .set({ mustChangePassword: true })
      .where(eq(user.id, id))
    await tx.delete(session).where(eq(session.userId, id))
  })
}

/** Nonaktif: login ditolak (hook sesi) dan semua sesi yang ada dicabut. */
export async function setDisabled(
  id: string,
  disabled: boolean
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(user)
      .set({ disabledAt: disabled ? new Date() : null })
      .where(eq(user.id, id))
    if (disabled) await tx.delete(session).where(eq(session.userId, id))
  })
}

/** Setelah pengguna mengganti kata sandinya sendiri. */
export async function clearMustChangePassword(id: string): Promise<void> {
  await db
    .update(user)
    .set({ mustChangePassword: false })
    .where(eq(user.id, id))
}

export type AccountRow = {
  id: string
  username: string
  name: string
  roles: Role[]
  bidang: Bidang[]
  unitId: number | null
  disabled: boolean
  mustChangePassword: boolean
  createdAt: Date
}

export async function listAccounts(): Promise<AccountRow[]> {
  const [users, roles] = await Promise.all([
    db.select().from(user).orderBy(asc(user.name)),
    db.select().from(userRole),
  ])
  return users.map((u) => ({
    id: u.id,
    username: u.username ?? "",
    name: u.name,
    roles: roles.filter((r) => r.userId === u.id).map((r) => r.role as Role),
    bidang: parseBidang(u.bidang),
    unitId: u.unitId,
    disabled: u.disabledAt !== null,
    mustChangePassword: u.mustChangePassword ?? false,
    createdAt: u.createdAt,
  }))
}

export function parseBidang(value: string | null): Bidang[] {
  return (value ?? "")
    .split(",")
    .filter((b): b is Bidang => b === "it" || b === "media")
}
