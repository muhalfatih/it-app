// Server-only: satu-satunya jalur pembuatan/perubahan akun.
// Ditulis langsung lewat Drizzle (saran resmi Better Auth: pakai instance db sendiri).
// Tidak ada kata sandi: semua akun masuk lewat Simtama ID.
import { randomUUID } from "node:crypto"

import { db } from "@workspace/db/client"
import { and, asc, eq, inArray, or, sql } from "@workspace/db/orm"
import { account, session, user, userRole } from "@workspace/db/schema"
import type { Bidang, Role } from "@workspace/db/schema/roles"

import {
  assertManagerRemains,
  syntheticEmail,
  usernameSchema,
} from "./rules"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
/** Kunci advisory: perubahan peran/nonaktif dijalankan bergiliran agar cek Manajer terakhir tidak balapan. */
const MANAGER_LOCK = 4270001

async function guardManagers(
  tx: Tx,
  change: Parameters<typeof assertManagerRemains>[1]
) {
  await tx.execute(sql`select pg_advisory_xact_lock(${MANAGER_LOCK})`)
  const users = await tx
    .select({ id: user.id, disabledAt: user.disabledAt })
    .from(user)
  const roles = await tx.select().from(userRole)
  assertManagerRemains(
    users.map((u) => ({
      id: u.id,
      disabled: u.disabledAt !== null,
      roles: roles.filter((r) => r.userId === u.id).map((r) => r.role as Role),
    })),
    change
  )
}

export type AccountInput = {
  name: string
  roles: Role[]
  bidang: Bidang[]
  unitId: number | null
}

export class AccountError extends Error {}

/**
 * Akun manual (tanpa direktori Simtama): hanya username + peran, tanpa kata sandi. Login SSO
 * pertama dengan username Simtama yang sama menautkannya lewat email sintetis (sso.ts).
 */
export async function createAccount(
  input: AccountInput & { username: string }
): Promise<{ id: string }> {
  const username = usernameSchema.parse(input.username)
  const [taken] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
  if (taken) throw new AccountError("Username sudah dipakai")

  const id = randomUUID()
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
    })
    if (input.roles.length) {
      await tx
        .insert(userRole)
        .values(input.roles.map((role) => ({ userId: id, role })))
    }
  })
  return { id }
}

/**
 * Akun dari direktori Simtama: tanpa kata sandi (hanya bisa masuk lewat SSO) dan langsung
 * ditautkan ke `uid` Simtama, sehingga login pertama tidak bergantung pada kecocokan username.
 */
export async function createSimtamaAccount(
  input: AccountInput & { uid: string; username: string }
): Promise<{ id: string }> {
  const username = usernameSchema.parse(input.username)
  const [taken] = await db
    .select({ username: user.username })
    .from(user)
    .leftJoin(
      account,
      and(eq(account.userId, user.id), eq(account.providerId, "simtama"))
    )
    .where(or(eq(user.username, username), eq(account.accountId, input.uid)))
  if (taken)
    throw new AccountError(
      taken.username === username
        ? "Username sudah dipakai akun lain di aplikasi ini"
        : "Pegawai ini sudah punya akun"
    )

  const id = randomUUID()
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
    })
    await tx.insert(account).values({
      id: randomUUID(),
      accountId: input.uid,
      providerId: "simtama",
      userId: id,
    })
    if (input.roles.length) {
      await tx
        .insert(userRole)
        .values(input.roles.map((role) => ({ userId: id, role })))
    }
  })
  return { id }
}

/** uid Simtama dan username yang sudah dipakai akun lokal, untuk menandai hasil pencarian. */
export async function existingSimtama(uids: string[], usernames: string[]) {
  const [linked, named] = await Promise.all([
    uids.length
      ? db
          .select({ uid: account.accountId })
          .from(account)
          .where(
            and(
              eq(account.providerId, "simtama"),
              inArray(account.accountId, uids)
            )
          )
      : [],
    usernames.length
      ? db
          .select({ username: user.username })
          .from(user)
          .where(inArray(user.username, usernames))
      : [],
  ])
  return {
    uids: new Set(linked.map((r) => r.uid)),
    usernames: new Set(named.map((r) => r.username)),
  }
}

export async function updateAccount(
  id: string,
  input: AccountInput
): Promise<void> {
  await db.transaction(async (tx) => {
    await guardManagers(tx, { id, roles: input.roles })
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

/** Nonaktif: login ditolak (hook sesi) dan semua sesi yang ada dicabut. */
export async function setDisabled(
  id: string,
  disabled: boolean
): Promise<void> {
  await db.transaction(async (tx) => {
    if (disabled) await guardManagers(tx, { id, disabled: true })
    await tx
      .update(user)
      .set({ disabledAt: disabled ? new Date() : null })
      .where(eq(user.id, id))
    if (disabled) await tx.delete(session).where(eq(session.userId, id))
  })
}

export type AccountRow = {
  id: string
  username: string
  name: string
  roles: Role[]
  bidang: Bidang[]
  unitId: number | null
  disabled: boolean
  /** Sudah tertaut ke Simtama ID; belum = belum pernah masuk (akun manual). */
  sso: boolean
  createdAt: Date
}

export async function listAccounts(): Promise<AccountRow[]> {
  const [users, roles, logins] = await Promise.all([
    db.select().from(user).orderBy(asc(user.name)),
    db.select().from(userRole),
    db
      .select({ userId: account.userId })
      .from(account)
      .where(eq(account.providerId, "simtama")),
  ])
  const linked = new Set(logins.map((l) => l.userId))
  return users.map((u) => ({
    id: u.id,
    username: u.username ?? "",
    name: u.name,
    roles: roles.filter((r) => r.userId === u.id).map((r) => r.role as Role),
    bidang: parseBidang(u.bidang),
    unitId: u.unitId,
    disabled: u.disabledAt !== null,
    sso: linked.has(u.id),
    createdAt: u.createdAt,
  }))
}

export function parseBidang(value: string | null): Bidang[] {
  return (value ?? "")
    .split(",")
    .filter((b): b is Bidang => b === "it" || b === "media")
}
