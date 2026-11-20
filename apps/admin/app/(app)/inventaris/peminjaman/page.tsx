import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { requirePermission } from "@workspace/auth/session"
import { buttonVariants } from "@workspace/ui/components/button"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import { listLoans, RETURNED_LIMIT } from "@/lib/inventaris/queries"
import { STATUS_LABELS, type LoanStatus } from "@/lib/inventaris/rules"

import { LoanList } from "./_loan-list"

export const metadata: Metadata = { title: "Peminjaman alat" }

const STATUSES = Object.keys(STATUS_LABELS) as LoanStatus[]

export default async function PeminjamanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("peminjaman.catat")
  const { status: raw } = await searchParams
  const status = STATUSES.find((s) => s === raw) ?? "dipinjam"
  const rows = await listLoans(status)
  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Peminjaman alat
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Catat alat yang keluar dan kembali. Peminjam tidak perlu punya akun.
          </p>
        </div>
        <Link
          href="/inventaris/peminjaman/baru"
          className={buttonVariants({ size: "sm" })}
        >
          <PlusIcon data-icon="inline-start" />
          Catat peminjaman
        </Link>
      </div>
      <Tabs value={status} className="min-w-0">
        <div className="overflow-x-auto overflow-y-hidden">
          <TabsList>
            {STATUSES.map((s) => (
              <TabsTrigger
                key={s}
                value={s}
                nativeButton={false}
                render={<Link href={`/inventaris/peminjaman?status=${s}`} />}
              >
                {STATUS_LABELS[s]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      {status === "dikembalikan" && rows.length >= RETURNED_LIMIT ? (
        <p className="text-sm text-muted-foreground">
          Menampilkan {RETURNED_LIMIT} transaksi terbaru.
        </p>
      ) : null}
      <LoanList rows={rows} />
    </div>
  )
}
