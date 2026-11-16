import type { Metadata } from "next"

import { requirePermission } from "@workspace/auth/session"

import { loadFormOptions } from "@/lib/planner/queries"

import { EntryForm } from "../_entry-form"

export const metadata: Metadata = { title: "Entri baru · Media Planner" }

export default async function EntriBaruPage() {
  await requirePermission("planner.ubah")
  const options = await loadFormOptions()
  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Entri baru</h1>
      <EntryForm options={options} />
    </div>
  )
}
