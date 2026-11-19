import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { requirePermission } from "@workspace/auth/session"

import { getRequestFor, needTypeIds } from "@/lib/layanan/queries"
import { loadFormOptions } from "@/lib/planner/queries"

import { EntryForm } from "../_entry-form"

export const metadata: Metadata = { title: "Entri baru · Media Planner" }

type Props = { searchParams: Promise<{ pengajuan?: string | string[] }> }

export default async function EntriBaruPage({ searchParams }: Props) {
  const user = await requirePermission("planner.ubah")
  const { pengajuan } = await searchParams
  if (pengajuan === undefined) {
    const options = await loadFormOptions()
    return (
      <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Entri baru</h1>
        <EntryForm options={options} />
      </div>
    )
  }

  // Menyetujui pengajuan SDM lewat entri Planner: butuh juga izin persetujuan.
  await requirePermission("layanan.setujui_sdm")
  const id = typeof pengajuan === "string" && /^\d+$/.test(pengajuan) ? Number(pengajuan) : NaN
  const r = Number.isSafeInteger(id) ? await getRequestFor(user, id) : null
  if (!r) notFound()
  if (r.status !== "diajukan") redirect(`/layanan/sdm/${r.id}`)
  const [options, needs] = await Promise.all([loadFormOptions(), needTypeIds(r.id)])

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Setujui → Entri Planner</h1>
        <p className="text-sm text-muted-foreground">
          Menyimpan entri ini sekaligus menyetujui pengajuan “{r.activityName}”.
        </p>
      </div>
      <EntryForm
        options={options}
        approval={{
          requestId: r.id,
          name: r.activityName,
          start: r.startDate,
          end: r.endDate,
          taskTypeIds: needs,
        }}
      />
    </div>
  )
}
