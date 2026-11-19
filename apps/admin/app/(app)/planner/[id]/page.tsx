import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"

import { requirePermission } from "@workspace/auth/session"
import { CONTENT_STAGE_LABEL } from "@workspace/ui/components/domain/content-card"
import { Badge } from "@workspace/ui/components/reui/badge"

import { getEntry, loadFormOptions } from "@/lib/planner/queries"
import { canDeleteEntry, needsNameConfirm } from "@/lib/planner/rules"

import { DeleteEntry } from "../_delete-entry"
import { EntryForm } from "../_entry-form"

type Props = { params: Promise<{ id: string }> }

/** Satu kueri per permintaan, dipakai bersama metadata dan halaman. */
const loadEntry = cache(async (id: string) => {
  const entryId = /^\d+$/.test(id) ? Number(id) : NaN
  return Number.isSafeInteger(entryId) && entryId >= 1 && entryId <= 2_147_483_647
    ? getEntry(entryId)
    : null
})

// notFound() di sini (bukan metadata statis) supaya judul tab memakai metadata not-found.tsx.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requirePermission("planner.lihat")
  if (!(await loadEntry((await params).id))) notFound()
  return { title: "Entri · Media Planner" }
}

export default async function EntriPage({ params }: Props) {
  const { id } = await params
  const user = await requirePermission("planner.lihat")
  const entry = await loadEntry(id)
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
              linked={entry.serviceRequestId !== null}
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
