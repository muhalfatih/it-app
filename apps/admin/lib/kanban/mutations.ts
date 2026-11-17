// Mutasi Kanban (server-only): satu transaksi per aksi, aturan diperiksa terhadap tahap di database.
import type { z } from "zod"

import type { Permission } from "@workspace/auth/permissions"
import { db } from "@workspace/db/client"
import { and, eq } from "@workspace/db/orm"
import {
  channel,
  contentCard,
  contentCardComment,
  contentCardEvent,
  contentCardPublication,
  plannerEntryChannel,
} from "@workspace/db/schema"
import type { CardEventKind, ContentStage } from "@workspace/db/schema/stages"

import { UserError } from "@/lib/setting-crud"

import {
  allowedMoves,
  canCheck,
  canEditContent,
  canUncheck,
  captionSchema,
  commentSchema,
  isFullyPublished,
  noteSchema,
  publishUrlError,
} from "./rules"

export type Actor = { id: string; permissions: ReadonlySet<Permission> }
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

const NOT_FOUND = "Kartu tidak ditemukan"
const FORBIDDEN_MOVE = "Anda tidak berwenang memindahkan kartu ini"
const FORBIDDEN = "Anda tidak berwenang mengubah kartu ini"

/** id dari klien: di luar rentang int4 sama saja dengan tidak ada. */
const validId = (id: number) =>
  Number.isInteger(id) && id >= 1 && id <= 2_147_483_647

/** Pesan zod pertama sebagai UserError, supaya tampil apa adanya di UI. */
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value)
  if (!r.success) throw new UserError(r.error.issues[0]?.message ?? "Isian tidak valid")
  return r.data
}

/** Kunci baris kartu sampai transaksi selesai. */
async function lockCard(tx: Tx, cardId: number) {
  if (!validId(cardId)) throw new UserError(NOT_FOUND)
  const [row] = await tx
    .select({ id: contentCard.id, stage: contentCard.stage, entryId: contentCard.entryId })
    .from(contentCard)
    .where(eq(contentCard.id, cardId))
    .for("update")
  if (!row) throw new UserError(NOT_FOUND)
  return { ...row, stage: row.stage as ContentStage }
}

type EventValues = {
  kind: CardEventKind
  fromStage?: ContentStage
  toStage?: ContentStage
  channelId?: number
  note?: string
}
const logEvent = (tx: Tx, cardId: number, actorId: string, e: EventValues) =>
  tx.insert(contentCardEvent).values({ cardId, actorId, ...e })

async function setStage(tx: Tx, cardId: number, stage: ContentStage) {
  await tx
    .update(contentCard)
    .set({ stage, stageChangedAt: new Date() })
    .where(eq(contentCard.id, cardId))
}

const publishedIds = async (tx: Tx, cardId: number) =>
  (
    await tx
      .select({ channelId: contentCardPublication.channelId })
      .from(contentCardPublication)
      .where(eq(contentCardPublication.cardId, cardId))
  ).map((r) => r.channelId)

export async function moveCard(
  cardId: number,
  from: ContentStage,
  to: ContentStage,
  actor: Actor,
  note?: string
): Promise<void> {
  await db.transaction(async (tx) => {
    const card = await lockCard(tx, cardId)
    if (card.stage !== from)
      throw new UserError("Kartu sudah dipindah orang lain, muat ulang.")
    const targets = allowedMoves(
      actor.permissions,
      card.stage,
      (await publishedIds(tx, cardId)).length
    )
    if (to === targets.forward) {
      await setStage(tx, cardId, to)
      await logEvent(tx, cardId, actor.id, { kind: "maju", fromStage: from, toStage: to })
    } else if (to === targets.back) {
      const text = parse(noteSchema, note ?? "")
      await setStage(tx, cardId, to)
      await logEvent(tx, cardId, actor.id, { kind: "kembali", fromStage: from, toStage: to, note: text })
    } else throw new UserError(FORBIDDEN_MOVE)
  })
}

export async function saveCaption(
  cardId: number,
  caption: string,
  actor: Actor
): Promise<void> {
  await db.transaction(async (tx) => {
    const card = await lockCard(tx, cardId)
    if (!canEditContent(actor.permissions, card.stage))
      throw new UserError("Isi kartu terkunci sejak tahap Review")
    const text = parse(captionSchema, caption)
    await tx
      .update(contentCard)
      .set({ caption: text || null })
      .where(eq(contentCard.id, cardId))
  })
}

export async function checkChannel(
  cardId: number,
  channelId: number,
  url: string | null,
  actor: Actor
): Promise<{ stage: ContentStage }> {
  return db.transaction(async (tx) => {
    const card = await lockCard(tx, cardId)
    if (!canCheck(actor.permissions, card.stage))
      throw new UserError("Kanal hanya bisa dicentang di tahap Disetujui")
    const channels = await tx
      .select({ id: channel.id, requiresLink: channel.requiresLink })
      .from(plannerEntryChannel)
      .innerJoin(channel, eq(channel.id, plannerEntryChannel.channelId))
      .where(eq(plannerEntryChannel.entryId, card.entryId))
    const target = channels.find((c) => c.id === channelId)
    if (!target) throw new UserError("Kanal tidak valid")
    const urlError = publishUrlError(target.requiresLink, url)
    if (urlError) throw new UserError(urlError)
    const done = await publishedIds(tx, cardId)
    if (done.includes(channelId)) throw new UserError("Kanal sudah dicentang")

    await tx.insert(contentCardPublication).values({
      cardId,
      channelId,
      url: url?.trim() || null,
      checkedBy: actor.id,
    })
    await logEvent(tx, cardId, actor.id, { kind: "centang", channelId })
    if (!isFullyPublished(channels.map((c) => c.id), [...done, channelId]))
      return { stage: card.stage }
    await setStage(tx, cardId, "tayang")
    await logEvent(tx, cardId, actor.id, {
      kind: "otomatis",
      fromStage: "disetujui",
      toStage: "tayang",
      note: "Semua kanal tercentang",
    })
    return { stage: "tayang" as const }
  })
}

export async function uncheckChannel(
  cardId: number,
  channelId: number,
  reason: string,
  actor: Actor
): Promise<{ stage: ContentStage }> {
  return db.transaction(async (tx) => {
    const card = await lockCard(tx, cardId)
    if (!canUncheck(actor.permissions, card.stage))
      throw new UserError("Anda tidak berwenang membatalkan centang")
    const note = parse(noteSchema, reason)
    if (!validId(channelId) || !(await publishedIds(tx, cardId)).includes(channelId))
      throw new UserError("Kanal belum dicentang")

    await tx
      .delete(contentCardPublication)
      .where(
        and(
          eq(contentCardPublication.cardId, cardId),
          eq(contentCardPublication.channelId, channelId)
        )
      )
    await logEvent(tx, cardId, actor.id, { kind: "batal_centang", channelId, note })
    if (card.stage !== "tayang") return { stage: card.stage }
    await setStage(tx, cardId, "disetujui")
    await logEvent(tx, cardId, actor.id, {
      kind: "otomatis",
      fromStage: "tayang",
      toStage: "disetujui",
      note: "Centang kanal dibatalkan",
    })
    return { stage: "disetujui" as const }
  })
}

export async function addComment(
  cardId: number,
  body: string,
  actor: Actor
): Promise<void> {
  if (!actor.permissions.has("kanban.lihat")) throw new UserError(FORBIDDEN)
  const text = parse(commentSchema, body)
  await db.transaction(async (tx) => {
    await lockCard(tx, cardId)
    await tx
      .insert(contentCardComment)
      .values({ cardId, authorId: actor.id, body: text })
  })
}
