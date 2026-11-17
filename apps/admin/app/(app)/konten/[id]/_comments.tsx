"use client"

import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { Textarea } from "@workspace/ui/components/textarea"

import { addCommentAction } from "../actions"

export function CommentForm({ cardId }: { cardId: number }) {
  const id = React.useId()
  const [body, setBody] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await addCommentAction(cardId, body)
      if ("error" in result) setError(result.error)
      else setBody("")
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={id} className="sr-only">
          Komentar
        </FieldLabel>
        <Textarea
          id={id}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Tulis masukan untuk kartu ini…"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
        />
        {error && <FieldError>{error}</FieldError>}
      </Field>
      <Button
        type="submit"
        variant="outline"
        className="self-end"
        disabled={pending || !body.trim()}
      >
        Kirim komentar
      </Button>
    </form>
  )
}
