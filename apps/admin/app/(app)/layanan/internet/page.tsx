import type { Metadata } from "next"

import { requirePermission } from "@workspace/auth/session"

import { loadComplaintOptions } from "@/lib/layanan/complaints"
import { nowWib } from "@/lib/layanan/rules"

import { ComplaintForm } from "./_complaint-form"

export const metadata: Metadata = { title: "Pengaduan Internet" }

export default async function PengaduanInternetPage() {
  await requirePermission("layanan.ajukan")
  const { buildings } = await loadComplaintOptions()
  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Pengaduan Internet
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Laporkan kendala internet di ruangan Anda. Pengaduan menjadi bahan
          evaluasi layanan internet sekolah dan tidak memiliki status lanjutan.
        </p>
      </div>
      <ComplaintForm buildings={buildings} now={nowWib()} />
    </div>
  )
}
