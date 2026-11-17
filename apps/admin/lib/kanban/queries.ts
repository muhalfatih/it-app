// Query Kanban (server-only).
import { db } from "@workspace/db/client"
import { asc, count, eq, inArray, sql } from "@workspace/db/orm"
import {
  contentCard,
  contentCardPublication,
  plannerEntry,
} from "@workspace/db/schema"

import { hydrate } from "@/lib/planner/queries"
import type { PlannerEntry } from "@/lib/planner/types"

import type { BoardCard } from "./types"

const assigneesOf = (entry: PlannerEntry) => [
  ...new Map(
    entry.assignments.map((a) => [a.userId, { id: a.userId, name: a.userName }])
  ).values(),
]

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
