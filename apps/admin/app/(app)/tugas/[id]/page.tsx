import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"

import { requirePermission } from "@workspace/auth/session"

import { getManagerTask } from "@/lib/manager-task/queries"
import { listReporters } from "@/lib/report/queries"

import { DeleteTask } from "../_delete-task"
import { TaskForm } from "../_task-form"

type Props = { params: Promise<{ id: string }> }

/** Satu kueri per permintaan, dipakai bersama metadata dan halaman. */
const loadTask = cache(async (id: string) => {
  const taskId = /^\d+$/.test(id) ? Number(id) : NaN
  return Number.isSafeInteger(taskId) && taskId >= 1 && taskId <= 2_147_483_647
    ? getManagerTask(taskId)
    : null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requirePermission("tugas_manajer.kelola")
  if (!(await loadTask((await params).id))) notFound()
  return { title: "Ubah tugas · Tugas dari Manajer" }
}

export default async function TugasPage({ params }: Props) {
  const { id } = await params
  await requirePermission("tugas_manajer.kelola")
  const task = await loadTask(id)
  if (!task) notFound()

  const reporters = await listReporters()
  const known = new Set(reporters.map((r) => r.id))
  // Penerima yang akunnya sudah nonaktif tetap tampil agar bisa dilepas sebelum menyimpan.
  const staff = [
    ...reporters.map((r) => ({ value: r.id, label: r.name })),
    ...task.assignees
      .filter((a) => !known.has(a.id))
      .map((a) => ({ value: a.id, label: `${a.name} (nonaktif)` })),
  ]

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Ubah tugas</h1>
        <div className="ml-auto">
          <DeleteTask id={task.id} title={task.title} isLastLinked={task.isLastLinked} />
        </div>
      </div>
      {/* key: remount saat data server berubah supaya state formulir ikut segar. */}
      <TaskForm
        key={JSON.stringify(task)}
        staff={staff}
        task={{
          id: task.id,
          title: task.title,
          note: task.note,
          startDate: task.startDate,
          endDate: task.endDate,
          assigneeIds: task.assignees.map((a) => a.id),
        }}
      />
    </div>
  )
}
