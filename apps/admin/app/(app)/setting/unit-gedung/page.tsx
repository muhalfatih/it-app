import type { Metadata } from "next"

import { requirePermission } from "@workspace/auth/session"
import { building, unit } from "@workspace/db/schema"
import { SettingList } from "@workspace/ui/components/domain/setting-list"

import { listRows } from "@/lib/setting-crud"

import { addBuilding, addUnit, updateBuilding, updateUnit } from "./actions"

export const metadata: Metadata = { title: "Unit & gedung · Setting" }

export default async function UnitGedungPage() {
  await requirePermission("setting.kelola")
  const [units, buildings] = await Promise.all([
    listRows(unit),
    listRows(building),
  ])
  const toRows = (rows: { id: number; name: string; active: boolean }[]) =>
    rows.map((r) => ({ id: r.id, name: r.name, active: r.active }))

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Unit &amp; gedung
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Pilihan untuk formulir Layanan: unit pengaju di Pengajuan SDM dan
          gedung di Pengaduan Internet.
        </p>
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <SettingList
          title="Unit"
          description="Unit pengaju Pengajuan SDM."
          itemLabel="unit"
          rows={toRows(units)}
          onAdd={addUnit}
          onUpdate={updateUnit}
        />
        <SettingList
          title="Gedung"
          description="Lokasi pada Pengaduan Internet."
          itemLabel="gedung"
          rows={toRows(buildings)}
          onAdd={addBuilding}
          onUpdate={updateBuilding}
        />
      </div>
    </div>
  )
}
