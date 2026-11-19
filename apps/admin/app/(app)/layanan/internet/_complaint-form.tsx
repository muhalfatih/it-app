"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import {
  CalendarIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  SendIcon,
} from "lucide-react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import {
  DateSelector,
  type DateSelectorValue,
} from "@workspace/ui/components/reui/date-selector"
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
import { Textarea } from "@workspace/ui/components/textarea"
import {
  DATE_SELECTOR_I18N_ID,
  TIME_PICKER_I18N_ID,
} from "@workspace/ui/lib/i18n-id"

import { ISSUE_LABELS, nowWib, OTHERS_LABELS } from "@/lib/layanan/rules"
import { complaintInputSchema } from "@/lib/layanan/schema"
import type { Issue, OthersAffected } from "@/lib/layanan/types"

import { submitComplaintAction } from "./actions"

const THANKS =
  "Terima kasih, pengaduan Anda sudah kami terima dan akan menjadi bahan evaluasi layanan internet sekolah."
const DESC_MAX = 1000

type Key = "building" | "room" | "issue" | "started" | "others" | "description"
type Errors = Partial<Record<Key, string>>

const PATH_TO_KEY: Record<string, Key> = {
  buildingId: "building",
  room: "room",
  issue: "issue",
  startedAt: "started",
  othersAffected: "others",
  description: "description",
}

type Option = { value: string; label: string }

