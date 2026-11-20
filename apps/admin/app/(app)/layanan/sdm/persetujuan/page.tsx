import type { Metadata } from "next"

import { requirePermission } from "@workspace/auth/session"
import { SERVICE_STATUSES } from "@workspace/db/schema"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import { listRequests } from "@/lib/layanan/queries"
import { STATUS_LABELS } from "@/lib/layanan/rules"

import { RequestTable } from "../_request-table"

export const metadata: Metadata = { title: "Persetujuan SDM" }

export default async function PersetujuanSdmPage() {
  await requirePermission("layanan.setujui_sdm")
  // Satu query; urutannya (Diajukan terlama dulu, lainnya terbaru dulu) tetap setelah disaring per tab.
  const rows = await listRequests()
  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Persetujuan SDM</h1>
      <Tabs defaultValue="diajukan" className="min-w-0">
        <div className="overflow-x-auto overflow-y-hidden">
          <TabsList>
            {SERVICE_STATUSES.map((s) => (
              <TabsTrigger key={s} value={s}>
                {STATUS_LABELS[s]}
                <span className="tabular-nums text-muted-foreground">
                  {rows.filter((r) => r.status === s).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {SERVICE_STATUSES.map((s) => (
          <TabsContent key={s} value={s}>
            <RequestTable
              rows={rows.filter((r) => r.status === s)}
              showRequester
              empty={{
                title: `Tidak ada pengajuan ${STATUS_LABELS[s].toLowerCase()}`,
                description:
                  s === "diajukan"
                    ? "Pengajuan baru yang menunggu keputusan tampil di sini."
                    : "Pengajuan dengan status ini tampil di sini.",
              }}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
