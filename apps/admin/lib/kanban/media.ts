import { UserError } from "@/lib/user-error"

import type { CardMedia, EmbedProvider } from "./types"

const YT_HOSTS = new Set(["youtu.be", "youtube.com", "www.youtube.com", "m.youtube.com"])
const YT_ID = /^[\w-]{11}$/
const DRIVE_ID = /^[\w-]+$/

/** Host dicocokkan persis (bukan sufiks) supaya `drive.google.com.evil.com` jatuh ke `tautan`. */
export function parseEmbed(input: string): { provider: EmbedProvider; ref: string | null; url: string } {
  let u: URL
  try {
    u = new URL(input.trim())
  } catch {
    throw new UserError("Tautan tidak valid")
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new UserError("Tautan tidak valid")
  const url = u.toString()

  if (YT_HOSTS.has(u.hostname)) {
    const seg = u.pathname.split("/").filter(Boolean)
    const id =
      u.hostname === "youtu.be"
        ? seg[0]
        : seg[0] === "watch"
          ? u.searchParams.get("v")
          : ["shorts", "live", "embed"].includes(seg[0] ?? "")
            ? seg[1]
            : null
    if (id && YT_ID.test(id)) return { provider: "youtube", ref: id, url }
  }

  if (u.hostname === "drive.google.com") {
    const seg = u.pathname.split("/").filter(Boolean)
    const id = seg[0] === "file" && seg[1] === "d" ? seg[2] : u.pathname === "/open" ? u.searchParams.get("id") : null
    if (id && DRIVE_ID.test(id)) return { provider: "drive", ref: id, url }
  }

  return { provider: "tautan", ref: null, url }
}

type EmbedRef = { provider: EmbedProvider; ref: string | null }

export function embedSrc(m: EmbedRef): string | null {
  if (!m.ref) return null
  if (m.provider === "youtube") return `https://www.youtube-nocookie.com/embed/${m.ref}`
  if (m.provider === "drive") return `https://drive.google.com/file/d/${m.ref}/preview`
  return null
}

export function embedThumb(m: EmbedRef): string | null {
  return m.provider === "youtube" && m.ref ? `https://i.ytimg.com/vi/${m.ref}/hqdefault.jpg` : null
}

export const mediaSrc = (id: number): string => `/api/media/${id}`

export function canBeThumbnail(m: CardMedia): boolean {
  return m.source === "file" ? m.mediaKind === "image" : m.provider === "youtube"
}

function thumbOf(m: CardMedia): string | null {
  return m.source === "file" ? mediaSrc(m.id) : embedThumb(m)
}

export function effectiveThumbnail(media: CardMedia[], thumbnailMediaId: number | null): string | null {
  const chosen = media.find((m) => m.id === thumbnailMediaId && canBeThumbnail(m))
  if (chosen) return thumbOf(chosen)
  const sorted = [...media].sort((a, b) => a.position - b.position)
  const photo = sorted.find((m) => m.source === "file" && m.mediaKind === "image")
  if (photo) return thumbOf(photo)
  const yt = sorted.find((m) => m.source === "embed" && m.provider === "youtube")
  return yt ? thumbOf(yt) : null
}
