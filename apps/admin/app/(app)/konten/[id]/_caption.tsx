"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { Textarea } from "@workspace/ui/components/textarea"

import { saveCaptionAction } from "../actions"

export function CaptionForm({
  cardId,
  caption,
}: {
  cardId: number
  caption: string | null
}) {
  const id = React.useId()
  const [value, setValue] = React.useState(caption ?? "")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()
  const dirty = value.trim() !== (caption ?? "")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await saveCaptionAction(cardId, value)
      if ("error" in result) setError(result.error)
      else toast.success("Caption disimpan")
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={id} className="sr-only">
          Caption
        </FieldLabel>
        <Textarea
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={5000}
          rows={6}
          placeholder="Tulis caption untuk postingan…"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
        />
        {error && <FieldError>{error}</FieldError>}
      </Field>
      <Button type="submit" className="self-end" disabled={pending || !dirty}>
        Simpan caption
      </Button>
    </form>
  )
}
