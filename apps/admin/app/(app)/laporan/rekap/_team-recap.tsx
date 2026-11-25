import Link from "next/link"
import {
  CalendarDaysIcon,
  CircleCheckIcon,
  ClockIcon,
  GaugeIcon,
  UserIcon,
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { formatPercent, type Recap } from "@/lib/report/recap"

import { SOURCE_LABEL } from "./_recap-view"

export type TeamRecapRow = { id: string; name: string; recap: Recap }

const SOURCES = Object.keys(SOURCE_LABEL) as (keyof typeof SOURCE_LABEL)[]

/** Tabel ringkasan seluruh tim untuk satu periode (spesifikasi §5.7); `query` dipertahankan di tautan nama. */
export function TeamRecap({
  rows,
  query,
}: {
  rows: TeamRecapRow[]
  query: string
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead icon={UserIcon}>Nama</TableHead>
            <TableHead icon={GaugeIcon} numeric>Rata-rata</TableHead>
            <TableHead icon={CalendarDaysIcon} numeric>Hari</TableHead>
            {SOURCES.map((s) => (
              <TableHead key={s} icon={CircleCheckIcon} numeric className="whitespace-nowrap">
                {SOURCE_LABEL[s]}
              </TableHead>
            ))}
            <TableHead icon={ClockIcon} numeric className="whitespace-nowrap">TL / Tertunda</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ id, name, recap }) => (
            <TableRow key={id}>
              <TableCell icon={UserIcon} data-label="Nama" className="font-medium">
                <Link
                  href={`/laporan/rekap/${id}?${query}`}
                  className="underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {name}
                </Link>
              </TableCell>
              <TableCell icon={GaugeIcon} numeric data-label="Rata-rata">
                {recap.average === null ? "—" : formatPercent(recap.average)}
              </TableCell>
              <TableCell icon={CalendarDaysIcon} numeric data-label="Hari">
                {recap.days.filter((d) => d.pct !== null).length}
              </TableCell>
              {SOURCES.map((s) => (
                <TableCell icon={CircleCheckIcon} numeric data-label={SOURCE_LABEL[s]} key={s}>
                  {recap.bySource[s].total === 0
                    ? "—"
                    : `${recap.bySource[s].done}/${recap.bySource[s].total}`}
                </TableCell>
              ))}
              <TableCell icon={ClockIcon} numeric data-label="TL / Tertunda">{recap.open.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
