import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { requirePermission } from "@workspace/auth/session"

import { getRequestFor, loadRequestFormOptions, needTypeIds } from "@/lib/layanan/queries"
import { listReporters } from "@/lib/report/queries"

import { rangeLabel } from "../../_request-table"
import { ApproveForm } from "./_approve-form"

export const metadata: Metadata = { title: "Setujui → Tugas dari Manajer" }

type Props = { params: Promise<{ id: string }> }

export default async function SetujuiTugasPage({ params }: Props) {
  const user = await requirePermission("layanan.setujui_sdm")
  const { id: rawId } = await params
  const id = /^\d+$/.test(rawId) ? Number(rawId) : NaN
  const r = Number.isSafeInteger(id) ? await getRequestFor(user, id) : null
  if (!r) notFound()
  if (r.status !== "diajukan") redirect(`/layanan/sdm/${r.id}`)

  const [reporters, { taskTypes }, needs] = await Promise.all([
    listReporters(),
    loadRequestFormOptions(),
    needTypeIds(r.id),
  ])

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Setujui → Tugas dari Manajer</h1>
        <p className="text-sm text-muted-foreground">
          {r.activityName} · {rangeLabel(r.startDate, r.endDate)} · {r.unitName}
        </p>
      </div>
      <ApproveForm
        requestId={r.id}
        people={reporters.map((p) => ({ value: p.id, label: p.name }))}
        taskTypes={taskTypes.map((t) => ({ value: String(t.id), label: t.name }))}
        initialRows={needs.map((t, i) => ({
          id: `need-${i}`,
          personId: "",
          taskTypeId: String(t),
          start: r.startDate,
          end: r.endDate,
        }))}
      />
    </div>
  )
}
