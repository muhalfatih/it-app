import { cn } from "cn"

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

// Diadaptasi dari blok login-02: login username (akun dibuat Manajer, tanpa pendaftaran); tombol SSO ada di pemanggil.
export function LoginForm({
  className,
  error,
  pending,
  ...props
}: React.ComponentProps<"form"> & { error?: string; pending?: boolean }) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Masuk</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Pakai username dan kata sandi dari Manajer unit.
          </p>
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
          <FieldDescription>
            Lupa kata sandi? Minta Manajer mengatur ulang dari menu Setting.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
