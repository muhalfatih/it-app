// Query Tugas dari Manajer (server-only).
import { db } from "@workspace/db/client"
import { and, count, desc, eq, inArray, lte, ne } from "@workspace/db/orm"
import {
  dailyReportAnswer,
  managerTask,
  managerTaskAssignee,
  user,
} from "@workspace/db/schema"

import type { IsoDate } from "@/lib/planner/types"
import type { RangeSource } from "@/lib/report/rules"

export type ManagerTaskRow = {
  id: number
  title: string
  note: string | null
  startDate: IsoDate
  endDate: IsoDate
  serviceRequestId: number | null
  assignees: { id: string; name: string; done: boolean }[]
}

async function hydrate(
  tasks: (typeof managerTask.$inferSelect)[]
): Promise<ManagerTaskRow[]> {
  if (tasks.length === 0) return []
  const ids = tasks.map((t) => t.id)
  const [people, tuntas] = await Promise.all([
    db
      .select({ taskId: managerTaskAssignee.taskId, id: user.id, name: user.name })
      .from(managerTaskAssignee)
      .innerJoin(user, eq(user.id, managerTaskAssignee.userId))
      .where(inArray(managerTaskAssignee.taskId, ids))
      .orderBy(user.name),
    db
      .selectDistinct({
        userId: dailyReportAnswer.userId,
        taskKey: dailyReportAnswer.taskKey,
      })
      .from(dailyReportAnswer)
      .where(
        and(
          eq(dailyReportAnswer.status, "T"),
          inArray(dailyReportAnswer.taskKey, ids.map((i) => `manajer:${i}`))
        )
      ),
  ])
  const done = new Set(tuntas.map((r) => `${r.userId}|${r.taskKey}`))
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    note: t.note,
    startDate: t.startDate,
    endDate: t.endDate,
    serviceRequestId: t.serviceRequestId,
    assignees: people
      .filter((p) => p.taskId === t.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        done: done.has(`${p.id}|manajer:${t.id}`),
      })),
  }))
}

export async function listManagerTasks(): Promise<ManagerTaskRow[]> {
  return hydrate(
    await db
      .select()
      .from(managerTask)
      .orderBy(desc(managerTask.startDate), desc(managerTask.id))
  )
}

/** `isLastLinked`: tugas tertaut terakhir pengajuannya; menghapusnya membatalkan pengajuan. */
export async function getManagerTask(
  id: number
): Promise<(ManagerTaskRow & { isLastLinked: boolean }) | null> {
  const [row] = await hydrate(
    await db.select().from(managerTask).where(eq(managerTask.id, id))
  )
  if (!row) return null
  if (row.serviceRequestId === null) return { ...row, isLastLinked: false }
  const [others] = await db
    .select({ n: count() })
    .from(managerTask)
    .where(and(eq(managerTask.serviceRequestId, row.serviceRequestId), ne(managerTask.id, id)))
  return { ...row, isLastLinked: others!.n === 0 }
}

/** Tugas penerima ini dengan startDate ≤ date (yang lewat juga, untuk Tertunda). */
export async function managerTasksFor(
  userId: string,
  date: IsoDate
): Promise<RangeSource[]> {
  return db
    .select({
      id: managerTask.id,
      title: managerTask.title,
      startDate: managerTask.startDate,
      endDate: managerTask.endDate,
    })
    .from(managerTask)
    .innerJoin(managerTaskAssignee, eq(managerTaskAssignee.taskId, managerTask.id))
    .where(and(eq(managerTaskAssignee.userId, userId), lte(managerTask.startDate, date)))
    .orderBy(managerTask.startDate, managerTask.id)
}
