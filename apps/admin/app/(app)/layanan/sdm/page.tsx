import type { Metadata } from "next"

import { requirePermission } from "@workspace/auth/session"

import { loadRequestFormOptions } from "@/lib/layanan/queries"
import { RUNDOWN_MAX, RUNDOWN_MIMES } from "@/lib/layanan/rundown"

import { RequestForm } from "./_request-form"

export const metadata: Metadata = { title: "Pengajuan SDM" }

export default async function PengajuanSdmPage() {
  await requirePermission("layanan.ajukan")
  const { units, taskTypes } = await loadRequestFormOptions()
  const opt = (r: { id: number; name: string }) => ({
    value: String(r.id),
    label: r.name,
  })
  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pengajuan SDM</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Minta SDM unit IT &amp; Media untuk kegiatan Anda. Manajer memilih
          orangnya saat menyetujui; status bisa dipantau di Pengajuan Saya.
        </p>
      </div>
      <RequestForm
        units={units.map(opt)}
        taskTypes={taskTypes.map(opt)}
        rundownMimes={RUNDOWN_MIMES}
        rundownMax={RUNDOWN_MAX}
      />
    </div>
  )
}