export function ComplaintForm({
  buildings,
  now,
}: {
  buildings: Option[]
  /** Waktu WIB saat halaman dirender, untuk nilai awal. */
  now: { date: string; time: string }
}) {
  const formId = React.useId()
  const formRef = React.useRef<HTMLFormElement>(null)
  const doneRef = React.useRef<HTMLHeadingElement>(null)
  const [buildingId, setBuildingId] = React.useState("")
  const [room, setRoom] = React.useState("")
  const [issue, setIssue] = React.useState<Issue | "">("")
  const [date, setDate] = React.useState(now.date)
  const [time, setTime] = React.useState<string | null>(now.time)
  const [dateOpen, setDateOpen] = React.useState(false)
  const [others, setOthers] = React.useState<OthersAffected | "">("")
  const [description, setDescription] = React.useState("")
  const [errors, setErrors] = React.useState<Errors>({})
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  const dateValue = React.useMemo<DateSelectorValue>(
    () => ({ period: "day", operator: "is", startDate: parseISO(date) }),
    [date]
  )
  // DateSelector juga memanggil onChange saat dipasang; abaikan nilai yang sama.
  const pickDate = React.useCallback(
    (v: DateSelectorValue) => {
      if (!v.startDate) return
      const next = format(v.startDate, "yyyy-MM-dd")
      if (next === date) return
      setDate(next)
      setDateOpen(false)
    },
    [date]
  )

  React.useEffect(() => {
    if (done) doneRef.current?.focus()
  }, [done])

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
    if (!buildingId) found.building = "Pilih gedung"
    if (!issue) found.issue = "Pilih jenis kendala"
    if (!time) found.started = "Isi jam mulai terjadi"
    if (!others) found.others = "Pilih salah satu jawaban"
    const parsed = complaintInputSchema.safeParse({
      buildingId: Number(buildingId),
      room,
      issue,
      startedAt: new Date(`${date}T${time ?? "00:00"}:00+07:00`),
      othersAffected: others,
      description: description.trim() || null,
    })
    if (!parsed.success)
      for (const i of parsed.error.issues) {
        const key = PATH_TO_KEY[String(i.path[0] ?? "")]
        if (key) found[key] ??= i.message
      }
    if (!parsed.success || Object.keys(found).length) {
      setErrors(found)
      return focusFirstInvalid()
    }
    setErrors({})
    startTransition(async () => {
      const result = await submitComplaintAction(parsed.data)
      if ("error" in result) return setServerError(result.error)
      setDone(true)
    })
  }

  function reset() {
    const n = nowWib()
    setBuildingId("")
    setRoom("")
    setIssue("")
    setDate(n.date)
    setTime(n.time)
    setOthers("")
    setDescription("")
    setDone(false)
    requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>("button, input")?.focus()
    )
  }

  if (done)
    return (
      <Empty className="max-w-3xl border" role="status">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleCheckIcon />
          </EmptyMedia>
          <EmptyTitle>
            <h2 ref={doneRef} tabIndex={-1} className="outline-none">
              Pengaduan terkirim
            </h2>
          </EmptyTitle>
          <EmptyDescription>{THANKS}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={reset}>
            Kirim pengaduan lain
          </Button>
        </EmptyContent>
      </Empty>
    )

  const invalid = (key: Key) => (errors[key] ? true : undefined)
  const errorId = (key: Key) => `${formId}-${key}-error`
  const describedBy = (key: Key, extra?: string) =>
    [extra, errors[key] ? errorId(key) : undefined].filter(Boolean).join(" ") ||
    undefined

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="flex max-w-3xl flex-col gap-6"
    >
      {serverError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Pengaduan belum terkirim</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <fieldset disabled={pending} className="m-0 min-w-0 border-0 p-0">
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={invalid("building")}>
              <FieldLabel htmlFor={`${formId}-building`}>Gedung</FieldLabel>
              <Select
                items={buildings}
                value={buildingId || null}
                onValueChange={(v) => setBuildingId(v ?? "")}
              >
                <SelectTrigger
                  id={`${formId}-building`}
                  className="w-full"
                  aria-invalid={invalid("building")}
                  aria-describedby={describedBy("building")}
                >
                  <SelectValue placeholder="Pilih gedung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {buildings.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldError id={errorId("building")}>{errors.building}</FieldError>
            </Field>
            <Field data-invalid={invalid("room")}>
              <FieldLabel htmlFor={`${formId}-room`}>Ruangan/Kelas</FieldLabel>
              <Input
                id={`${formId}-room`}
                name="ruangan"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="mis. Lab Komputer 2…"
                maxLength={80}
                autoComplete="off"
                aria-invalid={invalid("room")}
                aria-describedby={describedBy("room")}
              />
              <FieldError id={errorId("room")}>{errors.room}</FieldError>
            </Field>
          </div>

          <FieldSet data-invalid={invalid("issue")}>
            <FieldLegend variant="label">Jenis kendala</FieldLegend>
            <FieldDescription id={`${formId}-issue-desc`}>
              Pilih yang paling mendekati.
            </FieldDescription>
            <RadioGroup
              value={issue || null}
              onValueChange={(v) => setIssue(v as Issue)}
              aria-describedby={describedBy("issue", `${formId}-issue-desc`)}
              className="grid gap-2 sm:grid-cols-2"
            >
              {(Object.keys(ISSUE_LABELS) as Issue[]).map((k) => (
                <FieldLabel key={k} htmlFor={`${formId}-issue-${k}`}>
                  <Field orientation="horizontal">
                    <RadioGroupItem
                      value={k}
                      id={`${formId}-issue-${k}`}
                      aria-invalid={invalid("issue")}
                    />
                    <FieldContent>
                      <FieldTitle className="font-normal">
                        {k}. {ISSUE_LABELS[k]}
                      </FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
            <FieldError id={errorId("issue")}>{errors.issue}</FieldError>
          </FieldSet>

          <FieldSet data-invalid={invalid("started")}>
            <FieldLegend variant="label">Waktu mulai terjadi</FieldLegend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${formId}-date`}>Tanggal</FieldLabel>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        id={`${formId}-date`}
                        type="button"
                        variant="outline"
                        className="w-full justify-start font-normal"
                        aria-invalid={invalid("started")}
                        aria-describedby={describedBy("started")}
                      />
                    }
                  >
                    <CalendarIcon data-icon="inline-start" />
                    {format(parseISO(date), "EEEE, d MMMM yyyy", {
                      locale: localeId,
                    })}
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto">
                    <DateSelector
                      value={dateValue}
                      onChange={pickDate}
                      allowRange={false}
                      periodTypes={["day"]}
                      presetMode="is"
                      showTwoMonths={false}
                      dayDateFormat="dd/MM/yyyy"
                      minYear={Number(now.date.slice(0, 4)) - 1}
                      maxYear={Number(now.date.slice(0, 4))}
                      weekStartsOn={1}
                      locale={localeId}
                      i18n={DATE_SELECTOR_I18N_ID}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-time`}>Jam (WIB)</FieldLabel>
                <TimePicker
                  id={`${formId}-time`}
                  value={time}
                  onValueChange={setTime}
                  invalid={!!errors.started}
                  aria-describedby={describedBy("started")}
                  i18n={TIME_PICKER_I18N_ID}
                  className="w-full"
                />
              </Field>
            </div>
            <FieldError id={errorId("started")}>{errors.started}</FieldError>
          </FieldSet>

          <FieldSet data-invalid={invalid("others")}>
            <FieldLegend variant="label">
              Apakah pengguna lain di ruangan mengalami hal yang sama?
            </FieldLegend>
            <RadioGroup
              value={others || null}
              onValueChange={(v) => setOthers(v as OthersAffected)}
              aria-describedby={describedBy("others")}
              className="flex flex-wrap gap-x-6 gap-y-3"
            >
              {(Object.keys(OTHERS_LABELS) as OthersAffected[]).map((k) => (
                <Field key={k} orientation="horizontal" className="w-auto">
                  <RadioGroupItem
                    value={k}
                    id={`${formId}-others-${k}`}
                    aria-invalid={invalid("others")}
                  />
                  <FieldLabel
                    htmlFor={`${formId}-others-${k}`}
                    className="font-normal"
                  >
                    {OTHERS_LABELS[k]}
                  </FieldLabel>
                </Field>
              ))}
            </RadioGroup>
            <FieldError id={errorId("others")}>{errors.others}</FieldError>
          </FieldSet>

          <Field data-invalid={invalid("description")}>
            <FieldLabel htmlFor={`${formId}-description`}>
              Deskripsi kendala (opsional)
            </FieldLabel>
            <Textarea
              id={`${formId}-description`}
              name="deskripsi"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESC_MAX}
              placeholder="Ceritakan apa yang terjadi dan apa yang sudah dicoba…"
              aria-invalid={invalid("description")}
              aria-describedby={describedBy(
                "description",
                `${formId}-description-count`
              )}
            />
            <FieldDescription
              id={`${formId}-description-count`}
              className="text-right tabular-nums"
            >
              {description.length}/{DESC_MAX}
            </FieldDescription>
            <FieldError id={errorId("description")}>
              {errors.description}
            </FieldError>
          </Field>
        </FieldGroup>
      </fieldset>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SendIcon data-icon="inline-start" />
          )}
          Kirim pengaduan
        </Button>
      </div>
    </form>
  )
}
