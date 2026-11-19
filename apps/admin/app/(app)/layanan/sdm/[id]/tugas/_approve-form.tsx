"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CircleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  AssignmentRows,
  type Assignment,
  type Option,
} from "@workspace/ui/components/domain/assignment-rows"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import { approveTasksSchema } from "@/lib/layanan/schema"

import { approveTasksAction } from "../actions"

const INCOMPLETE = "Setiap baris wajib punya orang, jenis, dan tanggal"

export function ApproveForm({
  requestId,
  people,
  taskTypes,
  initialRows,
}: {
  requestId: number
  people: Option[]
  taskTypes: Option[]
  initialRows: Assignment[]
}) {
  const router = useRouter()
  const formId = React.useId()
  const [rows, setRows] = React.useState<Assignment[]>(initialRows)
  const [note, setNote] = React.useState("")
  const [errors, setErrors] = React.useState<{ rows?: string; note?: string }>({})
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()
  const formRef = React.useRef<HTMLFormElement>(null)
  const back = `/layanan/sdm/${requestId}`

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setServerError(null)
    const parsed = approveTasksSchema.safeParse({
      rows: rows.map((r) => ({
        personId: r.personId,
        taskTypeId: Number(r.taskTypeId),
        start: r.start ?? "",
        end: r.end ?? r.start ?? "",
      })),
      note: note.trim() || null,
    })
    const missing = rows.some((r) => !r.personId || !r.taskTypeId || !r.start)
    if (missing || !parsed.success) {
      const issue = parsed.error?.issues[0]
      setErrors(
        !missing && issue?.path[0] === "note"
          ? { note: issue.message }
          : { rows: missing ? INCOMPLETE : (issue?.message ?? INCOMPLETE) }
      )
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"], [data-error-focus]')
          ?.focus()
      )
      return
    }
    setErrors({})
    startTransition(async () => {
      const result = await approveTasksAction(requestId, parsed.data)
      if ("error" in result) return setServerError(result.error)
      toast.success("Pengajuan disetujui")
      router.push(back)
    })
  }

  const rowsErrorId = `${formId}-rows-error`
  const noteErrorId = `${formId}-note-error`
  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex max-w-3xl flex-col gap-6">
      {serverError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Pengajuan belum disetujui</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <fieldset disabled={pending} className="m-0 min-w-0 border-0 p-0">
        <FieldGroup>
          {/* AssignmentRows tidak menerima aria-invalid; saat galat, fieldset-nya yang menerima fokus dan membacakan galat. */}
          <FieldSet
            data-invalid={errors.rows ? true : undefined}
            data-error-focus={errors.rows ? "" : undefined}
            tabIndex={errors.rows ? -1 : undefined}
            aria-describedby={errors.rows ? rowsErrorId : undefined}
          >
            <FieldLegend variant="label">Penugasan</FieldLegend>
            <FieldDescription>
              Setiap baris menjadi satu tugas untuk satu orang. Baris boleh ditambah,
              dihapus, atau diubah dari kebutuhan pengaju.
            </FieldDescription>
            <AssignmentRows
              value={rows}
              onChange={setRows}
              people={people}
              taskTypes={taskTypes}
            />
            <FieldError id={rowsErrorId}>{errors.rows}</FieldError>
          </FieldSet>

          <Field data-invalid={errors.note ? true : undefined}>
            <FieldLabel htmlFor={`${formId}-note`}>Catatan untuk pengaju (opsional)</FieldLabel>
            <Textarea
              id={`${formId}-note`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              aria-invalid={errors.note ? true : undefined}
              aria-describedby={errors.note ? noteErrorId : undefined}
            />
            <FieldError id={noteErrorId}>{errors.note}</FieldError>
          </Field>
        </FieldGroup>
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          Setujui pengajuan
        </Button>
        <Link href={back} className={buttonVariants({ variant: "outline" })}>
          Batal
        </Link>
      </div>
    </form>
  )
}
