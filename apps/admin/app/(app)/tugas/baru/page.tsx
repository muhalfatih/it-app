import type { Metadata } from "next"

import { requirePermission } from "@workspace/auth/session"

import { listReporters } from "@/lib/report/queries"

import { TaskForm } from "../_task-form"

export const metadata: Metadata = { title: "Beri tugas · Tugas dari Manajer" }

export default async function TugasBaruPage() {
  await requirePermission("tugas_manajer.kelola")
  const staff = (await listReporters()).map((r) => ({
    value: r.id,
    label: r.name,
  }))
  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Beri tugas</h1>
      <TaskForm staff={staff} />
    </div>
  )
}
