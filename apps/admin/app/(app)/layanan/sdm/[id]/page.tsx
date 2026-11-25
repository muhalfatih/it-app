import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { cache, type ReactNode } from "react"
import {
  CalendarIcon,
  CalendarPlusIcon,
  ClipboardListIcon,
  DownloadIcon,
  ListChecksIcon,
  MessageSquareTextIcon,
  UserIcon,
} from "lucide-react"

import { requirePermission } from "@workspace/auth/session"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { StatusBadge } from "@workspace/ui/components/domain/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { getRequestFor } from "@/lib/layanan/queries"
import { STATUS_LABELS } from "@/lib/layanan/rules"
import type { ServiceStatus } from "@/lib/layanan/types"
import { getEntry } from "@/lib/planner/queries"
import { canDeleteEntry, needsNameConfirm } from "@/lib/planner/rules"

import { rangeLabel, STATUS_VARIANT } from "../_request-table"
import { CancelRequest, RejectRequest, WithdrawRequest } from "./_decision"

type Props = { params: Promise<{ id: string }> }

const NOTE_TITLE: Record<ServiceStatus, string> = {
  diajukan: "Catatan Manajer",
  disetujui: "Catatan Manajer",
  ditolak: "Alasan penolakan",
  dibatalkan: "Catatan pembatalan",
}

const submittedAt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
})

function fileSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Satu kueri per permintaan, dipakai bersama metadata dan halaman. */
const load = cache(async (rawId: string) => {
  const user = await requirePermission("layanan.ajukan")
  const id = /^\d+$/.test(rawId) ? Number(rawId) : NaN
  // getRequestFor mengembalikan null untuk id tak dikenal maupun milik orang lain.
  const request = Number.isSafeInteger(id) ? await getRequestFor(user, id) : null
  return { user, request }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { request } = await load((await params).id)
  if (!request) notFound()
  return { title: `${request.activityName} · Pengajuan SDM` }
}

export default async function PengajuanDetailPage({ params }: Props) {
  const { user, request: r } = await load((await params).id)
  if (!r) notFound()

  const isManager = user.permissions.has("layanan.setujui_sdm")
  const isOwner = r.requestedBy.id === user.id
  const entry =
    isManager && r.status === "disetujui" && r.plannerEntryId !== null
      ? await getEntry(r.plannerEntryId)
      : null

  const details: [string, ReactNode][] = [
    ["Tanggal kegiatan", rangeLabel(r.startDate, r.endDate)],
    ["Unit pengaju", r.unitName],
    ["Pengaju", r.requestedBy.name],
    ["Nomor WhatsApp", r.waNumber],
    ["Dikirim", submittedAt.format(r.createdAt)],
  ]

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 text-2xl font-semibold tracking-tight break-words">
          {r.activityName}
        </h1>
        <StatusBadge variant={STATUS_VARIANT[r.status]}>{STATUS_LABELS[r.status]}</StatusBadge>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {isOwner && r.status === "diajukan" && <WithdrawRequest id={r.id} />}
          {isManager && r.status === "diajukan" && (
            <>
              <Link href={`/layanan/sdm/${r.id}/tugas`} className={buttonVariants()}>
                <ListChecksIcon data-icon="inline-start" />
                Setujui → Tugas dari Manajer
              </Link>
              <Link
                href={`/planner/baru?pengajuan=${r.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <CalendarPlusIcon data-icon="inline-start" />
                Setujui → Entri Planner
              </Link>
              <RejectRequest id={r.id} />
            </>
          )}
          {isManager &&
            r.status === "disetujui" &&
            r.followUp &&
            (!entry || canDeleteEntry(user.permissions, entry.stage)) && (
            <CancelRequest
              id={r.id}
              followUp={r.followUp}
              confirmName={entry && needsNameConfirm(entry.stage) ? entry.name : undefined}
            />
          )}
        </div>
      </div>

      {r.managerNote && (
        <Alert>
          <MessageSquareTextIcon />
          <AlertTitle>{NOTE_TITLE[r.status]}</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{r.managerNote}</AlertDescription>
        </Alert>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Data pengajuan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              {details.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="tabular-nums break-words">{value}</dd>
                </div>
              ))}
            </dl>
            {r.rundown && (
              <a
                href={`/api/layanan/rundown/${r.id}`}
                className={buttonVariants({ variant: "outline", className: "max-w-full" })}
              >
                <DownloadIcon data-icon="inline-start" />
                <span className="truncate">{r.rundown.name || "Rundown"}</span>
                <span className="text-muted-foreground">{fileSize(r.rundown.size)}</span>
              </a>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Susunan SDM</CardTitle>
            <CardDescription>
              {r.status === "diajukan" || r.status === "ditolak"
                ? "Kebutuhan yang diajukan; orang ditentukan Manajer saat menyetujui."
                : r.status === "dibatalkan"
                  ? "Susunan terakhir sebelum pengajuan dibatalkan."
                  : "Susunan terkini; perubahan oleh Manajer langsung tampil di sini."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead icon={UserIcon}>Nama</TableHead>
                    <TableHead icon={ClipboardListIcon}>Tugas</TableHead>
                    <TableHead icon={CalendarIcon}>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.staff.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell icon={UserIcon} data-label="Nama" className={s.name ? undefined : "text-muted-foreground"}>
                        {s.name ?? "Belum ditentukan"}
                      </TableCell>
                      <TableCell icon={ClipboardListIcon} data-label="Tugas" className="max-w-56 whitespace-normal">{s.label}</TableCell>
                      <TableCell icon={CalendarIcon} data-label="Tanggal" className="tabular-nums">{rangeLabel(s.start, s.end)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {isManager && r.status === "disetujui" && (
              <div className="flex flex-wrap gap-2">
                {r.plannerEntryId !== null && (
                  <Link
                    href={`/planner/${r.plannerEntryId}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Buka entri Planner
                  </Link>
                )}
                {r.taskIds.map((taskId, i) => (
                  <Link
                    key={taskId}
                    href={`/tugas/${taskId}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {r.taskIds.length === 1 ? "Buka tugas" : `Buka tugas ${i + 1}`}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
