// Modul murni: aturan penerima notifikasi (dipakai notify di send.ts).
import type { Role } from "@workspace/db/schema/roles"

/** Penerima: orang tertentu dan/atau semua pemegang peran; `except` = aktor (tidak memberi tahu diri sendiri). */
export type Audience = {
  userIds?: (string | null | undefined)[]
  roles?: Role[]
  except?: string
}

/** Buang akun nonaktif, aktor, dan duplikat (akun multi-peran muncul sekali per peran). */
export function pickRecipients(
  users: { id: string; disabledAt: Date | null }[],
  except?: string
): string[] {
  return [
    ...new Set(
      users.filter((u) => u.disabledAt === null && u.id !== except).map((u) => u.id)
    ),
  ]
}
