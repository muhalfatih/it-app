import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"

import type { TaskSource } from "@workspace/db/schema/stages"
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

import { formatPercent, type Recap } from "@/lib/report/recap"

import { STATE_BADGE } from "../_state"

export const SOURCE_LABEL: Record<TaskSource, string> = {
  rutin: "Rutin",
  planner: "Planner",
  manajer: "Dari Manajer",
  sendiri: "Input sendiri",
}
const SOURCES = Object.keys(SOURCE_LABEL) as TaskSource[]

const day = (iso: string, p = "EEE, d MMM") =>
  format(parseISO(iso), p, { locale: localeId })

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

/** Isi rekap satu orang untuk satu periode (spesifikasi §5.7); server component. */
export function RecapView({ recap }: { recap: Recap }) {
  const counted = recap.days.filter((d) => d.pct !== null).length
  const done = SOURCES.reduce((n, s) => n + recap.bySource[s].done, 0)
  const total = SOURCES.reduce((n, s) => n + recap.bySource[s].total, 0)

  if (recap.days.length === 0)
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Belum ada hari laporan</EmptyTitle>
          <EmptyDescription>
            Periode ini belum punya hari kerja dengan laporan, mungkin sebelum
            tanggal mulai atau akun belum ada.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
        <Stat
          label="Rata-rata skor"
          value={recap.average === null ? "—" : formatPercent(recap.average)}
        />
        <Stat label="Hari dihitung" value={String(counted)} />
        <Stat label="Tugas tuntas" value={`${done} dari ${total}`} />
        <Stat label="TL atau Tertunda" value={String(recap.open.length)} />
      </dl>

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Skor per hari</h3>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Skor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recap.days.map((d) => {
                const badge = STATE_BADGE[d.state]
                return (
                  <TableRow key={d.date}>
                    <TableCell className="whitespace-nowrap">{day(d.date)}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.pct === null ? "—" : formatPercent(d.pct)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Rincian per sumber</h3>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sumber</TableHead>
                <TableHead className="text-right">Tuntas</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Persen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SOURCES.map((s) => {
                const { done: d, total: t } = recap.bySource[s]
                return (
                  <TableRow key={s}>
                    <TableCell>{SOURCE_LABEL[s]}</TableCell>
                    <TableCell className="text-right tabular-nums">{d}</TableCell>
                    <TableCell className="text-right tabular-nums">{t}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t === 0 ? "—" : formatPercent((d / t) * 100)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Tugas TL atau Tertunda</h3>
        {recap.open.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada pada periode ini.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tugas</TableHead>
                  <TableHead>Sumber</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recap.open.map((o) => (
                  <TableRow key={`${o.date}:${o.key}`}>
                    <TableCell className="whitespace-nowrap">{day(o.date)}</TableCell>
                    <TableCell className="break-words whitespace-normal">{o.title}</TableCell>
                    <TableCell>{SOURCE_LABEL[o.source]}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {o.status === "TL" && <Badge variant="outline" size="sm">Tindak lanjut</Badge>}
                        {o.overdueDays > 0 && (
                          <Badge variant="warning-light" size="sm">
                            Tertunda {o.overdueDays} hari
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Hambatan</h3>
        {recap.obstacles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada hambatan yang dilaporkan.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {recap.obstacles.map((o) => (
              <li key={o.date} className="flex flex-col gap-1 p-3 sm:flex-row sm:gap-4">
                <span className="shrink-0 text-sm text-muted-foreground sm:w-32">
                  {day(o.date)}
                </span>
                <p className="min-w-0 whitespace-pre-line break-words">{o.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
