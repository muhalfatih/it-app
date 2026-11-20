// Mutasi & query Pengaduan Internet (server-only).
import { db } from "@workspace/db/client"
import { and, asc, desc, eq, gte, lt } from "@workspace/db/orm"
import { building, internetComplaint, user } from "@workspace/db/schema"

import { parse } from "@/lib/kanban/mutations"
import { UserError } from "@/lib/user-error"

import type { Issue } from "./types"
import { monthRangeWib, summarizeComplaints } from "./rules"
import { complaintInputSchema } from "./schema"

export async function createComplaint(userId: string, raw: unknown): Promise<void> {
  const input = parse(complaintInputSchema, raw)
  const [b] = await db
    .select({ active: building.active })
    .from(building)
    .where(eq(building.id, input.buildingId))
  if (!b?.active) throw new UserError("Gedung tidak valid atau sudah dinonaktifkan")
  await db.insert(internetComplaint).values({
    ...input,
    description: input.description?.trim() || null,
    reportedBy: userId,
  })
}

export async function loadComplaintOptions(): Promise<{
  buildings: { value: string; label: string }[]
}> {
  const rows = await db
    .select({ id: building.id, name: building.name })
    .from(building)
    .where(eq(building.active, true))
    .orderBy(asc(building.name))
  return { buildings: rows.map((r) => ({ value: String(r.id), label: r.name })) }
}

export async function complaintMonth(month: string) {
  const { from, to } = monthRangeWib(month)
  const rows = await db
    .select({
      id: internetComplaint.id,
      startedAt: internetComplaint.startedAt,
      buildingName: building.name,
      room: internetComplaint.room,
      issue: internetComplaint.issue,
      othersAffected: internetComplaint.othersAffected,
      description: internetComplaint.description,
      reporterName: user.name,
    })
    .from(internetComplaint)
    .innerJoin(building, eq(building.id, internetComplaint.buildingId))
    .innerJoin(user, eq(user.id, internetComplaint.reportedBy))
    .where(and(gte(internetComplaint.startedAt, from), lt(internetComplaint.startedAt, to)))
    .orderBy(desc(internetComplaint.startedAt), desc(internetComplaint.id))
  return {
    summary: summarizeComplaints(
      rows.map((r) => ({ ...r, issue: r.issue as Issue })),
      month
    ),
    rows,
  }
}
