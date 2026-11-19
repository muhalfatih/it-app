// Format media yang diterima (tanpa "use client"/React): dipakai klien dan kode server.
export type MediaKind = "image" | "video"

/** Batas dari rancangan Kanban putaran 2: JPG, PNG, WEBP, MP4, MOV, 500 MB per file. */
export const MAX_MEDIA_SIZE = 500 * 1024 * 1024
export const ACCEPT = ".jpg,.jpeg,.png,.webp,.mp4,.mov"

/** Menentukan jenis dari MIME, lalu dari ekstensi (MOV kadang tanpa MIME). Null bila tidak didukung. File memenuhi bentuk ini. */
export function mediaKindOf(file: { name: string; type: string }): MediaKind | null {
  if (["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "image"
  if (["video/mp4", "video/quicktime"].includes(file.type)) return "video"
  if (/\.(jpe?g|png|webp)$/i.test(file.name)) return "image"
  if (/\.(mp4|mov)$/i.test(file.name)) return "video"
  return null
}
