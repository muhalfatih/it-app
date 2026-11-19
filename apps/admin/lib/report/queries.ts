// Query laporan harian (server-only).
import { db } from "@workspace/db/client"
import { and, asc, eq, inArray, isNull } from "@workspace/db/orm"
import { user, userRole } from "@workspace/db/schema"

/** Staf pelapor: akun aktif berperan manajer/sdm_strategi/sdm_khusus (izin laporan.isi). */
export async function listReporters(): Promise<
  { id: string; name: string; createdAt: Date }[]
> {
  return db
    .selectDistinct({ id: user.id, name: user.name, createdAt: user.createdAt })
    .from(user)
    .innerJoin(userRole, eq(userRole.userId, user.id))
    .where(
      and(
        isNull(user.disabledAt),
        inArray(userRole.role, ["manajer", "sdm_strategi", "sdm_khusus"])
      )
    )
    .orderBy(asc(user.name))
}
