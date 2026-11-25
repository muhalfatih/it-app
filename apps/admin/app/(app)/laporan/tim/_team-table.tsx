"use client"

import * as React from "react"
import Link from "next/link"
import { CircleDotIcon, GaugeIcon, LockOpenIcon, UserIcon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { StatusBadge } from "@workspace/ui/components/domain/status-badge"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import type { ReportState } from "@/lib/report/rules"

import { STATE_BADGE } from "../_state"
import { unlock } from "./actions"

export type TeamRow = {
  id: string
  name: string
  state: ReportState
  /** Label skor siap tampil, null bila tidak ada tugas. */
  score: string | null
}

function UnlockButton({
  userId,
  name,
  date,
}: {
  userId: string
  name: string
  date: string
}) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function confirm() {
    setError(null)
    startTransition(async () => {
      const r = await unlock(userId, date)
      if ("error" in r) {
        setError(r.error)
        return
      }
      toast.success(`Laporan ${name} dibuka`)
      setOpen(false)
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <AlertDialogTrigger
        render={<Button variant="outline" size="sm" />}
      >
        <LockOpenIcon data-icon="inline-start" />
        Buka kunci
        <span className="sr-only"> laporan {name}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Buka kunci laporan {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Laporan dihitung ulang dari data terkini dan bisa diisi lagi. Kunci
            tetap terbuka sampai {name} menekan Kirim.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button disabled={pending} onClick={confirm}>
            {pending && <Spinner data-icon="inline-start" />}
            Buka kunci
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function TeamTable({
  date,
  rows,
  canUnlock,
}: {
  date: string
  rows: TeamRow[]
  canUnlock: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead icon={UserIcon}>Nama</TableHead>
            <TableHead icon={CircleDotIcon}>Status</TableHead>
            <TableHead icon={GaugeIcon} numeric>Skor hari ini</TableHead>
            {canUnlock && (
              <TableHead className="w-40">
                <span className="sr-only">Aksi</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const badge = STATE_BADGE[r.state]
            return (
              <TableRow key={r.id}>
                <TableCell data-label="Nama" className="font-medium">
                  <Link
                    href={`/laporan/tim/${r.id}?tanggal=${date}`}
                    className="underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {r.name}
                  </Link>
                </TableCell>
                <TableCell icon={CircleDotIcon} data-label="Status">
                  <StatusBadge variant={badge.variant}>{badge.label}</StatusBadge>
                </TableCell>
                <TableCell icon={GaugeIcon} numeric data-label="Skor hari ini">{r.score ?? "—"}</TableCell>
                {canUnlock && (
                  <TableCell data-label="Aksi">
                    {r.state === "terkunci" && (
                      <UnlockButton userId={r.id} name={r.name} date={date} />
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
