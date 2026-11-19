import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { requirePermission } from "@workspace/auth/session"
import { buttonVariants } from "@workspace/ui/components/button"

import { listMyRequests } from "@/lib/layanan/queries"

import { RequestTable } from "../_request-table"

export const metadata: Metadata = { title: "Pengajuan Saya" }

export default async function PengajuanSayaPage() {
  const user = await requirePermission("layanan.ajukan")
  const rows = await listMyRequests(user.id)
  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Pengajuan Saya</h1>
        <Link
          href="/layanan/sdm"
          className={buttonVariants({ className: "sm:ml-auto" })}
        >
          <PlusIcon data-icon="inline-start" />
          Ajukan SDM
        </Link>
      </div>
      <RequestTable
        rows={rows}
        empty={{
          title: "Belum ada pengajuan",
          description:
            "Pengajuan SDM yang Anda kirim tampil di sini beserta statusnya.",
        }}
      />
    </div>
  )
}
