import type { Metadata } from "next"

import { requirePermission } from "@workspace/auth/session"
import { channel } from "@workspace/db/schema"
import { SettingList } from "@workspace/ui/components/domain/setting-list"

import { listRows } from "@/lib/setting-crud"

import { addChannel, updateChannel } from "./actions"

export const metadata: Metadata = { title: "Kanal output · Setting" }

export default async function KanalPage() {
  await requirePermission("setting.kelola")
  const rows = await listRows(channel)

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kanal output</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Tempat konten ditayangkan. Kanal bertanda “Wajib link” harus diisi
          link postingan saat dicentang Tayang di Kanban.
        </p>
      </div>
      <div className="max-w-2xl">
        <SettingList
          title="Kanal"
          description="Kotak centang = wajib link postingan."
          itemLabel="kanal"
          extraLabel="Wajib link"
          rows={rows.map((r) => ({
            id: r.id,
            name: r.name,
            active: r.active,
            extra: "requiresLink" in r ? r.requiresLink : false,
          }))}
          onAdd={addChannel}
          onUpdate={updateChannel}
        />
      </div>
    </div>
  )
}
