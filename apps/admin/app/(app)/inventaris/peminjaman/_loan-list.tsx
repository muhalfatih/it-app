import Link from "next/link"
import {
  BoxesIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CircleDotIcon,
  HandHelpingIcon,
  Building2Icon,
  UserIcon,
} from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { StatusBadge as StatusBadgeBase } from "@workspace/ui/components/domain/status-badge"
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
  return (
    <StatusBadgeBase variant={STATUS_VARIANT[status]}>
      {STATUS_LABELS[status]}
    </StatusBadgeBase>
  )
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
            <TableHead icon={UserIcon}>Peminjam</TableHead>
            <TableHead icon={Building2Icon}>Unit</TableHead>
            <TableHead icon={BoxesIcon}>Alat</TableHead>
            <TableHead icon={CalendarCheckIcon}>Mulai</TableHead>
            <TableHead icon={CalendarClockIcon}>Rencana kembali</TableHead>
            <TableHead icon={CircleDotIcon}>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell icon={UserIcon} data-label="Peminjam" className="font-medium">
                <Link
                  href={`/inventaris/peminjaman/${r.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {r.borrowerName}
                </Link>
              </TableCell>
              <TableCell icon={Building2Icon} data-label="Unit">{r.unitName}</TableCell>
              <TableCell icon={BoxesIcon} data-label="Alat" className="max-w-64 whitespace-normal">
                {r.itemsLabel}
              </TableCell>
              <TableCell icon={CalendarCheckIcon} data-label="Mulai" className="tabular-nums">
                {formatDateTime(r.startedAt)}
              </TableCell>
              <TableCell icon={CalendarClockIcon} data-label="Rencana kembali" className="tabular-nums">
                {formatDateTime(r.dueAt)}
              </TableCell>
              <TableCell icon={CircleDotIcon} data-label="Status">
                <StatusBadge status={r.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
