"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CircleAlertIcon, PackageCheckIcon } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Pattern as DatePicker } from "@workspace/ui/components/examples/c-calendar-24"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@workspace/ui/components/reui/number-field"
import { TimePicker } from "@workspace/ui/components/reui/time-picker"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import { TIME_PICKER_I18N_ID } from "@workspace/ui/lib/i18n-id"

import { toDate, toIso } from "@/lib/date-value"
import { returnInputSchema } from "@/lib/inventaris/schema"
import type { LoanView } from "@/lib/inventaris/queries"

import { returnLoanAction } from "./actions"

type Draft = { problemQty: number; problemNote: string }

export function ReturnForm({
  loan,
  now,
}: {
  loan: LoanView
  /** Waktu WIB saat halaman dirender, untuk nilai awal. */
  now: { date: string; time: string }
}) {
  const router = useRouter()
  const formId = React.useId()
  const formRef = React.useRef<HTMLFormElement>(null)
  const [date, setDate] = React.useState(now.date)
  const [time, setTime] = React.useState<string | null>(now.time)
  const [drafts, setDrafts] = React.useState<Record<number, Draft>>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const draft = (id: number): Draft =>
    drafts[id] ?? { problemQty: 0, problemNote: "" }
  const patch = (id: number, p: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...draft(id), ...p } }))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setServerError(null)
    const found: Record<string, string> = {}
    if (!time) found.returnedAt = "Isi jam kembali"
    const input = {
      returnedAt: new Date(`${date}T${time ?? "00:00"}:00+07:00`),
      items: loan.items.map((i) => ({
        equipmentId: i.equipmentId,
        problemQty: draft(i.equipmentId).problemQty,
        problemNote: draft(i.equipmentId).problemNote || null,
      })),
    }
    const parsed = returnInputSchema.safeParse(input)
    if (!parsed.success)
      for (const i of parsed.error.issues) {
        const [head, index] = i.path
        const key =
          head === "items" && typeof index === "number"
            ? `note-${loan.items[index]?.equipmentId}`
            : "returnedAt"
        found[key] ??= i.message
      }
    if (input.returnedAt.getTime() < loan.startedAt.getTime())
      found.returnedAt ??= "Waktu kembali tidak boleh sebelum waktu pinjam"
    if (Object.keys(found).length) {
      setErrors(found)
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus()
      )
      return
    }
    setErrors({})
    startTransition(async () => {
      const result = await returnLoanAction(loan.id, input)
      if ("error" in result) return setServerError(result.error)
      router.refresh()
    })
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Catat pengembalian</CardTitle>
        <CardDescription>
          Semua alat dikembalikan sekaligus. Alat rusak atau hilang menahan
          stok sampai Manajer memulihkannya.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-6">
          {serverError && (
            <Alert variant="destructive" role="alert">
              <CircleAlertIcon />
              <AlertTitle>Pengembalian belum tercatat</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <fieldset disabled={pending} className="m-0 min-w-0 border-0 p-0">
            <FieldGroup>
              <FieldSet data-invalid={errors.returnedAt ? true : undefined}>
                <FieldLegend variant="label">Waktu kembali</FieldLegend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel
                      id={`${formId}-date-label`}
                      htmlFor={`${formId}-date`}
                    >
                      Tanggal
                    </FieldLabel>
                    <DatePicker
                      id={`${formId}-date`}
                      aria-labelledby={`${formId}-date-label ${formId}-date`}
                      value={toDate(date)}
                      onChange={(d) => d && setDate(toIso(d))}
                      disabledDays={{ after: toDate(now.date)! }}
                      aria-invalid={errors.returnedAt ? true : undefined}
                      aria-describedby={
                        errors.returnedAt ? `${formId}-returned-error` : undefined
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${formId}-time`}>Jam (WIB)</FieldLabel>
                    <TimePicker
                      id={`${formId}-time`}
                      value={time}
                      onValueChange={setTime}
                      invalid={!!errors.returnedAt}
                      aria-describedby={
                        errors.returnedAt ? `${formId}-returned-error` : undefined
                      }
                      i18n={TIME_PICKER_I18N_ID}
                      className="w-full"
                    />
                  </Field>
                </div>
                <FieldError id={`${formId}-returned-error`}>
                  {errors.returnedAt}
                </FieldError>
              </FieldSet>

              {loan.items.map((i) => {
                const d = draft(i.equipmentId)
                const noteErr = errors[`note-${i.equipmentId}`]
                return (
                  <FieldSet key={i.equipmentId}>
                    <FieldLegend variant="label">
                      {i.equipmentName} · {i.brand} ({i.qty} unit)
                    </FieldLegend>
                    <Field>
                      <FieldLabel htmlFor={`${formId}-q-${i.equipmentId}`}>
                        Rusak atau hilang
                      </FieldLabel>
                      <NumberField
                        id={`${formId}-q-${i.equipmentId}`}
                        min={0}
                        max={i.qty}
                        step={1}
                        value={d.problemQty}
                        onValueChange={(v) =>
                          patch(i.equipmentId, { problemQty: v ?? 0 })
                        }
                        className="w-40"
                      >
                        <NumberFieldGroup>
                          <NumberFieldDecrement
                            aria-label={`Kurangi jumlah bermasalah ${i.equipmentName}`}
                          />
                          <NumberFieldInput
                            autoComplete="off"
                            className="w-14 text-center tabular-nums"
                          />
                          <NumberFieldIncrement
                            aria-label={`Tambah jumlah bermasalah ${i.equipmentName}`}
                          />
                        </NumberFieldGroup>
                      </NumberField>
                    </Field>
                    {d.problemQty > 0 ? (
                      <Field data-invalid={noteErr ? true : undefined}>
                        <FieldLabel htmlFor={`${formId}-n-${i.equipmentId}`}>
                          Catatan kendala
                        </FieldLabel>
                        <Textarea
                          id={`${formId}-n-${i.equipmentId}`}
                          name={`catatan-${i.equipmentId}`}
                          maxLength={500}
                          value={d.problemNote}
                          onChange={(e) =>
                            patch(i.equipmentId, { problemNote: e.target.value })
                          }
                          placeholder="Apa yang terjadi pada alat…"
                          aria-invalid={noteErr ? true : undefined}
                          aria-describedby={
                            noteErr ? `${formId}-ne-${i.equipmentId}` : undefined
                          }
                        />
                        <FieldError id={`${formId}-ne-${i.equipmentId}`}>
                          {noteErr}
                        </FieldError>
                      </Field>
                    ) : null}
                  </FieldSet>
                )
              })}
            </FieldGroup>
          </fieldset>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PackageCheckIcon data-icon="inline-start" />
              )}
              Simpan pengembalian
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
