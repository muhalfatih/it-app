import type { Metadata } from "next"

import { requirePermission } from "@workspace/auth/session"
import { taskType } from "@workspace/db/schema"
import { SettingList } from "@workspace/ui/components/domain/setting-list"

import { listRows } from "@/lib/setting-crud"

import { addTaskType, updateTaskType } from "./actions"

export const metadata: Metadata = { title: "Daftar penugasan · Setting" }

export default async function PenugasanPage() {
  await requirePermission("setting.kelola")
  const rows = await listRows(taskType)

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Daftar penugasan
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Jenis tugas yang dipilih saat menugaskan orang di Planner dan di
          formulir Pengajuan SDM.
        </p>
      </div>
      <div className="max-w-2xl">
        <SettingList
          title="Jenis penugasan"
          itemLabel="jenis penugasan"
          rows={rows.map((r) => ({ id: r.id, name: r.name, active: r.active }))}
          onAdd={addTaskType}
          onUpdate={updateTaskType}
        />
      </div>
    </div>
  )
}
