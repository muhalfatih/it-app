// Logika murni mutasi media (tanpa database/storage) supaya bisa dites tanpa DB.
import { MAX_MEDIA_SIZE, mediaKindOf, type MediaKind } from "@workspace/ui/lib/media-format"

import { UserError } from "@/lib/user-error"

export const MAX_MEDIA_ITEMS = 10

const EXT_OF: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
}
const MIME_OF: Record<string, string> = Object.fromEntries(
  Object.entries(EXT_OF).map(([m, e]) => [e, m])
)

export const extForMime = (mime: string): string | null => EXT_OF[mime] ?? null

/** MIME baku: dari klien bila dikenal, selain itu dari ekstensi nama file (MOV kadang tanpa MIME). */
export function normalizeMime(name: string, mime: string): string | null {
  if (EXT_OF[mime]) return mime
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase().replace("jpeg", "jpg")
  return (ext && MIME_OF[ext]) || null
}

/** Validasi file dari klien sebelum presign; kembalikan MIME baku dan jenisnya. */
export function validateUploadFile(file: { name: string; size: number; mime: string }): {
  mime: string
  kind: MediaKind
} {
  const kind = mediaKindOf({ name: file.name, type: file.mime })
  const mime = normalizeMime(file.name, file.mime)
  if (!kind || !mime) throw new UserError("Format file tidak didukung (JPG, PNG, WEBP, MP4, MOV)")
  if (!Number.isFinite(file.size) || file.size < 1) throw new UserError("File kosong")
  if (file.size > MAX_MEDIA_SIZE) throw new UserError("Ukuran file melebihi 500 MB")
  return { mime, kind }
}

export const objectKeyFor = (cardId: number, mime: string, uuid: string): string =>
  `cards/${cardId}/${uuid}.${extForMime(mime)}`

/** Kunci sah milik kartu ini → MIME dari ekstensinya; selain itu (kartu lain, `..`, ekstensi asing) null. */
export function parseObjectKey(cardId: number, key: string): { mime: string } | null {
  const m =
    /^cards\/(\d+)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|mp4|mov)$/.exec(
      key
    )
  return m && m[1] === String(cardId) ? { mime: MIME_OF[m[2]!]! } : null
}

/** ids harus persis himpunan media kartu: tanpa duplikat, tanpa kurang/lebih. */
export function isSameIdSet(current: number[], ids: number[]): boolean {
  return (
    ids.length === current.length &&
    new Set(ids).size === ids.length &&
    ids.every((i) => current.includes(i))
  )
}
