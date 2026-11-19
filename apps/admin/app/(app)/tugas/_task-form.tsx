"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CircleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import { managerTaskSchema } from "@/lib/manager-task/schema"

import { saveTask } from "./actions"

export type StaffOption = { value: string; label: string }
export type TaskDraft = {
  id: number
  title: string
  note: string | null
  startDate: string
  endDate: string
  assigneeIds: string[]
}

type Errors = Partial<Record<"title" | "assignees" | "dates" | "note", string>>

function toErrors(issues: { path: PropertyKey[]; message: string }[]): Errors {
  const map: Record<string, keyof Errors> = {
    title: "title",
    assigneeIds: "assignees",
    startDate: "dates",
    endDate: "dates",
    note: "note",
  }
  const errors: Errors = {}
  for (const issue of issues) {
    const key = map[String(issue.path[0] ?? "")]
    if (key) errors[key] ??= issue.message
  }
  return errors
}

export function TaskForm({
  task,
  staff,
}: {
  task?: TaskDraft
  staff: StaffOption[]
}) {
  const router = useRouter()
  const formId = React.useId()
  const anchor = useComboboxAnchor()
  const [title, setTitle] = React.useState(task?.title ?? "")
  const [note, setNote] = React.useState(task?.note ?? "")
  const [startDate, setStartDate] = React.useState(task?.startDate ?? "")
  const [endDate, setEndDate] = React.useState(task?.endDate ?? "")
  const [selected, setSelected] = React.useState<StaffOption[]>(() =>
    staff.filter((s) => task?.assigneeIds.includes(s.value))
  )
  const [errors, setErrors] = React.useState<Errors>({})
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()
  const [confirmDiscard, setConfirmDiscard] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)

  const values = JSON.stringify([title, note, startDate, endDate, selected])
  const [initialValues] = React.useState(values)
  const dirty = values !== initialValues

  React.useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setServerError(null)
    const parsed = managerTaskSchema.safeParse({
      title,
      note: note || undefined,
      startDate,
      endDate,
      assigneeIds: selected.map((s) => s.value),
    })
    if (!parsed.success) {
      setErrors(toErrors(parsed.error.issues))
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus()
      )
      return
    }
    setErrors({})
    startTransition(async () => {
      const result = await saveTask(task?.id ?? null, parsed.data)
      if ("error" in result) return setServerError(result.error)
      toast.success("Tugas disimpan")
      router.push("/tugas")
    })
  }

  const invalid = (key: keyof Errors) => (errors[key] ? true : undefined)
  const errorId = (key: keyof Errors) => `${formId}-${key}-error`
  const describedBy = (key: keyof Errors) =>
    errors[key] ? errorId(key) : undefined
  const leave = () => router.push("/tugas")

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
          <AlertTitle>Tugas belum tersimpan</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <fieldset disabled={pending} className="m-0 min-w-0 border-0 p-0">
        <FieldGroup>
          <Field data-invalid={invalid("title")}>
            <FieldLabel htmlFor={`${formId}-title`}>Judul tugas</FieldLabel>
            <Input
              id={`${formId}-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={invalid("title")}
              aria-describedby={describedBy("title")}
              maxLength={120}
              autoComplete="off"
            />
            <FieldError id={errorId("title")}>{errors.title}</FieldError>
          </Field>

          <Field data-invalid={invalid("assignees")}>
            <FieldLabel htmlFor={`${formId}-staff`}>Staf</FieldLabel>
            <Combobox
              multiple
              items={staff}
              value={selected}
              onValueChange={setSelected}
              isItemEqualToValue={(a: StaffOption, b: StaffOption) =>
                a.value === b.value
              }
            >
              <ComboboxChips ref={anchor}>
                <ComboboxValue>
                  {(chosen: StaffOption[]) => (
                    <>
                      {chosen.map((s) => (
                        <ComboboxChip key={s.value}>{s.label}</ComboboxChip>
                      ))}
                      <ComboboxChipsInput
                        id={`${formId}-staff`}
                        placeholder={chosen.length ? "" : "Pilih satu atau lebih staf"}
                        aria-invalid={invalid("assignees")}
                        aria-describedby={describedBy("assignees")}
                      />
                    </>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={anchor}>
                <ComboboxEmpty>Staf tidak ditemukan.</ComboboxEmpty>
                <ComboboxList>
                  {(s: StaffOption) => (
                    <ComboboxItem key={s.value} value={s}>
                      {s.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <FieldError id={errorId("assignees")}>{errors.assignees}</FieldError>
          </Field>

          <FieldSet data-invalid={invalid("dates")}>
            <FieldLegend variant="label">Rentang tanggal</FieldLegend>
            <FieldDescription>
              Tugas muncul di laporan tiap hari kerja dalam rentang ini. Tanggal
              mulai boleh di masa lalu.
            </FieldDescription>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${formId}-start`}>Mulai</FieldLabel>
                <Input
                  id={`${formId}-start`}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-invalid={invalid("dates")}
                  aria-describedby={describedBy("dates")}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-end`}>Selesai</FieldLabel>
                <Input
                  id={`${formId}-end`}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-invalid={invalid("dates")}
                  aria-describedby={describedBy("dates")}
                />
              </Field>
            </div>
            <FieldError id={errorId("dates")}>{errors.dates}</FieldError>
          </FieldSet>

          <Field data-invalid={invalid("note")}>
            <FieldLabel htmlFor={`${formId}-note`}>Catatan (opsional)</FieldLabel>
            <Textarea
              id={`${formId}-note`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-invalid={invalid("note")}
              aria-describedby={describedBy("note")}
              maxLength={2000}
              rows={4}
            />
            <FieldError id={errorId("note")}>{errors.note}</FieldError>
          </Field>
        </FieldGroup>
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          Simpan
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => (dirty ? setConfirmDiscard(true) : leave())}
        >
          Batal
        </Button>
      </div>
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buang perubahan?</AlertDialogTitle>
            <AlertDialogDescription>
              Perubahan yang belum disimpan akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Lanjut mengubah</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={leave}>
              Buang perubahan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
