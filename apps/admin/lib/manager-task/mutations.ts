// Mutasi Tugas dari Manajer (server-only; dipanggil aksi server yang sudah dijaga izin).
import { db } from "@workspace/db/client"
import { and, count, eq, ne } from "@workspace/db/orm"
import { managerTask, managerTaskAssignee, serviceRequest } from "@workspace/db/schema"

import { cancelRequestTx, notifyRequestStatus } from "@/lib/layanan/mutations"
import { notify } from "@/lib/push/send"
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
  const created = await db.transaction(async (tx) => ({
    id: await insertManagerTask(tx, { ...row, createdBy: actorId }, ids),
  }))
  await notifyTask(ids, row.title, actorId, "Tugas baru dari Manajer")
  return created
}

export const notifyTask = (userIds: string[], title: string, actorId: string | undefined, heading: string) =>
  notify({ userIds, except: actorId }, { title: heading, body: title, url: "/laporan" })

export async function updateManagerTask(
  id: number,
  input: ManagerTaskInput,
  actorId?: string
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
  await notifyTask(ids, row.title, actorId, "Tugas dari Manajer berubah")
}

/** Tugas tertaut terakhir sebuah pengajuan: `cancelNote` wajib dan pengajuan ikut dibatalkan. */
export async function deleteManagerTask(
  id: number,
  actorId: string,
  cancelNote?: string
): Promise<void> {
  const requester = await db.transaction(async (tx) => {
    const linkOf = async () =>
      (
        await tx
          .select({ requestId: managerTask.serviceRequestId })
          .from(managerTask)
          .where(eq(managerTask.id, id))
      )[0]?.requestId
    const requestId = await linkOf()
    let cancelledFor: string | undefined
    if (requestId != null) {
      // Kunci pengajuan sebelum menghitung, agar dua hapus bersamaan tidak sama-sama "bukan yang terakhir".
      await tx
        .select({ id: serviceRequest.id })
        .from(serviceRequest)
        .where(eq(serviceRequest.id, requestId))
        .for("update")
      // Dibaca ulang: tugas bisa sudah dilepas/dihapus oleh transaksi yang tadi memegang kunci.
      if ((await linkOf()) === requestId) {
        const [others] = await tx
          .select({ n: count() })
          .from(managerTask)
          .where(and(eq(managerTask.serviceRequestId, requestId), ne(managerTask.id, id)))
        if (others!.n === 0)
          cancelledFor = await cancelRequestTx(tx, requestId, cancelNote ?? "", actorId)
      }
    }
    await tx.delete(managerTask).where(eq(managerTask.id, id))
    return cancelledFor
  })
  if (requester) await notifyRequestStatus(requester, "dibatalkan", actorId)
}
