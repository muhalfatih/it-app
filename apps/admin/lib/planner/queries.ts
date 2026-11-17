// Query Planner (server-only). Filter periode SQL = aturan inPeriod di rules.ts.
import { db } from "@workspace/db/client"
import { asc, eq, inArray, ne, sql } from "@workspace/db/orm"
import {
  channel,
  contentCard,
  plannerAssignment,
  plannerEntry,
  plannerEntryChannel,
  taskType,
  user,
  userRole,
} from "@workspace/db/schema"
import type { ContentStage } from "@workspace/db/schema/stages"

import type { Option } from "@workspace/ui/components/domain/assignment-rows"

import type { Period, PlannerEntry, StaffMember } from "./types"

type EntryRow = typeof plannerEntry.$inferSelect

/** Muat penugasan, kanal, dan tahap untuk entri-entri ini (3 query). */
export async function hydrate(rows: EntryRow[]): Promise<PlannerEntry[]> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const [assignments, channels, cards] = await Promise.all([
    db
      .select({
        id: plannerAssignment.id,
        entryId: plannerAssignment.entryId,
        userId: plannerAssignment.userId,
        userName: user.name,
        taskTypeId: plannerAssignment.taskTypeId,
        taskTypeName: taskType.name,
        start: plannerAssignment.startDate,
        end: plannerAssignment.endDate,
      })
      .from(plannerAssignment)
      .innerJoin(user, eq(user.id, plannerAssignment.userId))
      .innerJoin(taskType, eq(taskType.id, plannerAssignment.taskTypeId))
      .where(inArray(plannerAssignment.entryId, ids))
      .orderBy(asc(plannerAssignment.startDate), asc(plannerAssignment.id)),
    db
      .select({
        entryId: plannerEntryChannel.entryId,
        id: channel.id,
        name: channel.name,
      })
      .from(plannerEntryChannel)
      .innerJoin(channel, eq(channel.id, plannerEntryChannel.channelId))
      .where(inArray(plannerEntryChannel.entryId, ids))
      .orderBy(asc(channel.name)),
    db
      .select({ entryId: contentCard.entryId, stage: contentCard.stage })
      .from(contentCard)
      .where(inArray(contentCard.entryId, ids)),
  ])
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    activityStart: r.activityStart,
    activityEnd: r.activityEnd,
    publishDate: r.publishDate,
    updatedAt: r.updatedAt.toISOString(),
    stage: (cards.find((c) => c.entryId === r.id)?.stage ?? "ide") as ContentStage,
    assignments: assignments
      .filter((a) => a.entryId === r.id)
      .map(({ entryId: _entryId, ...a }) => a),
    channels: channels
      .filter((c) => c.entryId === r.id)
      .map(({ entryId: _entryId, ...c }) => c),
  }))
}

export async function listEntriesInPeriod(
  period: Period
): Promise<PlannerEntry[]> {
  const { start, end } = period
  const rows = await db
    .select()
    .from(plannerEntry)
    .where(
      sql`(${plannerEntry.activityStart} <= ${end} and ${plannerEntry.activityEnd} >= ${start})
        or exists (
          select 1 from ${plannerAssignment} pa
          where pa.entry_id = ${plannerEntry.id}
            and pa.start_date <= ${end} and pa.end_date >= ${start}
        )
        or (${plannerEntry.publishDate} >= ${start} and ${plannerEntry.publishDate} <= ${end})`
    )
  return hydrate(rows)
}

export async function getEntry(id: number): Promise<PlannerEntry | null> {
  const rows = await db
    .select()
    .from(plannerEntry)
    .where(eq(plannerEntry.id, id))
  return (await hydrate(rows))[0] ?? null
}

/** Staf unit = akun dengan minimal satu peran selain direktur. */
export async function listStaff(): Promise<StaffMember[]> {
  const rows = await db
    .selectDistinct({
      id: user.id,
      name: user.name,
      disabledAt: user.disabledAt,
    })
    .from(user)
    .innerJoin(userRole, eq(userRole.userId, user.id))
    .where(ne(userRole.role, "direktur"))
    .orderBy(asc(user.name))
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    disabled: r.disabledAt !== null,
  }))
}

type ActiveOption = Option & { active: boolean }

export async function listFormOptions(): Promise<{
  people: ActiveOption[]
  taskTypes: ActiveOption[]
  channels: { id: number; name: string; active: boolean }[]
}> {
  const [staff, types, channels] = await Promise.all([
    listStaff(),
    db.select().from(taskType).orderBy(asc(taskType.name)),
    db.select().from(channel).orderBy(asc(channel.name)),
  ])
  return {
    people: staff.map((s) => ({
      value: s.id,
      label: s.name,
      active: !s.disabled,
    })),
    taskTypes: types.map((t) => ({
      value: String(t.id),
      label: t.name,
      active: t.active,
    })),
    channels: channels.map((c) => ({
      id: c.id,
      name: c.name,
      active: c.active,
    })),
  }
}

/** Pilihan formulir: hanya yang aktif, ditambah nilai yang sudah dipakai entri ini. */
export async function loadFormOptions(entry?: PlannerEntry) {
  const o = await listFormOptions()
  const usedPeople = new Set(entry?.assignments.map((a) => a.userId))
  const usedTypes = new Set(entry?.assignments.map((a) => String(a.taskTypeId)))
  const usedChannels = new Set(entry?.channels.map((c) => c.id))
  return {
    people: o.people
      .filter((p) => p.active || usedPeople.has(p.value))
      .map(({ value, label }) => ({ value, label })),
    taskTypes: o.taskTypes
      .filter((t) => t.active || usedTypes.has(t.value))
      .map(({ value, label }) => ({ value, label })),
    channels: o.channels
      .filter((c) => c.active || usedChannels.has(c.id))
      .map(({ id, name }) => ({ id, name })),
  }
}
