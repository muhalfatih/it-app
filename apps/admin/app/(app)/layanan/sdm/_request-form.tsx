"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CircleAlertIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DateSelectorPopover } from "@workspace/ui/components/domain/date-selector-popover"
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
import { Input } from "@workspace/ui/components/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import {
  FileType,
  getFileType,
} from "@workspace/ui/components/reui/file-type"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"

import { fromDateValue, toDateValue } from "@/lib/date-value"
import { uploadToStorage } from "@/lib/kanban/upload-client"
import { requestInputSchema } from "@/lib/layanan/schema"

import { startRundownUploadAction, submitRequestAction } from "./actions"

const FEE_TEXT =
  "Saya memahami bahwa setiap SDM yang ditugaskan wajib diberikan fee oleh unit pengaju."

type Rundown =
  | { status: "idle" }
  | { status: "uploading"; name: string; progress: number }
  | { status: "done"; name: string; key: string }

type Key = "activity" | "dates" | "unit" | "rundown" | "wa" | "needs" | "fee"
type Errors = Partial<Record<Key, string>>

const PATH_TO_KEY: Record<string, Key> = {
  activityName: "activity",
  startDate: "dates",
  endDate: "dates",
  unitId: "unit",
  waNumber: "wa",
  needs: "needs",
  feeAgreed: "fee",
}

