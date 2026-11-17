// Mutasi Planner (server-only): satu transaksi per aksi.
import { db } from "@workspace/db/client"
import { and, eq, inArray, ne } from "@workspace/db/orm"
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
import type { Permission } from "@workspace/auth/permissions"
import type { ContentStage } from "@workspace/db/schema/stages"

import { reconcileCardAfterEntryUpdate } from "@/lib/kanban/mutations"
import { UserError } from "@/lib/setting-crud"

import { canDeleteEntry, needsNameConfirm } from "./rules"
import { entryInputSchema, type EntryInput } from "./schema"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

const NOT_FOUND = "Entri tidak ditemukan"
/** id dari klien: di luar rentang integer Postgres sama saja dengan tidak ada. */
function assertEntryId(id: number) {
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647)
    throw new UserError(NOT_FOUND)
}

const isOldId =(id: string | undefined): id is string =>
  id !== undefined && /^\d+$/.test(id)

/** Orang, jenis, dan kanal pada baris baru/berubah wajib ada dan aktif. */
async function assertActive(
  tx: Tx,
  ids: { people: string[]; taskTypes: number[]; channels: number[] }
) {
  const people = [...new Set(ids.people)]
  if (people.length) {
    const rows = await tx
      .selectDistinct({ id: user.id, disabledAt: user.disabledAt })
      .from(user)
      .innerJoin(userRole, eq(userRole.userId, user.id))
      .where(and(inArray(user.id, people), ne(userRole.role, "direktur")))
    if (rows.length !== people.length) throw new UserError("Orang bukan staf unit")
    if (rows.some((r) => r.disabledAt !== null))
      throw new UserError("Orang sudah dinonaktifkan")
  }
  const types = [...new Set(ids.taskTypes)]
  if (types.length) {
    const rows = await tx
      .select({ active: taskType.active })
      .from(taskType)
      .where(inArray(taskType.id, types))
    if (rows.length !== types.length) throw new UserError("Jenis tidak valid")
    if (rows.some((r) => !r.active))
      throw new UserError("Jenis sudah dinonaktifkan")
  }
  const chans = [...new Set(ids.channels)]
  if (chans.length) {
    const rows = await tx
      .select({ active: channel.active })
      .from(channel)
      .where(inArray(channel.id, chans))
    if (rows.length !== chans.length) throw new UserError("Kanal tidak valid")
    if (rows.some((r) => !r.active))
      throw new UserError("Kanal sudah dinonaktifkan")
  }
}

const assignmentValues = (a: EntryInput["assignments"][number]) => ({
  userId: a.personId,
  taskTypeId: Number(a.taskTypeId),
  startDate: a.start,
  endDate: a.end,
})

export async function createEntry(
  raw: unknown,
  userId: string
): Promise<{ id: number }> {
  const input = entryInputSchema.parse(raw)
  return db.transaction(async (tx) => {
    await assertActive(tx, {
      people: input.assignments.map((a) => a.personId),
      taskTypes: input.assignments.map((a) => Number(a.taskTypeId)),
      channels: input.channelIds,
    })
    const [entry] = await tx
      .insert(plannerEntry)
      .values({
        name: input.name,
        activityStart: input.activityStart,
        activityEnd: input.activityEnd,
        publishDate: input.publishDate,
        createdBy: userId,
      })
      .returning({ id: plannerEntry.id })
    const id = entry!.id
    await tx
      .insert(plannerAssignment)
      .values(input.assignments.map((a) => ({ entryId: id, ...assignmentValues(a) })))
    await tx
      .insert(plannerEntryChannel)
      .values(input.channelIds.map((channelId) => ({ entryId: id, channelId })))
    await tx.insert(contentCard).values({ entryId: id, stage: "ide" })
    return { id }
  })
}

