// Mutasi media kartu (server-only): satu transaksi per aksi; storage disentuh di luar transaksi.
import { db } from "@workspace/db/client"
import { and, eq } from "@workspace/db/orm"
import { contentCard, contentCardMedia } from "@workspace/db/schema"
import { MAX_MEDIA_SIZE } from "@workspace/ui/lib/media-format"

import { UserError } from "@/lib/setting-crud"
import { presignUpload, readRange, removeObjects, statObject } from "@/lib/storage"

import { lockCard, type Actor, type Tx } from "./mutations"
import { canBeThumbnail, parseEmbed, toCardMedia } from "./media"
import {
  isSameIdSet,
  MAX_MEDIA_ITEMS,
  objectKeyFor,
  parseObjectKey,
  validateUploadFile,
} from "./media-rules"
import { canEditContent } from "./rules"
import { codecError, videoCodecOf } from "./video-codec"

export { MAX_MEDIA_ITEMS }

const LOCKED = "Isi kartu terkunci sejak tahap Review"
const FULL = `Maksimal ${MAX_MEDIA_ITEMS} item media per kartu`
const LOCKED_AFTER_UPLOAD = "Kartu sudah masuk Review; file tidak disimpan."
const NOT_UPLOADED = "Unggahan tidak ditemukan, coba lagi."

/** Kunci kartu, pastikan tahap DB masih bisa diubah. */
async function lockEditable(tx: Tx, cardId: number, actor: Actor, lockedMsg = LOCKED) {
  const card = await lockCard(tx, cardId)
  if (!canEditContent(actor.permissions, card.stage)) throw new UserError(lockedMsg)
  return card
}

async function nextPosition(tx: Tx, cardId: number): Promise<number> {
  const rows = await tx
    .select({ position: contentCardMedia.position })
    .from(contentCardMedia)
    .where(eq(contentCardMedia.cardId, cardId))
  if (rows.length >= MAX_MEDIA_ITEMS) throw new UserError(FULL)
  return Math.max(-1, ...rows.map((r) => r.position)) + 1
}

export async function startUpload(
  cardId: number,
  file: { name: string; size: number; mime: string },
  actor: Actor
): Promise<{ key: string; url: string; fields: Record<string, string> }> {
  const { mime } = validateUploadFile(file)
  await db.transaction(async (tx) => {
    await lockEditable(tx, cardId, actor)
    await nextPosition(tx, cardId)
  })
  const key = objectKeyFor(cardId, mime, crypto.randomUUID())
  const { url, fields } = await presignUpload(key, mime, MAX_MEDIA_SIZE)
  return { key, url, fields }
}

export async function finishUpload(
  cardId: number,
  key: string,
  originalName: string,
  actor: Actor
): Promise<void> {
  // Kunci milik kartu lain / tidak sah: tolak tanpa menyentuh objeknya.
  const parsed = parseObjectKey(cardId, key)
  if (!parsed) throw new UserError(NOT_UPLOADED)
  const stat = await statObject(key)
  if (!stat) throw new UserError(NOT_UPLOADED)

  const discard = async (message: string): Promise<never> => {
    await removeObjects([key]).catch((e) => console.error("removeObjects gagal", e))
    throw new UserError(message)
  }
  const name = originalName.trim().slice(0, 200) || "berkas"
  if (stat.size < 1 || stat.size > MAX_MEDIA_SIZE || stat.mime !== parsed.mime)
    return discard(`${name}: file tidak sesuai (format atau ukuran).`)
  const kind = parsed.mime.startsWith("video/") ? "video" : "image"
  if (kind === "video") {
    const err = codecError(name, await videoCodecOf((o, l) => readRange(key, o, l), stat.size))
    if (err) return discard(err)
  }

  try {
    await db.transaction(async (tx) => {
      await lockEditable(tx, cardId, actor, LOCKED_AFTER_UPLOAD)
      const position = await nextPosition(tx, cardId)
      await tx.insert(contentCardMedia).values({
        cardId,
        position,
        source: "file",
        objectKey: key,
        mediaKind: kind,
        mime: parsed.mime,
        size: stat.size,
        originalName: name,
        createdBy: actor.id,
      })
    })
  } catch (e) {
    // Jangan hapus objek yang sudah punya baris (finish ganda).
    const [owned] = await db
      .select({ id: contentCardMedia.id })
      .from(contentCardMedia)
      .where(eq(contentCardMedia.objectKey, key))
    if (!owned) await removeObjects([key]).catch((x) => console.error("removeObjects gagal", x))
    throw e
  }
}

export async function addEmbed(cardId: number, url: string, actor: Actor): Promise<void> {
  const e = parseEmbed(url)
  await db.transaction(async (tx) => {
    await lockEditable(tx, cardId, actor)
    const position = await nextPosition(tx, cardId)
    await tx.insert(contentCardMedia).values({
      cardId,
      position,
      source: "embed",
      url: e.url,
      provider: e.provider,
      providerRef: e.ref,
      createdBy: actor.id,
    })
  })
}

export async function reorderMedia(cardId: number, ids: number[], actor: Actor): Promise<void> {
  await db.transaction(async (tx) => {
    await lockEditable(tx, cardId, actor)
    const rows = await tx
      .select({ id: contentCardMedia.id })
      .from(contentCardMedia)
      .where(eq(contentCardMedia.cardId, cardId))
    if (!isSameIdSet(rows.map((r) => r.id), ids))
      throw new UserError("Urutan tidak cocok dengan media kartu, muat ulang.")
    for (const [position, id] of ids.entries())
      await tx.update(contentCardMedia).set({ position }).where(eq(contentCardMedia.id, id))
  })
}

async function ownedMedia(tx: Tx, cardId: number, mediaId: number) {
  const [row] = await tx
    .select()
    .from(contentCardMedia)
    .where(and(eq(contentCardMedia.id, mediaId), eq(contentCardMedia.cardId, cardId)))
  if (!row) throw new UserError("Media tidak ditemukan")
  return row
}

export async function removeMedia(cardId: number, mediaId: number, actor: Actor): Promise<void> {
  const objectKey = await db.transaction(async (tx) => {
    await lockEditable(tx, cardId, actor)
    const row = await ownedMedia(tx, cardId, mediaId)
    // Thumbnail yang ditunjuk dibersihkan eksplisit, tidak bergantung pada aksi FK.
    await tx
      .update(contentCard)
      .set({ thumbnailMediaId: null })
      .where(and(eq(contentCard.id, cardId), eq(contentCard.thumbnailMediaId, mediaId)))
    await tx.delete(contentCardMedia).where(eq(contentCardMedia.id, mediaId))
    return row.objectKey
  })
  if (objectKey)
    await removeObjects([objectKey]).catch((e) => console.error("removeObjects gagal", e))
}

export async function setThumbnail(
  cardId: number,
  mediaId: number | null,
  actor: Actor
): Promise<void> {
  await db.transaction(async (tx) => {
    await lockEditable(tx, cardId, actor)
    if (mediaId !== null) {
      const row = await ownedMedia(tx, cardId, mediaId)
      if (!canBeThumbnail(toCardMedia(row)))
        throw new UserError("Hanya foto atau video YouTube yang bisa jadi thumbnail")
    }
    await tx.update(contentCard).set({ thumbnailMediaId: mediaId }).where(eq(contentCard.id, cardId))
  })
}
