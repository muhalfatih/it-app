import Link from "next/link"

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
            <TableHead>Nama</TableHead>
            <TableHead className="text-right">Rata-rata</TableHead>
            <TableHead className="text-right">Hari</TableHead>
            {SOURCES.map((s) => (
              <TableHead key={s} className="text-right whitespace-nowrap">
                {SOURCE_LABEL[s]}
              </TableHead>
            ))}
            <TableHead className="text-right whitespace-nowrap">TL / Tertunda</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ id, name, recap }) => (
            <TableRow key={id}>
              <TableCell className="font-medium">
                <Link
                  href={`/laporan/rekap/${id}?${query}`}
                  className="underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {name}
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {recap.average === null ? "—" : formatPercent(recap.average)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {recap.days.filter((d) => d.pct !== null).length}
              </TableCell>
              {SOURCES.map((s) => (
                <TableCell key={s} className="text-right tabular-nums">
                  {recap.bySource[s].total === 0
                    ? "—"
                    : `${recap.bySource[s].done}/${recap.bySource[s].total}`}
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums">{recap.open.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
