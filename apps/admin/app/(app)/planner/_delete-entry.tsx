"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Trash2Icon } from "lucide-react"
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
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

import { removeEntry } from "./actions"

export function DeleteEntry({
  id,
  name,
  confirmByName,
  linked = false,
}: {
  id: number
  name: string
  /** Tahap terkunci: wajib mengetik nama konten persis. */
  confirmByName: boolean
  /** Entri dari pengajuan SDM: catatan pembatalan wajib, pengajuan ikut dibatalkan. */
  linked?: boolean
}) {
  const router = useRouter()
  const inputId = React.useId()
  const noteId = `${inputId}-note`
  const errorId = `${inputId}-error`
  const [open, setOpen] = React.useState(false)
  const [typed, setTyped] = React.useState("")
  const [note, setNote] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()
  const canConfirm =
    (!confirmByName || typed.trim() === name) && (!linked || note.trim() !== "")

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await removeEntry(
        id,
        confirmByName ? typed : undefined,
        linked ? note : undefined
      )
      if ("error" in result) {
        setError(result.error)
        return
      }
      toast.success("Entri dihapus")
      setOpen(false)
      router.push("/planner")
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setTyped("")
          setNote("")
          setError(null)
        }
      }}
    >
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        <Trash2Icon data-icon="inline-start" />
        Hapus entri
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Penugasan, kanal, dan kartu konten beserta filenya ikut terhapus.
            Tindakan ini tidak bisa dibatalkan.
            {linked && " Pengajuan SDM yang tertaut ikut dibatalkan."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {linked && (
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={noteId}>Catatan pembatalan untuk pengaju</FieldLabel>
            <Textarea
              id={noteId}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </Field>
        )}
        {confirmByName && (
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={inputId}>Ketik nama konten</FieldLabel>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={name}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </Field>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!canConfirm || pending}
            onClick={confirm}
          >
            Hapus
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
