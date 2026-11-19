// Lampiran rundown pengajuan SDM (server-only; satu-satunya yang bicara storage untuk `requests/`).
import { db } from "@workspace/db/client"
import { isNotNull } from "@workspace/db/orm"
import { serviceRequest } from "@workspace/db/schema"

import { pickOrphans } from "@/lib/kanban/pick-orphans"
import { listObjects, presignUpload, removeObjects, statObject } from "@/lib/storage"
import { UserError } from "@/lib/user-error"

export const RUNDOWN_MAX = 10 * 1024 * 1024

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
}
export const RUNDOWN_MIMES = Object.keys(EXT_BY_MIME)

const MIME_BY_EXT = Object.fromEntries(Object.entries(EXT_BY_MIME).map(([m, e]) => [e, m]))
const KEY_RE = /^requests\/[0-9a-f-]{36}\.(pdf|jpg|png|webp|doc|docx|xls|xlsx)$/

export function rundownKeyFor(mime: string, uuid: string): string {
  return `requests/${uuid}.${EXT_BY_MIME[mime]}`
}

export function parseRundownKey(key: string): { mime: string } | null {
  const m = KEY_RE.exec(key)
  return m ? { mime: MIME_BY_EXT[m[1]!]! } : null
}

export async function startRundownUpload(file: {
  name: string
  size: number
  mime: string
}): Promise<{ key: string; url: string; fields: Record<string, string> }> {
  if (!RUNDOWN_MIMES.includes(file.mime))
    throw new UserError("Format berkas tidak didukung (PDF, gambar, Word, atau Excel)")
  if (!(file.size > 0) || file.size > RUNDOWN_MAX)
    throw new UserError("Ukuran berkas maksimal 10 MB")
  const key = rundownKeyFor(file.mime, crypto.randomUUID())
  const { url, fields } = await presignUpload(key, file.mime, RUNDOWN_MAX)
  return { key, url, fields }
}

const NOT_UPLOADED = "Berkas rundown belum terunggah, coba unggah ulang"

/** Memeriksa objek di storage; mime/ukuran diambil dari sana, bukan dari klien. */
export async function verifyRundown(key: string): Promise<{ mime: string; size: number }> {
  const parsed = parseRundownKey(key)
  if (!parsed) throw new UserError(NOT_UPLOADED)
  const stat = await statObject(key)
  if (!stat) throw new UserError(NOT_UPLOADED)
  if (stat.size < 1 || stat.size > RUNDOWN_MAX) throw new UserError("Ukuran berkas maksimal 10 MB")
  if (stat.mime !== parsed.mime) throw new UserError("Jenis berkas tidak sesuai")
  return { mime: parsed.mime, size: stat.size }
}

export async function sweepRundowns(now: Date): Promise<{ removed: string[] }> {
  const objects: { key: string; lastModified: Date }[] = []
  for await (const o of listObjects("requests/")) objects.push(o)
  const rows = await db
    .select({ key: serviceRequest.rundownKey })
    .from(serviceRequest)
    .where(isNotNull(serviceRequest.rundownKey))
  const removed = pickOrphans(objects, new Set(rows.map((r) => r.key as string)), now)
  await removeObjects(removed)
  return { removed }
}
