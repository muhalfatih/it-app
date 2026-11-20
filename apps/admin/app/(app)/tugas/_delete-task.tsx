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
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import { removeTask } from "./actions"

export function DeleteTask({
  id,
  title,
  isLastLinked = false,
}: {
  id: number
  title: string
  /** Tugas tertaut terakhir sebuah pengajuan SDM: catatan pembatalan wajib. */
  isLastLinked?: boolean
}) {
  const router = useRouter()
  const noteId = React.useId()
  const errorId = `${noteId}-error`
  const [open, setOpen] = React.useState(false)
  const [note, setNote] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await removeTask(id, isLastLinked ? note : undefined)
      if ("error" in result) return setError(result.error)
      toast.success("Tugas dihapus")
      setOpen(false)
      router.push("/tugas")
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        setOpen(next)
        if (!next) {
          setNote("")
          setError(null)
        }
      }}
    >
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <Trash2Icon data-icon="inline-start" />
        Hapus
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus tugas ini?</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” hilang dari laporan harian semua staf yang belum
            terkunci. Laporan yang sudah terkunci tetap utuh.
            {isLastLinked &&
              " Ini tugas terakhir dari sebuah pengajuan SDM, jadi pengajuan itu ikut dibatalkan."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {isLastLinked && (
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={noteId}>Catatan pembatalan untuk pengaju</FieldLabel>
            <Textarea
              id={noteId}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${noteId}-hint ${errorId}` : `${noteId}-hint`}
            />
            <FieldDescription id={`${noteId}-hint`}>Minimal 3 karakter.</FieldDescription>
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
            disabled={pending || (isLastLinked && note.trim().length < 3)}
            onClick={confirm}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Hapus tugas
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
