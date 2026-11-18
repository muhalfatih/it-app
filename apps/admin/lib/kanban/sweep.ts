// Penyapu objek yatim di MinIO (lihat spec "Penyapu yatim").
import { db } from "@workspace/db/client"
import { isNotNull } from "@workspace/db/orm"
import { contentCardMedia } from "@workspace/db/schema"

import { listObjects, removeObjects } from "@/lib/storage"

import { DAY_MS, pickOrphans } from "./pick-orphans"

export async function sweepOrphans(
  now: Date,
  olderThanMs = DAY_MS
): Promise<{ removed: string[] }> {
  const objects: { key: string; lastModified: Date }[] = []
  for await (const o of listObjects("cards/")) objects.push(o)
  // Daftar kunci diambil setelah listing; objek baru yang baru di-finish aman karena batas umur.
  const rows = await db
    .select({ key: contentCardMedia.objectKey })
    .from(contentCardMedia)
    .where(isNotNull(contentCardMedia.objectKey))
  const known = new Set(rows.map((r) => r.key as string))
  const removed = pickOrphans(objects, known, now, olderThanMs)
  await removeObjects(removed)
  return { removed }
}
