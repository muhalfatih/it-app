// Aturan murni Kanban (tanpa db/next): dipakai papan, halaman kartu, dan server (spesifikasi §6.2–6.5).
import { z } from "zod"

import type { Permission } from "@workspace/auth/permissions"
import type { ContentStage } from "@workspace/db/schema/stages"

export type MoveTargets = { forward?: ContentStage; back?: ContentStage }

type Step = { to: ContentStage; permission: Permission }

/** Maju dan kembali per tahap. Kembali = pemegang izin yang memajukan kartu ke tahap sekarang. */
const FLOW: Record<ContentStage, { forward?: Step; back?: Step }> = {
  ide: { forward: { to: "draft", permission: "kanban.ide_ke_draft" } },
  draft: {
    forward: { to: "review", permission: "kanban.draft_ke_review" },
    back: { to: "ide", permission: "kanban.ide_ke_draft" },
  },
  review: {
    forward: { to: "disetujui", permission: "kanban.review_ke_disetujui" },
    back: { to: "draft", permission: "kanban.draft_ke_review" },
  },
  // Maju ke Telah Tayang otomatis lewat centang; kembali hanya bila belum ada centang.
  disetujui: { back: { to: "review", permission: "kanban.review_ke_disetujui" } },
  // Kembali dari Telah Tayang hanya lewat batal centang.
  tayang: {},
}

export function allowedMoves(
  perms: ReadonlySet<Permission>,
  stage: ContentStage,
  publishedCount: number
): MoveTargets {
  const { forward, back } = FLOW[stage]
  const result: MoveTargets = {}
  if (forward && perms.has(forward.permission)) result.forward = forward.to
  if (
    back &&
    perms.has(back.permission) &&
    !(stage === "disetujui" && publishedCount > 0)
  )
    result.back = back.to
  return result
}

export function canEditContent(
  perms: ReadonlySet<Permission>,
  stage: ContentStage
): boolean {
  return perms.has("kanban.isi") && (stage === "ide" || stage === "draft")
}

export function canCheck(
  perms: ReadonlySet<Permission>,
  stage: ContentStage
): boolean {
  return perms.has("kanban.tayang") && stage === "disetujui"
}

export function canUncheck(
  perms: ReadonlySet<Permission>,
  stage: ContentStage
): boolean {
  return (
    perms.has("kanban.batal_tayang") &&
    (stage === "disetujui" || stage === "tayang")
  )
}

/** Semua kanal entri sudah dicentang (entri tanpa kanal tidak pernah dianggap tayang). */
export function isFullyPublished(
  channelIds: number[],
  publishedIds: number[]
): boolean {
  const done = new Set(publishedIds)
  return channelIds.length > 0 && channelIds.every((id) => done.has(id))
}

/** null bila link boleh dipakai; link dirender sebagai <a>, jadi hanya http(s). */
export function publishUrlError(
  requiresLink: boolean,
  url: string | null
): string | null {
  const value = url?.trim() ?? ""
  if (!value) return requiresLink ? "Link postingan wajib diisi" : null
  try {
    const { protocol } = new URL(value)
    if (protocol === "http:" || protocol === "https:") return null
  } catch {
    // jatuh ke pesan di bawah
  }
  return "Link harus diawali http:// atau https://"
}

const text = (required: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, { message: required })
    .max(max, { message: `Maksimal ${max} karakter` })

export const noteSchema = text("Catatan wajib diisi", 2000)
export const reasonSchema = text("Alasan wajib diisi", 2000)
export const commentSchema = text("Komentar wajib diisi", 2000)
export const captionSchema = z
  .string()
  .trim()
  .max(5000, { message: "Maksimal 5000 karakter" })

const WIB = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

/** "12 Nov 14.20" dalam WIB. */
export function formatWib(d: Date): string {
  const p = Object.fromEntries(WIB.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.day} ${p.month} ${p.hour}.${p.minute}`
}