export function RequestForm({
  units,
  taskTypes,
  rundownMimes,
  rundownMax,
}: {
  units: Option[]
  taskTypes: Option[]
  rundownMimes: string[]
  rundownMax: number
}) {
  const router = useRouter()
  const formId = React.useId()
  const formRef = React.useRef<HTMLFormElement>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const uploadCtrl = React.useRef<AbortController | null>(null)
  const [activityName, setActivityName] = React.useState("")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [unitId, setUnitId] = React.useState("")
  const [waNumber, setWaNumber] = React.useState("")
  const [needs, setNeeds] = React.useState<Assignment[]>([
    { id: "awal", personId: "", taskTypeId: "" },
  ])
  const [feeAgreed, setFeeAgreed] = React.useState(false)
  const [rundown, setRundown] = React.useState<Rundown>({ status: "idle" })
  const [errors, setErrors] = React.useState<Errors>({})
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  React.useEffect(() => () => uploadCtrl.current?.abort(), [])

  async function pickRundown(file: File | undefined) {
    if (!file) return
    setErrors((e) => ({ ...e, rundown: undefined }))
    if (file.size > rundownMax) {
      if (fileRef.current) fileRef.current.value = ""
      return setErrors((e) => ({ ...e, rundown: "Ukuran berkas maksimal 10 MB" }))
    }
    uploadCtrl.current?.abort()
    const ctrl = new AbortController()
    uploadCtrl.current = ctrl
    setRundown({ status: "uploading", name: file.name, progress: 0 })
    const fail = (message: string) => {
      if (ctrl.signal.aborted) return
      setRundown({ status: "idle" })
      setErrors((e) => ({ ...e, rundown: message }))
    }
    try {
      const start = await startRundownUploadAction({
        name: file.name,
        size: file.size,
        mime: file.type,
      })
      if ("error" in start || !start.data)
        return fail("error" in start ? start.error : "Gagal memulai unggahan.")
      await uploadToStorage(
        start.data,
        file,
        (progress) =>
          setRundown({ status: "uploading", name: file.name, progress }),
        ctrl.signal
      )
      if (!ctrl.signal.aborted)
        setRundown({ status: "done", name: file.name, key: start.data.key })
    } catch (e) {
      fail(e instanceof Error ? e.message : "Gagal mengunggah. Coba lagi.")
    }
  }

  function removeRundown() {
    uploadCtrl.current?.abort()
    setRundown({ status: "idle" })
  }

  function focusFirstInvalid() {
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"], [data-error-focus]')
        ?.focus()
    )
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setServerError(null)
    const found: Errors = {}
    if (!unitId) found.unit = "Pilih unit pengaju"
    if (needs.some((n) => !n.taskTypeId))
      found.needs = "Pilih jenis tugas untuk setiap SDM"
    if (rundown.status === "uploading")
      found.rundown = "Tunggu unggahan rundown selesai"
    const parsed = requestInputSchema.safeParse({
      activityName,
      startDate,
      endDate,
      unitId: Number(unitId),
      waNumber,
      feeAgreed,
      needs: needs.map((n) => ({ taskTypeId: Number(n.taskTypeId) })),
      rundownKey: rundown.status === "done" ? rundown.key : null,
      rundownName: rundown.status === "done" ? rundown.name : null,
    })
    if (!parsed.success)
      for (const issue of parsed.error.issues) {
        const key = PATH_TO_KEY[String(issue.path[0] ?? "")]
        if (key) found[key] ??= issue.message
      }
    if (!parsed.success || Object.keys(found).length) {
      setErrors(found)
      return focusFirstInvalid()
    }
    setErrors({})
    startTransition(async () => {
      const result = await submitRequestAction(parsed.data)
      if ("error" in result) return setServerError(result.error)
      toast.success("Pengajuan dikirim")
      router.push("/layanan/sdm/saya")
    })
  }

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
          <AlertTitle>Pengajuan belum terkirim</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}
      <fieldset disabled={pending} className="m-0 min-w-0 border-0 p-0">
        <FieldGroup>
          <Field data-invalid={invalid("activity")}>
            <FieldLabel htmlFor={`${formId}-activity`}>Nama kegiatan</FieldLabel>
            <Input
              id={`${formId}-activity`}
              name="nama-kegiatan"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              aria-invalid={invalid("activity")}
              aria-describedby={describedBy("activity")}
              maxLength={120}
              autoComplete="off"
            />
            <FieldError id={errorId("activity")}>{errors.activity}</FieldError>
          </Field>

          <Field data-invalid={invalid("dates")}>
            <FieldLabel id={`${formId}-dates-label`} htmlFor={`${formId}-dates`}>
              Tanggal kegiatan
            </FieldLabel>
            <DateSelectorPopover
              id={`${formId}-dates`}
              // Nama tombol = label + tanggal terpilih (pola galeri).
              aria-labelledby={`${formId}-dates-label ${formId}-dates`}
              mode="range"
              label="Tanggal kegiatan"
              value={toDateValue(startDate, endDate)}
              onChange={(v) => {
                const range = fromDateValue(v)
                setStartDate(range?.start ?? "")
                setEndDate(range?.end ?? "")
              }}
              aria-invalid={invalid("dates")}
              aria-describedby={describedBy("dates")}
            />
            <FieldDescription>Pilih satu hari, atau tanggal mulai dan selesai.</FieldDescription>
            <FieldError id={errorId("dates")}>{errors.dates}</FieldError>
          </Field>

          <Field data-invalid={invalid("unit")}>
            <FieldLabel htmlFor={`${formId}-unit`}>Unit pengaju</FieldLabel>
            <Select
              items={units}
              value={unitId || null}
              onValueChange={(v) => setUnitId(v ?? "")}
              disabled={units.length === 0}
            >
              <SelectTrigger
                id={`${formId}-unit`}
                className="w-full sm:max-w-sm"
                aria-invalid={invalid("unit")}
                aria-describedby={describedBy("unit")}
              >
                <SelectValue
                  placeholder={
                    units.length === 0
                      ? "Belum ada unit; hubungi Manajer"
                      : "Pilih unit"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {units.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldError id={errorId("unit")}>{errors.unit}</FieldError>
          </Field>

          <Field data-invalid={invalid("rundown")}>
            <FieldLabel htmlFor={`${formId}-rundown`}>
              Lampiran rundown (opsional)
            </FieldLabel>
            {rundown.status === "idle" ? (
              <Input
                ref={fileRef}
                id={`${formId}-rundown`}
                type="file"
                accept={rundownMimes.join(",")}
                onChange={(e) => void pickRundown(e.target.files?.[0])}
                aria-invalid={invalid("rundown")}
                aria-describedby={describedBy("rundown", `${formId}-rundown-desc`)}
              />
            ) : (
              <Item variant="outline" size="xs" className="flex-nowrap">
                <ItemMedia>
                  <FileType type={getFileType(rundown.name)} aria-hidden="true" />
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle className="w-full truncate">{rundown.name}</ItemTitle>
                  <ItemDescription className="tabular-nums" aria-live="polite">
                    {rundown.status === "uploading"
                      ? `Mengunggah… ${rundown.progress}%`
                      : "Terunggah"}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus rundown ${rundown.name}`}
                    onClick={removeRundown}
                  >
                    <XIcon />
                  </Button>
                </ItemActions>
              </Item>
            )}
            <FieldDescription id={`${formId}-rundown-desc`}>
              PDF, gambar, Word, atau Excel. Maksimal 10&nbsp;MB.
            </FieldDescription>
            <FieldError id={errorId("rundown")}>{errors.rundown}</FieldError>
          </Field>

          <Field data-invalid={invalid("wa")}>
            <FieldLabel htmlFor={`${formId}-wa`}>Nomor WhatsApp</FieldLabel>
            <Input
              id={`${formId}-wa`}
              name="wa"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="081234567890…"
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)}
              aria-invalid={invalid("wa")}
              aria-describedby={describedBy("wa", `${formId}-wa-desc`)}
              className="sm:max-w-sm"
            />
            <FieldDescription id={`${formId}-wa-desc`}>
              Untuk koordinasi selanjutnya.
            </FieldDescription>
            <FieldError id={errorId("wa")}>{errors.wa}</FieldError>
          </Field>

          {/* AssignmentRows tidak menerima aria-invalid; saat galat, Field-nya yang menerima fokus dan membacakan galat. */}
          <Field
            data-invalid={invalid("needs")}
            data-error-focus={errors.needs ? "" : undefined}
            tabIndex={errors.needs ? -1 : undefined}
            aria-describedby={describedBy("needs")}
          >
            <AssignmentRows
              fields="type"
              value={needs}
              onChange={setNeeds}
              people={[]}
              taskTypes={taskTypes}
            />
            <FieldDescription>
              Pilih jenis tugas tiap SDM. Manajer memilih orangnya saat
              menyetujui.
            </FieldDescription>
            <FieldError id={errorId("needs")}>{errors.needs}</FieldError>
          </Field>

          <Field orientation="horizontal" data-invalid={invalid("fee")}>
            <Checkbox
              id={`${formId}-fee`}
              checked={feeAgreed}
              onCheckedChange={(v) => setFeeAgreed(v === true)}
              aria-invalid={invalid("fee")}
              aria-describedby={describedBy("fee")}
            />
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor={`${formId}-fee`} className="font-normal">
                {FEE_TEXT}
              </FieldLabel>
              <FieldError id={errorId("fee")}>{errors.fee}</FieldError>
            </div>
          </Field>
        </FieldGroup>
      </fieldset>
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner data-icon="inline-start" />}
          Kirim pengajuan
        </Button>
      </div>
    </form>
  )
}
