// Mutasi Pengajuan SDM (server-only; dipanggil aksi server yang sudah dijaga izin).
import type { Permission } from "@workspace/auth/permissions"
import { db } from "@workspace/db/client"
import { eq, inArray } from "@workspace/db/orm"
import {
  managerTask,
  serviceRequest,
  serviceRequestStaff,
  taskType,
  unit,
  type CancelledStaff,
} from "@workspace/db/schema"

import { parse, validId } from "@/lib/kanban/mutations"
import { insertManagerTask, type Tx } from "@/lib/manager-task/mutations"
import { deleteEntry } from "@/lib/planner/mutations"
import { listReporters } from "@/lib/report/queries"
import { removeObjects } from "@/lib/storage"
import { UserError } from "@/lib/user-error"

import { verifyRundown } from "./rundown"
import { staffFor, type RequestRow } from "./queries"
import { approveTasksSchema, reasonSchema, requestInputSchema } from "./schema"

const NOT_FOUND = "Pengajuan tidak ditemukan"
const DECIDED = "Pengajuan sudah diputuskan"
const CANCEL_NOTE = "Isi catatan pembatalan untuk pengaju"

async function lockRow(tx: Tx, id: number): Promise<RequestRow> {
  if (!validId(id)) throw new UserError(NOT_FOUND)
  const [row] = await tx
    .select()
    .from(serviceRequest)
    .where(eq(serviceRequest.id, id))
    .for("update")
  if (!row) throw new UserError(NOT_FOUND)
  return row
}

/** Kunci pengajuan sampai transaksi selesai; harus masih `diajukan`. */
export async function lockPending(tx: Tx, id: number): Promise<RequestRow> {
  const row = await lockRow(tx, id)
  if (row.status !== "diajukan") throw new UserError(DECIDED)
  return row
}

/** Nama jenis tugas; semua harus ada dan aktif. */
async function activeTaskTypes(ids: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids)]
  const rows = await db
    .select({ id: taskType.id, name: taskType.name, active: taskType.active })
    .from(taskType)
    .where(inArray(taskType.id, unique))
  if (rows.length !== unique.length || rows.some((r) => !r.active))
    throw new UserError("Jenis tugas tidak valid atau sudah dinonaktifkan")
  return new Map(rows.map((r) => [r.id, r.name]))
}

export async function createRequest(userId: string, raw: unknown): Promise<{ id: number }> {
  const input = parse(requestInputSchema, raw)
  const rundown = input.rundownKey ? await verifyRundown(input.rundownKey) : null
  const [u] = await db
    .select({ active: unit.active })
    .from(unit)
    .where(eq(unit.id, input.unitId))
  if (!u?.active) throw new UserError("Unit tidak valid atau sudah dinonaktifkan")
  await activeTaskTypes(input.needs.map((n) => n.taskTypeId))
  return db.transaction(async (tx) => {
    if (input.rundownKey) {
      const [used] = await tx
        .select({ id: serviceRequest.id })
        .from(serviceRequest)
        .where(eq(serviceRequest.rundownKey, input.rundownKey))
      if (used) throw new UserError("Berkas rundown sudah dipakai pengajuan lain")
    }
    const [r] = await tx
      .insert(serviceRequest)
      .values({
        activityName: input.activityName,
        startDate: input.startDate,
        endDate: input.endDate,
        unitId: input.unitId,
        waNumber: input.waNumber,
        feeAgreed: input.feeAgreed,
        requestedBy: userId,
        ...(rundown && {
          rundownKey: input.rundownKey,
          rundownName: input.rundownName?.trim().slice(0, 200) || "rundown",
          rundownMime: rundown.mime,
          rundownSize: rundown.size,
        }),
      })
      .returning({ id: serviceRequest.id })
    await tx.insert(serviceRequestStaff).values(
      input.needs.map((n, position) => ({
        requestId: r!.id,
        position,
        taskTypeId: n.taskTypeId,
      }))
    )
    return { id: r!.id }
  })
}

export async function withdrawRequest(userId: string, id: number): Promise<void> {
  const key = await db.transaction(async (tx) => {
    const row = await lockRow(tx, id)
    if (row.requestedBy !== userId) throw new UserError(NOT_FOUND)
    if (row.status !== "diajukan") throw new UserError(DECIDED)
    await tx.delete(serviceRequest).where(eq(serviceRequest.id, id))
    return row.rundownKey
  })
  // Gagal hapus objek hanya dicatat; penyapu yatim menangkapnya.
  if (key) await removeObjects([key]).catch((e) => console.error("removeObjects gagal", e))
}

