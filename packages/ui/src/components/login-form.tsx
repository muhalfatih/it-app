"use client"

import { cn } from "cn"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { MonitorPlayIcon } from "lucide-react"

// Diadaptasi dari blok login-05: login username (akun dibuat Manajer, tanpa pendaftaran); SSO opsional lewat onSso.
export function LoginForm({
  className,
  error,
  pending,
  onSso,
  ...props
}: React.ComponentProps<"form"> & {
  error?: string
  pending?: boolean
  onSso?: () => void
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <form {...props}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MonitorPlayIcon aria-hidden className="size-5" />
            </div>
            <h1 className="text-xl font-bold text-balance">Masuk ke Unit IT &amp; Media</h1>
            <FieldDescription>
              Pakai username dan kata sandi dari Manajer unit.
            </FieldDescription>
          </div>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              required
            />
          </Field>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={error ? true : undefined}
              required
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <Field>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? "Memeriksa…" : "Masuk"}
            </Button>
          </Field>
          {onSso ? (
            <>
              <FieldSeparator>atau</FieldSeparator>
              <Field>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={onSso}
                >
                  Masuk dengan Simtama ID
                </Button>
              </Field>
            </>
          ) : null}
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        Lupa kata sandi? Minta Manajer mengatur ulang dari menu Setting.
      </FieldDescription>
    </div>
  )
}
