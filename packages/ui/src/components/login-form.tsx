"use client"

import { cn } from "cn"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"
import { MonitorPlayIcon } from "lucide-react"

// Diadaptasi dari blok login-05: masuk hanya lewat Simtama ID (tanpa username/kata sandi lokal).
export function LoginForm({
  className,
  error,
  notice,
  pending,
  onSso,
  ...props
}: React.ComponentProps<"div"> & {
  /** Galat yang perlu ditindaklanjuti pengguna (diumumkan pembaca layar). */
  error?: string
  /** Informasi netral, mis. setelah keluar. */
  notice?: string
  pending?: boolean
  /** Tanpa onSso tombol nonaktif (SSO belum dikonfigurasi). */
  onSso?: () => void
}) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MonitorPlayIcon aria-hidden className="size-5" />
          </div>
          <h1 className="text-xl font-bold text-balance">
            Masuk ke Unit IT &amp; Media
          </h1>
          <FieldDescription>Pakai akun Simtama ID Anda.</FieldDescription>
        </div>
        <Field data-invalid={error ? true : undefined}>
          <Button
            type="button"
            disabled={pending || !onSso}
            onClick={onSso}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Membuka Simtama ID…" : "Masuk dengan Simtama ID"}
          </Button>
          {error ? (
            <FieldError className="text-center">{error}</FieldError>
          ) : notice ? (
            <FieldDescription
              role="status"
              className="text-center text-balance"
            >
              {notice}
            </FieldDescription>
          ) : null}
        </Field>
      </FieldGroup>
      <FieldDescription className="px-6 text-center">
        Belum bisa masuk? Hubungi Manajer unit.
      </FieldDescription>
    </div>
  )
}
