import type { Metadata } from "next"

import { requirePermission } from "@workspace/auth/session"

import { listBorrowOptions } from "@/lib/inventaris/queries"
import { nowWib } from "@/lib/layanan/rules"

import { LoanForm } from "./_loan-form"

export const metadata: Metadata = { title: "Catat peminjaman" }

export default async function PeminjamanBaruPage() {
  await requirePermission("peminjaman.catat")
  const { units, equipment } = await listBorrowOptions()
  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Catat peminjaman
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Catat saat alat benar-benar keluar. Stok tersedia di tiap alat
          dihitung saat ini.
        </p>
      </div>
      <LoanForm units={units} equipment={equipment} now={nowWib()} />
    </div>
  )
}
