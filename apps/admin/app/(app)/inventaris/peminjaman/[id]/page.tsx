import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeftIcon } from "lucide-react"

import { requirePermission } from "@workspace/auth/session"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/reui/badge"

import { formatDateTime } from "@/lib/inventaris/format"
import { getLoan } from "@/lib/inventaris/queries"
import { nowWib } from "@/lib/layanan/rules"

import { StatusBadge } from "../_loan-list"
import { ReturnForm } from "./_return-form"

export const metadata: Metadata = { title: "Detail peminjaman" }

export default async function PeminjamanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermission("peminjaman.catat")
  const { id: raw } = await params
  const id = /^\d{1,9}$/.test(raw) ? Number(raw) : 0
  const loan = id > 0 ? await getLoan(id) : null
  if (!loan) notFound()

  const facts: [string, string][] = [
    ["Unit", loan.unitName],
    ["WhatsApp", loan.waNumber ?? "-"],
    ["Mulai", formatDateTime(loan.startedAt)],
    ["Rencana kembali", formatDateTime(loan.dueAt)],
    ["Dicatat oleh", loan.recordedByName],
  ]
  if (loan.returnedAt)
    facts.push(
      ["Dikembalikan", formatDateTime(loan.returnedAt)],
      ["Diterima oleh", loan.returnedByName ?? "-"]
    )

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/inventaris/peminjaman"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" aria-hidden />
          Peminjaman alat
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {loan.borrowerName}
          </h1>
          <StatusBadge status={loan.status} />
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Transaksi</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          {loan.returnedAt ? (
            <ul className="divide-y rounded-xl border text-sm">
              {loan.items.map((i) => (
                <li key={i.equipmentId} className="flex flex-col gap-1 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {i.equipmentName} · {i.brand}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {i.qty} unit
                    </span>
                    {i.problemQty > 0 ? (
                      <Badge
                        variant={i.resolvedAt ? "success-light" : "warning-light"}
                      >
                        {i.problemQty} bermasalah
                        {i.resolvedAt ? ", sudah dipulihkan" : ", belum dipulihkan"}
                      </Badge>
                    ) : null}
                  </div>
                  {i.problemNote ? (
                    <p className="text-muted-foreground">{i.problemNote}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {loan.returnedAt ? null : <ReturnForm loan={loan} now={nowWib()} />}
    </div>
  )
}
