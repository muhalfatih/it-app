// Query Pengajuan SDM (server-only).
import type { Permission } from "@workspace/auth/permissions"
import { db } from "@workspace/db/client"
import { asc, desc, eq, sql } from "@workspace/db/orm"
import {
  managerTask,
  managerTaskAssignee,
  plannerAssignment,
  serviceRequest,
  serviceRequestStaff,
  taskType,
  unit,
  user,
} from "@workspace/db/schema"

import type { Tx } from "@/lib/manager-task/mutations"
import type { IsoDate } from "@/lib/planner/types"

import type { ServiceStatus } from "./types"

export type RequestRow = typeof serviceRequest.$inferSelect

/** `name` null = kebutuhan pengaju yang belum ada orangnya. */
export type StaffLine = { name: string | null; label: string; start: IsoDate; end: IsoDate }

export type RequestView = {
  id: number
  activityName: string
  startDate: IsoDate
  endDate: IsoDate
  unitName: string
  waNumber: string
  status: ServiceStatus
  followUp: "planner" | "tugas" | null
  plannerEntryId: number | null
  taskIds: number[]
  managerNote: string | null
  requestedBy: { id: string; name: string }
  decidedAt: Date | null
  createdAt: Date
  rundown: { name: string; mime: string; size: number } | null
  staff: StaffLine[]
}

export type RequestListRow = {
  id: number
  activityName: string
  startDate: IsoDate
  endDate: IsoDate
  unitName: string
  status: ServiceStatus
  requesterName: string
  createdAt: Date
}

/** Susunan SDM terkini menurut status & tindak lanjut (spec "Susunan SDM"). */
export async function staffFor(
  q: Tx | typeof db,
  r: Pick<
    RequestRow,
    "id" | "status" | "followUp" | "plannerEntryId" | "cancelledStaff" | "startDate" | "endDate"
  >
): Promise<StaffLine[]> {
  if (r.status === "dibatalkan") return r.cancelledStaff ?? []
  if (r.status === "disetujui" && r.followUp === "planner" && r.plannerEntryId) {
    return q
      .select({
        name: user.name,
        label: taskType.name,
        start: plannerAssignment.startDate,
        end: plannerAssignment.endDate,
      })
      .from(plannerAssignment)
      .innerJoin(user, eq(user.id, plannerAssignment.userId))
      .innerJoin(taskType, eq(taskType.id, plannerAssignment.taskTypeId))
      .where(eq(plannerAssignment.entryId, r.plannerEntryId))
      .orderBy(asc(plannerAssignment.startDate), asc(plannerAssignment.id))
  }
  if (r.status === "disetujui") {
    return q
      .select({
        name: user.name,
        label: managerTask.title,
        start: managerTask.startDate,
        end: managerTask.endDate,
      })
      .from(managerTask)
      .innerJoin(managerTaskAssignee, eq(managerTaskAssignee.taskId, managerTask.id))
      .innerJoin(user, eq(user.id, managerTaskAssignee.userId))
      .where(eq(managerTask.serviceRequestId, r.id))
      .orderBy(asc(managerTask.id), asc(user.name))
  }
  const needs = await q
    .select({ label: taskType.name })
    .from(serviceRequestStaff)
    .innerJoin(taskType, eq(taskType.id, serviceRequestStaff.taskTypeId))
    .where(eq(serviceRequestStaff.requestId, r.id))
    .orderBy(asc(serviceRequestStaff.position))
  return needs.map((n) => ({ name: null, label: n.label, start: r.startDate, end: r.endDate }))
}

export async function getRequestFor(
  viewer: { id: string; permissions: ReadonlySet<Permission> },
  id: number
): Promise<RequestView | null> {
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) return null
  const [row] = await db
    .select({ r: serviceRequest, unitName: unit.name, requesterName: user.name })
    .from(serviceRequest)
    .innerJoin(unit, eq(unit.id, serviceRequest.unitId))
    .innerJoin(user, eq(user.id, serviceRequest.requestedBy))
    .where(eq(serviceRequest.id, id))
  if (!row) return null
  const { r } = row
  if (r.requestedBy !== viewer.id && !viewer.permissions.has("layanan.setujui_sdm"))
    return null
  const [tasks, staff] = await Promise.all([
    db
      .select({ id: managerTask.id })
      .from(managerTask)
      .where(eq(managerTask.serviceRequestId, id))
      .orderBy(asc(managerTask.id)),
    staffFor(db, r),
  ])
  return {
    id: r.id,
    activityName: r.activityName,
    startDate: r.startDate,
    endDate: r.endDate,
    unitName: row.unitName,
    waNumber: r.waNumber,
    status: r.status as ServiceStatus,
    followUp: r.followUp as RequestView["followUp"],
    plannerEntryId: r.plannerEntryId,
    taskIds: tasks.map((t) => t.id),
    managerNote: r.managerNote,
    requestedBy: { id: r.requestedBy, name: row.requesterName },
    decidedAt: r.decidedAt,
    createdAt: r.createdAt,
    rundown: r.rundownKey
      ? { name: r.rundownName ?? "", mime: r.rundownMime ?? "", size: r.rundownSize ?? 0 }
      : null,
    staff,
  }
}

function listQuery() {
  return db
    .select({
      id: serviceRequest.id,
      activityName: serviceRequest.activityName,
      startDate: serviceRequest.startDate,
      endDate: serviceRequest.endDate,
      unitName: unit.name,
      status: serviceRequest.status,
      requesterName: user.name,
      createdAt: serviceRequest.createdAt,
    })
    .from(serviceRequest)
    .innerJoin(unit, eq(unit.id, serviceRequest.unitId))
    .innerJoin(user, eq(user.id, serviceRequest.requestedBy))
    .$dynamic()
}

export async function listMyRequests(userId: string): Promise<RequestListRow[]> {
  return (await listQuery()
    .where(eq(serviceRequest.requestedBy, userId))
    .orderBy(desc(serviceRequest.createdAt), desc(serviceRequest.id))) as RequestListRow[]
}

/** Diajukan dulu (terlama di atas), lalu lainnya terbaru dulu. */
export async function listRequests(status?: ServiceStatus): Promise<RequestListRow[]> {
  const pending = sql`${serviceRequest.status} = 'diajukan'`
  return (await listQuery()
    .where(status ? eq(serviceRequest.status, status) : undefined)
    .orderBy(
      sql`${pending} desc`,
      sql`case when ${pending} then ${serviceRequest.createdAt} end asc`,
      desc(serviceRequest.createdAt),
      desc(serviceRequest.id)
    )) as RequestListRow[]
}

/** Unit & jenis tugas aktif untuk formulir pengajuan. */
export async function loadRequestFormOptions() {
  const pick = { id: unit.id, name: unit.name }
  const [units, taskTypes] = await Promise.all([
    db.select(pick).from(unit).where(eq(unit.active, true)).orderBy(asc(unit.name)),
    db
      .select({ id: taskType.id, name: taskType.name })
      .from(taskType)
      .where(eq(taskType.active, true))
      .orderBy(asc(taskType.name)),
  ])
  return { units, taskTypes }
}
