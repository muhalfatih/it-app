"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CircleAlertIcon, SaveIcon } from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  LoanItemRows,
  type LoanOption,
  type LoanRow,
} from "@workspace/ui/components/domain/loan-item-rows"
import { Pattern as DatePicker } from "@workspace/ui/components/examples/c-calendar-24"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { TimePicker } from "@workspace/ui/components/reui/time-picker"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import { TIME_PICKER_I18N_ID } from "@workspace/ui/lib/i18n-id"

import { toDate, toIso } from "@/lib/date-value"
import { loanInputSchema } from "@/lib/inventaris/schema"

import { createLoanAction } from "./actions"

type Key = "borrower" | "unit" | "wa" | "started" | "due" | "items"
type Errors = Partial<Record<Key, string>>

const PATH_TO_KEY: Record<string, Key> = {
  borrowerName: "borrower",
  unitId: "unit",
  waNumber: "wa",
  startedAt: "started",
  dueAt: "due",
  items: "items",
}

const wib = (date: string, time: string) =>
  new Date(`${date}T${time}:00+07:00`)

export function LoanForm({
  units,
  equipment,
  now,
}: {
  units: { id: number; name: string }[]
  equipment: LoanOption[]
  /** Waktu WIB saat halaman dirender, untuk nilai awal. */
  now: { date: string; time: string }
}) {
  const router = useRouter()
  const formId = React.useId()
  const formRef = React.useRef<HTMLFormElement>(null)
  const unitItems = React.useMemo(
    () => units.map((u) => ({ value: String(u.id), label: u.name })),
    [units]
  )
  const [borrower, setBorrower] = React.useState("")
  const [unitId, setUnitId] = React.useState("")
  const [wa, setWa] = React.useState("")
  const [startDate, setStartDate] = React.useState(now.date)
  const [startTime, setStartTime] = React.useState<string | null>(now.time)
  const [dueDate, setDueDate] = React.useState(now.date)
  const [dueTime, setDueTime] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<LoanRow[]>([
    { equipmentId: null, qty: 1 },
  ])
  const [errors, setErrors] = React.useState<Errors>({})
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function focusFirstInvalid() {
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus()
    )
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setServerError(null)
    const found: Errors = {}
    if (!unitId) found.unit = "Pilih unit peminjam"
    if (!startTime) found.started = "Isi jam pinjam"
    if (!dueTime) found.due = "Isi jam rencana kembali"
    if (rows.some((r) => r.equipmentId === null || r.qty < 1))
      found.items = "Pilih alat dan isi jumlah di semua baris"
    const input = {
      borrowerName: borrower,
      unitId: Number(unitId),
      waNumber: wa,
      startedAt: wib(startDate, startTime ?? "00:00"),
      dueAt: wib(dueDate, dueTime ?? "00:00"),
      items: rows.map((r) => ({ equipmentId: r.equipmentId, qty: r.qty })),
    }
    const parsed = loanInputSchema.safeParse(input)
    if (!parsed.success)
      for (const i of parsed.error.issues) {
        const key = PATH_TO_KEY[String(i.path[0] ?? "")]
        if (key) found[key] ??= i.message
      }
    if (Object.keys(found).length) {
      setErrors(found)
      return focusFirstInvalid()
    }
    setErrors({})
    startTransition(async () => {
      const result = await createLoanAction(input)
      if ("error" in result) return setServerError(result.error)
      router.push("/inventaris/peminjaman")
    })
  }

  const invalid = (key: Key) => (errors[key] ? true : undefined)
  const errorId = (key: Key) => `${formId}-${key}-error`
  const describedBy = (key: Key) => (errors[key] ? errorId(key) : undefined)

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="flex max-w-3xl flex-col gap-6"
    >
      {serverError && (
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon />
          <AlertTitle>Peminjaman belum tercatat</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <fieldset disabled={pending} className="m-0 min-w-0 border-0 p-0">
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={invalid("borrower")}>
              <FieldLabel htmlFor={`${formId}-borrower`}>
                Nama peminjam
              </FieldLabel>
              <Input
                id={`${formId}-borrower`}
                name="peminjam"
                autoComplete="off"
                maxLength={80}
                value={borrower}
                onChange={(e) => setBorrower(e.target.value)}
                aria-invalid={invalid("borrower")}
                aria-describedby={describedBy("borrower")}
              />
              <FieldError id={errorId("borrower")}>
                {errors.borrower}
              </FieldError>
            </Field>
            <Field data-invalid={invalid("unit")}>
              <FieldLabel htmlFor={`${formId}-unit`}>Unit</FieldLabel>
              <Select
                items={unitItems}
                value={unitId || null}
                onValueChange={(v) => setUnitId(v ?? "")}
              >
                <SelectTrigger
                  id={`${formId}-unit`}
                  className="w-full"
                  aria-invalid={invalid("unit")}
                  aria-describedby={describedBy("unit")}
                >
                  <SelectValue placeholder="Pilih unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {unitItems.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError id={errorId("unit")}>{errors.unit}</FieldError>
            </Field>
          </div>

          <Field data-invalid={invalid("wa")}>
            <FieldLabel htmlFor={`${formId}-wa`}>
              Nomor WhatsApp (opsional)
            </FieldLabel>
            <Input
              id={`${formId}-wa`}
              name="whatsapp"
              type="tel"
              inputMode="tel"
              spellCheck={false}
              autoComplete="off"
              placeholder="mis. 08123456789…"
              value={wa}
              onChange={(e) => setWa(e.target.value)}
              aria-invalid={invalid("wa")}
              aria-describedby={describedBy("wa")}
            />
            <FieldError id={errorId("wa")}>{errors.wa}</FieldError>
          </Field>

          <FieldSet data-invalid={invalid("started")}>
            <FieldLegend variant="label">Waktu pinjam</FieldLegend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  id={`${formId}-sd-label`}
                  htmlFor={`${formId}-sd`}
                >
                  Tanggal
                </FieldLabel>
                <DatePicker
                  id={`${formId}-sd`}
                  aria-labelledby={`${formId}-sd-label ${formId}-sd`}
                  value={toDate(startDate)}
                  onChange={(d) => d && setStartDate(toIso(d))}
                  disabledDays={{ after: toDate(now.date)! }}
                  aria-invalid={invalid("started")}
                  aria-describedby={describedBy("started")}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-st`}>Jam (WIB)</FieldLabel>
                <TimePicker
                  id={`${formId}-st`}
                  value={startTime}
                  onValueChange={setStartTime}
                  invalid={!!errors.started}
                  aria-describedby={describedBy("started")}
                  i18n={TIME_PICKER_I18N_ID}
                  className="w-full"
                />
              </Field>
            </div>
            <FieldError id={errorId("started")}>{errors.started}</FieldError>
          </FieldSet>

          <FieldSet data-invalid={invalid("due")}>
            <FieldLegend variant="label">Rencana kembali</FieldLegend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  id={`${formId}-dd-label`}
                  htmlFor={`${formId}-dd`}
                >
                  Tanggal
                </FieldLabel>
                <DatePicker
                  id={`${formId}-dd`}
                  aria-labelledby={`${formId}-dd-label ${formId}-dd`}
                  value={toDate(dueDate)}
                  onChange={(d) => d && setDueDate(toIso(d))}
                  disabledDays={{ before: toDate(startDate)! }}
                  aria-invalid={invalid("due")}
                  aria-describedby={describedBy("due")}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-dt`}>Jam (WIB)</FieldLabel>
                <TimePicker
                  id={`${formId}-dt`}
                  value={dueTime}
                  onValueChange={setDueTime}
                  invalid={!!errors.due}
                  aria-describedby={describedBy("due")}
                  i18n={TIME_PICKER_I18N_ID}
                  className="w-full"
                />
              </Field>
            </div>
            <FieldError id={errorId("due")}>{errors.due}</FieldError>
          </FieldSet>

          <Field data-invalid={invalid("items")}>
            <LoanItemRows rows={rows} options={equipment} onChange={setRows} />
            {equipment.length === 0 ? (
              <FieldDescription>
                Tidak ada alat yang tersedia untuk dipinjam saat ini.
              </FieldDescription>
            ) : null}
            <FieldError id={errorId("items")} role="alert">
              {errors.items}
            </FieldError>
          </Field>
        </FieldGroup>
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SaveIcon data-icon="inline-start" />
          )}
          Simpan peminjaman
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push("/inventaris/peminjaman")}
        >
          Batal
        </Button>
      </div>
    </form>
  )
}