export async function updateEntry(
  id: number,
  actorId: string,
  raw: unknown,
  version?: string
): Promise<void> {
  assertEntryId(id)
  const input = entryInputSchema.parse(raw)
  await db.transaction(async (tx) => {
    const [entry] = await tx
      .select({
        id: plannerEntry.id,
        name: plannerEntry.name,
        updatedAt: plannerEntry.updatedAt,
      })
      .from(plannerEntry)
      .where(eq(plannerEntry.id, id))
      .for("update")
    if (!entry) throw new UserError(NOT_FOUND)
    // Formulir basi: entri diubah orang lain sejak formulir dimuat.
    if (version !== undefined && entry.updatedAt.toISOString() !== version)
      throw new UserError(
        "Entri sudah diubah orang lain. Muat ulang halaman, lalu ulangi perubahan Anda"
      )

    const [oldRows, oldChannels] = await Promise.all([
      tx
        .select()
        .from(plannerAssignment)
        .where(eq(plannerAssignment.entryId, id)),
      tx
        .select({ channelId: plannerEntryChannel.channelId })
        .from(plannerEntryChannel)
        .where(eq(plannerEntryChannel.entryId, id)),
    ])
    const oldById = new Map(oldRows.map((r) => [String(r.id), r]))

    const keptIds = new Set<number>()
    const updates: { id: number; values: ReturnType<typeof assignmentValues> }[] = []
    const inserts: ReturnType<typeof assignmentValues>[] = []
    const check = { people: [] as string[], taskTypes: [] as number[], channels: [] as number[] }
    for (const a of input.assignments) {
      const values = assignmentValues(a)
      if (isOldId(a.id)) {
        const old = oldById.get(a.id)
        if (!old || keptIds.has(old.id))
          throw new UserError("Penugasan tidak valid")
        keptIds.add(old.id)
        updates.push({ id: old.id, values })
        // Baris yang tidak berubah lolos apa adanya; baris yang berubah (orang, jenis, atau tanggal) harus aktif.
        const changed =
          old.userId !== values.userId ||
          old.taskTypeId !== values.taskTypeId ||
          old.startDate !== values.startDate ||
          old.endDate !== values.endDate
        if (changed) {
          check.people.push(values.userId)
          check.taskTypes.push(values.taskTypeId)
        }
      } else {
        inserts.push(values)
        check.people.push(values.userId)
        check.taskTypes.push(values.taskTypeId)
      }
    }
    const oldChannelIds = new Set(oldChannels.map((c) => c.channelId))
    check.channels = input.channelIds.filter((c) => !oldChannelIds.has(c))
    await assertActive(tx, check)

    await tx
      .update(plannerEntry)
      .set({
        name: input.name,
        activityStart: input.activityStart,
        activityEnd: input.activityEnd,
        publishDate: input.publishDate,
      })
      .where(eq(plannerEntry.id, id))
    const removed = oldRows.map((r) => r.id).filter((x) => !keptIds.has(x))
    if (removed.length)
      await tx
        .delete(plannerAssignment)
        .where(inArray(plannerAssignment.id, removed))
    for (const u of updates)
      await tx
        .update(plannerAssignment)
        .set(u.values)
        .where(eq(plannerAssignment.id, u.id))
    if (inserts.length)
      await tx
        .insert(plannerAssignment)
        .values(inserts.map((v) => ({ entryId: id, ...v })))
    await tx
      .delete(plannerEntryChannel)
      .where(eq(plannerEntryChannel.entryId, id))
    await tx
      .insert(plannerEntryChannel)
      .values(input.channelIds.map((channelId) => ({ entryId: id, channelId })))
    await reconcileCardAfterEntryUpdate(
      tx,
      id,
      {
        oldName: entry.name,
        newName: input.name,
        oldChannelIds: [...oldChannelIds],
        newChannelIds: input.channelIds,
      },
      actorId
    )
  })
}

export async function deleteEntry(
  id: number,
  permissions: ReadonlySet<Permission>,
  confirmName?: string
): Promise<void> {
  assertEntryId(id)
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ name: plannerEntry.name, stage: contentCard.stage })
      .from(plannerEntry)
      .leftJoin(contentCard, eq(contentCard.entryId, plannerEntry.id))
      .where(eq(plannerEntry.id, id))
      .for("update", { of: plannerEntry })
    if (!row) throw new UserError(NOT_FOUND)
    const stage = (row.stage ?? "ide") as ContentStage
    if (!canDeleteEntry(permissions, stage))
      throw new UserError("Anda tidak berwenang menghapus entri ini")
    if (needsNameConfirm(stage) && confirmName?.trim() !== row.name)
      throw new UserError("Ketik nama konten persis untuk menghapus")
    await tx.delete(plannerEntry).where(eq(plannerEntry.id, id))
  })
}
