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

import { removeEntry } from "./actions"

export function DeleteEntry({
  id,
  name,
  confirmByName,
}: {
  id: number
  name: string
  /** Tahap terkunci: wajib mengetik nama konten persis. */
  confirmByName: boolean
}) {
  const router = useRouter()
  const inputId = React.useId()
  const errorId = `${inputId}-error`
  const [open, setOpen] = React.useState(false)
  const [typed, setTyped] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()
  const canConfirm = !confirmByName || typed.trim() === name

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await removeEntry(id, confirmByName ? typed : undefined)
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
          </AlertDialogDescription>
        </AlertDialogHeader>
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
