import Link from "next/link"
import { HandHelpingIcon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { formatDateTime } from "@/lib/inventaris/format"
import type { LoanRow } from "@/lib/inventaris/queries"
import { STATUS_LABELS, type LoanStatus } from "@/lib/inventaris/rules"

const STATUS_VARIANT = {
  dipinjam: "info-light",
  terlambat: "destructive-light",
  dikembalikan: "success-light",
} as const

export function StatusBadge({ status }: { status: LoanStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
}

export function LoanList({ rows }: { rows: LoanRow[] }) {
  if (rows.length === 0)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HandHelpingIcon />
          </EmptyMedia>
          <EmptyTitle>Belum ada transaksi</EmptyTitle>
          <EmptyDescription>
            Transaksi dengan status ini tampil di sini.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Peminjam</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Alat</TableHead>
            <TableHead>Mulai</TableHead>
            <TableHead>Rencana kembali</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/inventaris/peminjaman/${r.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {r.borrowerName}
                </Link>
              </TableCell>
              <TableCell>{r.unitName}</TableCell>
              <TableCell className="max-w-64 whitespace-normal">
                {r.itemsLabel}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDateTime(r.startedAt)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDateTime(r.dueAt)}
              </TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
