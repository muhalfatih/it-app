import type { Metadata } from "next"

import { requirePermission } from "@workspace/auth/session"

import { listEquipment, listOpenProblems } from "@/lib/inventaris/queries"

import { EquipmentGrid } from "./_equipment-grid"
import { ProblemPanel } from "./_problem-panel"

export const metadata: Metadata = { title: "Data alat" }

export default async function InventarisPage() {
  await requirePermission("inventaris.kelola")
  const [equipment, problems] = await Promise.all([
    listEquipment(),
    listOpenProblems(),
  ])
  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Data alat</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Daftar alat beserta stok yang tersedia. Alat yang rusak atau hilang
          tidak dihitung tersedia sampai dipulihkan.
        </p>
      </div>
      <EquipmentGrid equipment={equipment} />
      <ProblemPanel problems={problems} />
    </div>
  )
}
