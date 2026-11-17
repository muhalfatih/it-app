"use client"

import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { Textarea } from "@workspace/ui/components/textarea"

/** Dialog catatan wajib: pengembalian kartu dan batal centang Tayang. */
export function NoteDialog({
  open,
  title,
  description,
  label,
  confirmLabel,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  label: string
  confirmLabel: string
  onOpenChange: (open: boolean) => void
  /** Kembalikan pesan galat untuk ditampilkan, atau null bila berhasil. */
  onConfirm: (note: string) => Promise<string | null>
}) {
  const id = React.useId()
  const [note, setNote] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function close(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setNote("")
      setError(null)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) {
      setError(`${label} wajib diisi`)
      return
    }
    startTransition(async () => {
      const message = await onConfirm(note)
      if (message) setError(message)
      else close(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Textarea
              id={id}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              rows={4}
              aria-invalid={error ? true : undefined}
              autoFocus
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => close(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
