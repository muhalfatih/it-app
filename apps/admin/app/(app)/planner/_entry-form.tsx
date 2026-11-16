"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CircleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  AssignmentRows,
  type Assignment,
  type Option,
} from "@workspace/ui/components/domain/assignment-rows"
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
import { Spinner } from "@workspace/ui/components/spinner"

import { entryInputSchema } from "@/lib/planner/schema"
import type { PlannerEntry } from "@/lib/planner/types"

import { saveEntry } from "./actions"

export type FormOptions = {
  people: Option[]
  taskTypes: Option[]
  channels: { id: number; name: string }[]
}

type Errors = Partial<
  Record<"name" | "activity" | "publishDate" | "assignments" | "channelIds", string>
>

/** Peta galat zod ke kolom formulir (galat pertama per kolom). */
function toErrors(issues: { path: PropertyKey[]; message: string }[]): Errors {
  const errors: Errors = {}
  for (const issue of issues) {
    const head = String(issue.path[0] ?? "")
    const key =
      head === "activityStart" || head === "activityEnd"
        ? "activity"
        : (head as keyof Errors)
    errors[key] ??= issue.message
  }
  return errors
}

export function EntryForm({
  entry,
  options,
  readOnly = false,
}: {
  entry?: PlannerEntry
  options: FormOptions
  readOnly?: boolean
}) {
  const router = useRouter()
  const formId = React.useId()
  const [name, setName] = React.useState(entry?.name ?? "")
  const [activityStart, setActivityStart] = React.useState(entry?.activityStart ?? "")
  const [activityEnd, setActivityEnd] = React.useState(entry?.activityEnd ?? "")
  const [publishDate, setPublishDate] = React.useState(entry?.publishDate ?? "")
  const [assignments, setAssignments] = React.useState<Assignment[]>(
    () =>
      entry?.assignments.map((a) => ({
        id: String(a.id),
        personId: a.userId,
        taskTypeId: String(a.taskTypeId),
        start: a.start,
        end: a.end,
      })) ?? []
  )
  const [channelIds, setChannelIds] = React.useState<number[]>(
    entry?.channels.map((c) => c.id) ?? []
  )
  const [errors, setErrors] = React.useState<Errors>({})
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const formRef = React.useRef<HTMLFormElement>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setServerError(null)
    const parsed = entryInputSchema.safeParse({
      name,
      activityStart: activityStart || null,
      activityEnd: activityEnd || null,
      publishDate,
      assignments,
      channelIds,
    })
    if (!parsed.success) {
      setErrors(toErrors(parsed.error.issues))
      // Fokus ke kolom bermasalah pertama setelah galat dirender.
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus()
      )
      return
    }
    setErrors({})
    startTransition(async () => {
      const result = await saveEntry(entry?.id ?? null, parsed.data)
      if ("error" in result) {
        setServerError(result.error)
        return
      }
      toast.success("Entri disimpan")
      if (entry) router.refresh()
      else router.push(`/planner/${result.id}`)
    })
  }

  const invalid = (key: keyof Errors) => (errors[key] ? true : undefined)

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex max-w-3xl flex-col gap-6">
      {serverError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Entri belum tersimpan</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      {/* fieldset disabled mematikan semua kontrol di dalamnya untuk mode baca saja. */}
      <fieldset disabled={readOnly || pending} className="m-0 min-w-0 border-0 p-0">
        <FieldGroup>
          <Field data-invalid={invalid("name")}>
            <FieldLabel htmlFor={`${formId}-name`}>Nama konten</FieldLabel>
            <Input
              id={`${formId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={invalid("name")}
              maxLength={120}
              autoComplete="off"
            />
            <FieldError>{errors.name}</FieldError>
          </Field>

          <FieldSet data-invalid={invalid("activity")}>
            <FieldLegend variant="label">Kegiatan (opsional)</FieldLegend>
            <FieldDescription>
              Isi mulai dan selesai bila konten meliput sebuah kegiatan.
            </FieldDescription>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${formId}-as`}>Mulai</FieldLabel>
                <Input
                  id={`${formId}-as`}
                  type="date"
                  value={activityStart}
                  onChange={(e) => setActivityStart(e.target.value)}
                  aria-invalid={invalid("activity")}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-ae`}>Selesai</FieldLabel>
                <Input
                  id={`${formId}-ae`}
                  type="date"
                  value={activityEnd}
                  onChange={(e) => setActivityEnd(e.target.value)}
                  aria-invalid={invalid("activity")}
                />
              </Field>
            </div>
            <FieldError>{errors.activity}</FieldError>
          </FieldSet>

          <FieldSet data-invalid={invalid("assignments")}>
            <FieldLegend variant="label">Penugasan</FieldLegend>
            <AssignmentRows
              value={assignments}
              onChange={setAssignments}
              people={options.people}
              taskTypes={options.taskTypes}
            />
            <FieldError>{errors.assignments}</FieldError>
          </FieldSet>

          <FieldSet data-invalid={invalid("channelIds")}>
            <FieldLegend variant="label">Kanal</FieldLegend>
            <div className="grid gap-2 sm:grid-cols-2">
              {options.channels.map((c) => {
                const id = `${formId}-ch-${c.id}`
                return (
                  <FieldLabel key={c.id} htmlFor={id}>
                    <Field orientation="horizontal">
                      <Checkbox
                        id={id}
                        checked={channelIds.includes(c.id)}
                        onCheckedChange={(checked) =>
                          setChannelIds((prev) =>
                            checked
                              ? [...prev, c.id]
                              : prev.filter((x) => x !== c.id)
                          )
                        }
                      />
                      <FieldContent>
                        <FieldTitle>{c.name}</FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                )
              })}
            </div>
            <FieldError>{errors.channelIds}</FieldError>
          </FieldSet>

          <Field data-invalid={invalid("publishDate")} className="max-w-xs">
            <FieldLabel htmlFor={`${formId}-pub`}>Tanggal tayang</FieldLabel>
            <Input
              id={`${formId}-pub`}
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
              aria-invalid={invalid("publishDate")}
            />
            <FieldError>{errors.publishDate}</FieldError>
          </Field>
        </FieldGroup>
      </fieldset>
      {!readOnly && (
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            Simpan
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => router.push("/planner")}
          >
            Batal
          </Button>
        </div>
      )}
    </form>
  )
}
