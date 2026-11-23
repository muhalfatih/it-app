// Modul murni: keputusan akses (dipakai guard halaman, pembungkus aksi server, dan tes).
import type { Role } from "@workspace/db/schema/roles"

import { can, type Permission } from "./permissions"

export type Viewer = {
  roles: readonly Role[]
  disabled: boolean
} | null

export type Decision = "ok" | "unauthenticated" | "forbidden"

export function authorize(viewer: Viewer, permission?: Permission): Decision {
  if (!viewer || viewer.disabled) return "unauthenticated"
  if (permission && !can(viewer.roles, permission)) return "forbidden"
  return "ok"
}

/**
 * Bungkus aksi server: periksa izin sebelum `fn` dijalankan. Penolakan dikembalikan sebagai
 * `{ error }` (bukan exception) agar form bisa menampilkannya.
 */
export function withPermissionUsing<A extends unknown[], R>(
  getViewer: () => Promise<Viewer>,
  permission: Permission,
  fn: (...args: A) => Promise<R>
): (...args: A) => Promise<R | { error: string }> {
  return async (...args: A) => {
    const decision = authorize(await getViewer(), permission)
    if (decision !== "ok") return { error: "Tidak diizinkan" }
    return fn(...args)
  }
}
