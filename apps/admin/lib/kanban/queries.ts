// Query Kanban (server-only).
import { db } from "@workspace/db/client"
import { alias, and, asc, count, desc, eq, inArray, sql } from "@workspace/db/orm"
import {
  channel,
  contentCard,
  contentCardComment,
  contentCardEvent,
  contentCardPublication,
  plannerEntry,
  plannerEntryChannel,
  user,
} from "@workspace/db/schema"
import type { ContentStage } from "@workspace/db/schema/stages"

import { hydrate } from "@/lib/planner/queries"
import type { PlannerEntry } from "@/lib/planner/types"

import type { BoardCard, CardDetail, CardEvent } from "./types"

const assigneesOf = (entry: PlannerEntry) => [
  ...new Map(
    entry.assignments.map((a) => [a.userId, { id: a.userId, name: a.userName }])
  ).values(),
]

/** Detail kartu untuk /konten/[id]; null bila tidak ada. */
export async function getCard(id: number): Promise<CardDetail | null> {
  const [row] = await db
    .select({ entry: plannerEntry, card: contentCard })
    .from(contentCard)
    .innerJoin(plannerEntry, eq(plannerEntry.id, contentCard.entryId))
    .where(eq(contentCard.id, id))
  if (!row) return null

  const checker = alias(user, "checker")
  const [[entry], channels, events, comments] = await Promise.all([
    hydrate([row.entry]),
    db
      .select({
        id: channel.id,
        name: channel.name,
        requiresLink: channel.requiresLink,
        url: contentCardPublication.url,
        checkedByName: checker.name,
        checkedAt: contentCardPublication.checkedAt,
      })
      .from(plannerEntryChannel)
      .innerJoin(channel, eq(channel.id, plannerEntryChannel.channelId))
      .leftJoin(
        contentCardPublication,
        and(
          eq(contentCardPublication.cardId, id),
          eq(contentCardPublication.channelId, channel.id)
        )
      )
      .leftJoin(checker, eq(checker.id, contentCardPublication.checkedBy))
      .where(eq(plannerEntryChannel.entryId, row.entry.id))
      .orderBy(asc(channel.name)),
    db
      .select({
        id: contentCardEvent.id,
        kind: contentCardEvent.kind,
        fromStage: contentCardEvent.fromStage,
        toStage: contentCardEvent.toStage,
        channelName: channel.name,
        note: contentCardEvent.note,
        actorName: user.name,
        createdAt: contentCardEvent.createdAt,
      })
      .from(contentCardEvent)
      .innerJoin(user, eq(user.id, contentCardEvent.actorId))
      .leftJoin(channel, eq(channel.id, contentCardEvent.channelId))
      .where(eq(contentCardEvent.cardId, id))
      // Satu transaksi bisa mencatat beberapa event dengan waktu sama; id menjaga urutan.
      .orderBy(desc(contentCardEvent.id)),
    db
      .select({
        id: contentCardComment.id,
        authorName: user.name,
        body: contentCardComment.body,
        createdAt: contentCardComment.createdAt,
      })
      .from(contentCardComment)
      .innerJoin(user, eq(user.id, contentCardComment.authorId))
      .where(eq(contentCardComment.cardId, id))
      .orderBy(asc(contentCardComment.id)),
  ])

  const stage = row.card.stage as ContentStage
  const typedEvents = events as CardEvent[]
  const lastMove = typedEvents.find((e) => e.kind === "maju" || e.kind === "kembali")
  const { start, end } = { start: row.entry.activityStart, end: row.entry.activityEnd }
  return {
    id: row.card.id,
    entryId: row.entry.id,
    stage,
    name: row.entry.name,
    publishDate: row.entry.publishDate,
    assignees: assigneesOf(entry!),
    publishedCount: channels.filter((c) => c.checkedAt !== null).length,
    caption: row.card.caption,
    activity: start && end ? { start, end } : null,
    assignments: entry!.assignments.map((a) => ({
      personName: a.userName,
      taskTypeName: a.taskTypeName,
      start: a.start,
      end: a.end,
    })),
    channels: channels.map((c) => ({
      id: c.id,
      name: c.name,
      requiresLink: c.requiresLink,
      publication:
        c.checkedAt === null
          ? null
          : { url: c.url, checkedByName: c.checkedByName ?? "", checkedAt: c.checkedAt },
    })),
    events: typedEvents,
    comments,
    lastReturnNote:
      lastMove?.kind === "kembali" && lastMove.toStage === stage
        ? lastMove.note
        : null,
  }
}

/** Kartu papan; Telah Tayang hanya 30 hari terakhir kecuali allPublished. Urut tanggal tayang, lalu nama. */
export async function listBoard(opts: {
  allPublished: boolean
}): Promise<BoardCard[]> {
  const rows = await db
    .select({ entry: plannerEntry, cardId: contentCard.id })
    .from(contentCard)
    .innerJoin(plannerEntry, eq(plannerEntry.id, contentCard.entryId))
    .where(
      opts.allPublished
        ? undefined
        : sql`${contentCard.stage} <> 'tayang' or ${contentCard.stageChangedAt} >= now() - interval '30 days'`
    )
    .orderBy(asc(plannerEntry.publishDate), asc(plannerEntry.name))
  if (rows.length === 0) return []

  const cardIds = rows.map((r) => r.cardId)
  const [entries, published] = await Promise.all([
    hydrate(rows.map((r) => r.entry)),
    db
      .select({ cardId: contentCardPublication.cardId, n: count() })
      .from(contentCardPublication)
      .where(inArray(contentCardPublication.cardId, cardIds))
      .groupBy(contentCardPublication.cardId),
  ])
  const publishedBy = new Map(published.map((p) => [p.cardId, p.n]))
  return rows.map((r, i) => {
    const entry = entries[i]!
    return {
      id: r.cardId,
      entryId: entry.id,
      stage: entry.stage,
      name: entry.name,
      publishDate: entry.publishDate,
      channels: entry.channels,
      assignees: assigneesOf(entry),
      publishedCount: publishedBy.get(r.cardId) ?? 0,
    }
  })
}
