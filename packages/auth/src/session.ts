// Server-only: sesi pengguna saat ini dan guard untuk halaman serta aksi server.
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { db } from "@workspace/db/client"
import { and, eq } from "@workspace/db/orm"
import { account, userRole } from "@workspace/db/schema"
import type { Bidang, Role } from "@workspace/db/schema/roles"

import { parseBidang } from "./accounts"
import { authorize, withPermissionUsing, type Viewer } from "./authorize"
import { permissionsFor, type Permission } from "./permissions"
import { auth } from "./server"

export type CurrentUser = {
  id: string
  username: string
  name: string
  roles: Role[]
  permissions: Set<Permission>
  bidang: Bidang[]
  unitId: number | null
  mustChangePassword: boolean
  /** Punya kata sandi lokal; akun dari direktori Simtama hanya masuk lewat SSO. */
  hasPassword: boolean
  disabled: boolean
}

/** Sesi + peran dari database; null bila tidak ada sesi. Akun nonaktif dikembalikan dengan `disabled`. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const result = await auth.api.getSession({ headers: await headers() })
  if (!result) return null
  const u = result.user
  const [roleRows, credential] = await Promise.all([
    db
      .select({ role: userRole.role })
      .from(userRole)
      .where(eq(userRole.userId, u.id)),
    db
      .select({ id: account.id })
      .from(account)
      .where(
        and(eq(account.userId, u.id), eq(account.providerId, "credential"))
      )
      .limit(1),
  ])
  const roles = roleRows.map((r) => r.role as Role)
  return {
    id: u.id,
    username: u.username ?? "",
    name: u.name,
    roles,
    permissions: permissionsFor(roles),
    bidang: parseBidang(u.bidang ?? null),
    unitId: u.unitId ?? null,
    mustChangePassword: u.mustChangePassword ?? false,
    hasPassword: credential.length > 0,
    disabled: u.disabledAt != null,
  }
}

async function currentViewer(): Promise<Viewer> {
  return getCurrentUser()
}

/** Wajib login. Akun yang wajib ganti kata sandi diarahkan ke /ganti-kata-sandi kecuali `allowPasswordChange`. */
export async function requireUser(
  opts: { allowPasswordChange?: boolean } = {}
): Promise<CurrentUser> {
  const user = await getCurrentUser()
  const decision = authorize(user, undefined, opts)
  if (decision === "unauthenticated") redirect("/masuk")
  if (decision === "must_change_password") redirect("/ganti-kata-sandi")
  return user!
}

/** Wajib login dan punya izin; tanpa izin diarahkan ke beranda dengan tanda akses ditolak. */
export async function requirePermission(
  permission: Permission
): Promise<CurrentUser> {
  const user = await requireUser()
  if (authorize(user, permission) === "forbidden") redirect("/?akses=ditolak")
  return user
}

/** Pembungkus aksi server: tanpa izin, aksi tidak dijalankan dan mengembalikan `{ error }`. */
export function withPermission<A extends unknown[], R>(
  permission: Permission,
  fn: (...args: A) => Promise<R>
) {
  return withPermissionUsing(currentViewer, permission, fn)
}
