import Link from "next/link"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
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

import type { RequestListRow } from "@/lib/layanan/queries"
import { STATUS_LABELS } from "@/lib/layanan/rules"
import type { ServiceStatus } from "@/lib/layanan/types"

const STATUS_VARIANT = {
  diajukan: "info-light",
  disetujui: "success-light",
  ditolak: "destructive-light",
  dibatalkan: "secondary",
} as const satisfies Record<ServiceStatus, string>

/** "5 Des 2026" atau "28 Nov – 2 Des 2026". */
function rangeLabel(start: string, end: string): string {
  const f = (iso: string, p: string) =>
    format(parseISO(iso), p, { locale: localeId })
  return start === end
    ? f(start, "d MMM yyyy")
    : `${f(start, "d MMM")} – ${f(end, "d MMM yyyy")}`
}

export function RequestTable({
  rows,
  showRequester = false,
  empty,
}: {
  rows: RequestListRow[]
  showRequester?: boolean
  empty: { title: string; description: string }
}) {
  if (rows.length === 0)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>{empty.title}</EmptyTitle>
          <EmptyDescription>{empty.description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama kegiatan</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead className="hidden sm:table-cell">Unit</TableHead>
            {showRequester && (
              <TableHead className="hidden md:table-cell">Pengaju</TableHead>
            )}
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="max-w-64 whitespace-normal">
                <Link
                  href={`/layanan/sdm/${r.id}`}
                  className="line-clamp-2 font-medium underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {r.activityName}
                </Link>
              </TableCell>
              <TableCell className="tabular-nums">
                {rangeLabel(r.startDate, r.endDate)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">{r.unitName}</TableCell>
              {showRequester && (
                <TableCell className="hidden md:table-cell">
                  {r.requesterName}
                </TableCell>
              )}
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status]} size="sm">
                  {STATUS_LABELS[r.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
