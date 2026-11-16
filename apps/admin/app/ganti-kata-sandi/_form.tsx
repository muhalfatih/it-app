"use client"

import * as React from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"

import { changePasswordAction, type ChangePasswordState } from "./actions"

const FIELDS = [
  {
    name: "current",
    label: "Kata sandi saat ini",
    autoComplete: "current-password",
  },
  {
    name: "next",
    label: "Kata sandi baru",
    autoComplete: "new-password",
    hint: "Minimal 8 karakter, berbeda dari yang sekarang.",
  },
  {
    name: "confirm",
    label: "Ulangi kata sandi baru",
    autoComplete: "new-password",
  },
] as const

export function ChangePasswordForm() {
  const [state, action, pending] = React.useActionState<
    ChangePasswordState,
    FormData
  >(changePasswordAction, {})
  const formRef = React.useRef<HTMLFormElement>(null)

  // Galat dari server: pindahkan fokus ke field pertama yang perlu diperbaiki.
  React.useEffect(() => {
    const first = FIELDS.find((f) => state.errors?.[f.name])
    if (!first) return
    const input = formRef.current?.elements.namedItem(first.name)
    if (input instanceof HTMLInputElement) input.select()
  }, [state])

  return (
    <form
      ref={formRef}
      // Kirim lewat onSubmit (bukan prop action) agar isian tidak direset saat server menolak.
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        React.startTransition(() => action(data))
      }}
    >
      <FieldGroup>
        {FIELDS.map((f, i) => {
          const error = state.errors?.[f.name]
          return (
            <Field key={f.name} data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={f.name}>{f.label}</FieldLabel>
              <Input
                id={f.name}
                name={f.name}
                type="password"
                autoComplete={f.autoComplete}
                autoFocus={i === 0}
                aria-invalid={error ? true : undefined}
                required
              />
              {error ? (
                <FieldError>{error}</FieldError>
              ) : "hint" in f ? (
                <FieldDescription>{f.hint}</FieldDescription>
              ) : null}
            </Field>
          )
        })}
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Simpan kata sandi
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
