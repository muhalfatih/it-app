import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { requirePermission } from "@workspace/auth/session"
import { CONTENT_STAGE_LABEL } from "@workspace/ui/components/domain/content-card"
import { Badge } from "@workspace/ui/components/reui/badge"

import { getEntry, loadFormOptions } from "@/lib/planner/queries"
import { canDeleteEntry, needsNameConfirm } from "@/lib/planner/rules"

import { DeleteEntry } from "../_delete-entry"
import { EntryForm } from "../_entry-form"

export const metadata: Metadata = { title: "Entri · Media Planner" }

export default async function EntriPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requirePermission("planner.lihat")
  const entryId = /^\d+$/.test(id) ? Number(id) : NaN
  const entry = Number.isSafeInteger(entryId) && entryId >= 1 && entryId <= 2_147_483_647 ? await getEntry(entryId) : null
  if (!entry) notFound()

  const canEdit = user.permissions.has("planner.ubah")
  const options = await loadFormOptions(entry)

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{entry.name}</h1>
        <Badge variant="outline">{CONTENT_STAGE_LABEL[entry.stage]}</Badge>
        {canDeleteEntry(user.permissions, entry.stage) && (
          <div className="ml-auto">
            <DeleteEntry
              id={entry.id}
              name={entry.name}
              confirmByName={needsNameConfirm(entry.stage)}
            />
          </div>
        )}
      </div>
      {/* key: remount saat data server berubah (mis. setelah simpan) supaya state formulir, termasuk id baris baru, ikut segar. */}
      <EntryForm
        key={JSON.stringify(entry)}
        entry={entry}
        options={options}
        readOnly={!canEdit}
      />
    </div>
  )
}
