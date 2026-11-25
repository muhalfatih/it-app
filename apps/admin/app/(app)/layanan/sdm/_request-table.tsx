import Link from "next/link"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  Building2Icon,
  CalendarIcon,
  CircleDotIcon,
  ClipboardListIcon,
  UserIcon,
} from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { StatusBadge } from "@workspace/ui/components/domain/status-badge"
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

export const STATUS_VARIANT = {
  diajukan: "info-light",
  disetujui: "success-light",
  ditolak: "destructive-light",
  dibatalkan: "secondary",
} as const satisfies Record<ServiceStatus, string>

/** "5 Des 2026" atau "28 Nov – 2 Des 2026". */
export function rangeLabel(start: string, end: string): string {
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
            <TableHead icon={ClipboardListIcon}>Nama kegiatan</TableHead>
            <TableHead icon={CalendarIcon}>Tanggal</TableHead>
            <TableHead icon={Building2Icon}>Unit</TableHead>
            {showRequester && (
              <TableHead icon={UserIcon}>Pengaju</TableHead>
            )}
            <TableHead icon={CircleDotIcon}>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell data-label="Nama kegiatan" className="max-w-64 whitespace-normal">
                <Link
                  href={`/layanan/sdm/${r.id}`}
                  className="line-clamp-2 font-medium underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {r.activityName}
                </Link>
              </TableCell>
              <TableCell icon={CalendarIcon} data-label="Tanggal" className="tabular-nums">
                {rangeLabel(r.startDate, r.endDate)}
              </TableCell>
              <TableCell icon={Building2Icon} data-label="Unit">{r.unitName}</TableCell>
              {showRequester && (
                <TableCell icon={UserIcon} data-label="Pengaju">
                  {r.requesterName}
                </TableCell>
              )}
              <TableCell icon={CircleDotIcon} data-label="Status">
                <StatusBadge variant={STATUS_VARIANT[r.status]}>
                  {STATUS_LABELS[r.status]}
                </StatusBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
