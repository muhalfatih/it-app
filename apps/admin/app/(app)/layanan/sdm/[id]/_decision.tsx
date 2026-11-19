"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { BanIcon, Undo2Icon, XCircleIcon, type LucideIcon } from "lucide-react"
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import type { CrudResult } from "@/lib/setting-crud"

import { cancelAction, rejectAction, withdrawAction } from "./actions"

/** Dialog konfirmasi dengan catatan wajib dan (opsional) ketik nama. */
function DecisionDialog({
  trigger,
  title,
  description,
  noteLabel,
  confirmLabel,
  confirmName,
  run,
  success,
}: {
  trigger: { label: string; icon: LucideIcon; variant: "outline" | "destructive" }
  title: string
  description: string
  /** Tanpa noteLabel: tanpa textarea (cukup konfirmasi). */
  noteLabel?: string
  confirmLabel: string
  /** Bila diisi, pengguna wajib mengetik teks ini persis. */
  confirmName?: string
  run: (note: string, typedName?: string) => Promise<CrudResult>
  success: { message: string; href?: string }
}) {
  const router = useRouter()
  const id = React.useId()
  const errorId = `${id}-error`
  const [open, setOpen] = React.useState(false)
  const [note, setNote] = React.useState("")
  const [typed, setTyped] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()
  const canConfirm =
    (!noteLabel || note.trim().length >= 3) &&
    (confirmName === undefined || typed.trim() === confirmName)

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await run(note, confirmName === undefined ? undefined : typed)
      if ("error" in result) return setError(result.error)
      toast.success(success.message)
      setOpen(false)
      if (success.href) router.push(success.href)
      else router.refresh()
    })
  }

  const described = error ? errorId : undefined
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        setOpen(next)
        if (!next) {
          setNote("")
          setTyped("")
          setError(null)
        }
      }}
    >
      <AlertDialogTrigger render={<Button variant={trigger.variant} />}>
        <trigger.icon data-icon="inline-start" />
        {trigger.label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {(noteLabel || confirmName !== undefined) && (
          <FieldGroup>
            {noteLabel && (
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor={`${id}-note`}>{noteLabel}</FieldLabel>
                <Textarea
                  id={`${id}-note`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  required
                  aria-invalid={error ? true : undefined}
                  aria-describedby={[`${id}-note-hint`, described].filter(Boolean).join(" ")}
                />
                <FieldDescription id={`${id}-note-hint`}>Minimal 3 karakter.</FieldDescription>
              </Field>
            )}
            {confirmName !== undefined && (
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor={`${id}-name`}>Ketik nama konten</FieldLabel>
                <Input
                  id={`${id}-name`}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={confirmName}
                  autoComplete="off"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={described}
                />
              </Field>
            )}
          </FieldGroup>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button variant="destructive" disabled={!canConfirm || pending} onClick={confirm}>
            {pending && <Spinner data-icon="inline-start" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function WithdrawRequest({ id }: { id: number }) {
  return (
    <DecisionDialog
      trigger={{ label: "Tarik pengajuan", icon: Undo2Icon, variant: "outline" }}
      title="Tarik pengajuan ini?"
      description="Pengajuan dan lampiran rundown dihapus. Anda bisa mengajukan lagi kapan saja."
      confirmLabel="Tarik pengajuan"
      run={() => withdrawAction(id)}
      success={{ message: "Pengajuan ditarik", href: "/layanan/sdm/saya" }}
    />
  )
}

export function RejectRequest({ id }: { id: number }) {
  return (
    <DecisionDialog
      trigger={{ label: "Tolak", icon: XCircleIcon, variant: "outline" }}
      title="Tolak pengajuan ini?"
      description="Alasan penolakan ditampilkan kepada pengaju."
      noteLabel="Alasan penolakan"
      confirmLabel="Tolak pengajuan"
      run={(note) => rejectAction(id, note)}
      success={{ message: "Pengajuan ditolak" }}
    />
  )
}

export function CancelRequest({
  id,
  followUp,
  confirmName,
}: {
  id: number
  followUp: "planner" | "tugas"
  /** Entri Planner di tahap Review ke atas: wajib ketik nama konten. */
  confirmName?: string
}) {
  return (
    <DecisionDialog
      trigger={{ label: "Batalkan pengajuan", icon: BanIcon, variant: "destructive" }}
      title="Batalkan pengajuan ini?"
      description={
        followUp === "planner"
          ? "Entri Planner beserta kartu konten dan filenya ikut terhapus. Pengaju melihat susunan SDM terakhir dan catatan Anda."
          : "Semua tugas tertaut ikut terhapus. Pengaju melihat susunan SDM terakhir dan catatan Anda."
      }
      noteLabel="Catatan pembatalan untuk pengaju"
      confirmLabel="Batalkan pengajuan"
      confirmName={confirmName}
      run={(note, typed) => cancelAction(id, note, typed)}
      success={{ message: "Pengajuan dibatalkan" }}
    />
  )
}
