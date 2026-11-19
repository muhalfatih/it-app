// Mutasi Tugas dari Manajer (server-only; dipanggil aksi server yang sudah dijaga izin).
import { db } from "@workspace/db/client"
import { eq } from "@workspace/db/orm"
import { managerTask, managerTaskAssignee } from "@workspace/db/schema"

import { listReporters } from "@/lib/report/queries"
import { UserError } from "@/lib/user-error"

import { managerTaskSchema, type ManagerTaskInput } from "./schema"

async function parse(input: ManagerTaskInput) {
  const v = managerTaskSchema.parse(input)
  const valid = new Set((await listReporters()).map((r) => r.id))
  const ids = [...new Set(v.assigneeIds)]
  if (!ids.every((id) => valid.has(id))) throw new UserError("Staf tidak valid")
  return {
    ids,
    row: {
      title: v.title,
      note: v.note || null,
      startDate: v.startDate,
      endDate: v.endDate,
    },
  }
}

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** Insert tugas + penerima; pemanggil sudah memvalidasi orang (dipakai juga persetujuan Layanan). */
export async function insertManagerTask(
  tx: Tx,
  row: {
    title: string
    note: string | null
    startDate: string
    endDate: string
    createdBy: string
    serviceRequestId?: number
  },
  assigneeIds: string[]
): Promise<number> {
  const [t] = await tx
    .insert(managerTask)
    .values(row)
    .returning({ id: managerTask.id })
  await tx
    .insert(managerTaskAssignee)
    .values(assigneeIds.map((userId) => ({ taskId: t!.id, userId })))
  return t!.id
}

export async function createManagerTask(
  actorId: string,
  input: ManagerTaskInput
): Promise<{ id: number }> {
  const { ids, row } = await parse(input)
  return db.transaction(async (tx) => ({
    id: await insertManagerTask(tx, { ...row, createdBy: actorId }, ids),
  }))
}

export async function updateManagerTask(
  id: number,
  input: ManagerTaskInput
): Promise<void> {
  const { ids, row } = await parse(input)
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(managerTask)
      .set(row)
      .where(eq(managerTask.id, id))
      .returning({ id: managerTask.id })
    if (updated.length === 0) throw new UserError("Tugas tidak ada")
    await tx.delete(managerTaskAssignee).where(eq(managerTaskAssignee.taskId, id))
    await tx
      .insert(managerTaskAssignee)
      .values(ids.map((userId) => ({ taskId: id, userId })))
  })
}

export async function deleteManagerTask(id: number): Promise<void> {
  await db.delete(managerTask).where(eq(managerTask.id, id))
}