export async function rejectRequest(actorId: string, id: number, reason: unknown): Promise<void> {
  const note = parse(reasonSchema, reason)
  await db.transaction(async (tx) => {
    await lockPending(tx, id)
    await tx
      .update(serviceRequest)
      .set({ status: "ditolak", managerNote: note, decidedBy: actorId, decidedAt: new Date() })
      .where(eq(serviceRequest.id, id))
  })
}

/** Dipotong ke batas judul Tugas dari Manajer (120) agar tugas tetap bisa diedit di halaman Tugas. */
function taskTitle(jenis: string, activityName: string): string {
  const t = `${jenis} · ${activityName}`
  return t.length > 120 ? `${t.slice(0, 119).trimEnd()}…` : t
}

export async function approveWithTasks(actorId: string, id: number, raw: unknown): Promise<void> {
  const input = parse(approveTasksSchema, raw)
  const staff = new Set((await listReporters()).map((r) => r.id))
  if (!input.rows.every((r) => staff.has(r.personId))) throw new UserError("Staf tidak valid")
  const names = await activeTaskTypes(input.rows.map((r) => r.taskTypeId))
  await db.transaction(async (tx) => {
    const req = await lockPending(tx, id)
    for (const r of input.rows) {
      await insertManagerTask(
        tx,
        {
          title: taskTitle(names.get(r.taskTypeId)!, req.activityName),
          note: null,
          startDate: r.start,
          endDate: r.end,
          createdBy: actorId,
          serviceRequestId: id,
        },
        [r.personId]
      )
    }
    await tx
      .update(serviceRequest)
      .set({
        status: "disetujui",
        followUp: "tugas",
        managerNote: input.note || null,
        decidedBy: actorId,
        decidedAt: new Date(),
      })
      .where(eq(serviceRequest.id, id))
  })
}

/** Spec "Batalkan" 1–4; dipanggil di dalam transaksi jalur hapus Planner/tugas/tombol batal. */
export async function cancelRequestTx(
  tx: Tx,
  id: number,
  note: string,
  actorId: string
): Promise<void> {
  if (!note?.trim()) throw new UserError(CANCEL_NOTE)
  const managerNote = parse(reasonSchema, note)
  const row = await lockRow(tx, id)
  if (row.status !== "disetujui") throw new UserError("Pengajuan tidak dalam status Disetujui")
  // Status disetujui: setiap baris susunan punya nama.
  const snapshot = (await staffFor(tx, row)) as CancelledStaff
  if (row.followUp === "tugas") {
    await tx
      .update(managerTask)
      .set({ serviceRequestId: null })
      .where(eq(managerTask.serviceRequestId, id))
  }
  // planner_entry_id dilepas di UPDATE yang sama, sebelum pemanggil menghapus entri.
  await tx
    .update(serviceRequest)
    .set({
      status: "dibatalkan",
      plannerEntryId: null,
      cancelledStaff: snapshot,
      managerNote,
      cancelledAt: new Date(),
      decidedBy: actorId,
    })
    .where(eq(serviceRequest.id, id))
}

/** Tombol "Batalkan pengajuan": batalkan lalu hapus entri Planner atau semua tugas tertaut. */
export async function cancelApprovedRequest(
  actorId: string,
  id: number,
  note: unknown,
  permissions: ReadonlySet<Permission>,
  confirmName?: string
): Promise<void> {
  const text = typeof note === "string" ? note : ""
  if (!validId(id)) throw new UserError(NOT_FOUND)
  const [row] = await db
    .select({ plannerEntryId: serviceRequest.plannerEntryId })
    .from(serviceRequest)
    .where(eq(serviceRequest.id, id))
  if (!row) throw new UserError(NOT_FOUND)
  // deleteEntry mengunci entri lalu pengajuan, dan memastikan pengajuan masih disetujui.
  if (row.plannerEntryId !== null)
    return deleteEntry(row.plannerEntryId, permissions, confirmName, text, actorId)
  await db.transaction(async (tx) => {
    await lockRow(tx, id)
    const ids = (
      await tx
        .select({ id: managerTask.id })
        .from(managerTask)
        .where(eq(managerTask.serviceRequestId, id))
    ).map((t) => t.id)
    await cancelRequestTx(tx, id, text, actorId)
    if (ids.length) await tx.delete(managerTask).where(inArray(managerTask.id, ids))
  })
}
