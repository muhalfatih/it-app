"use client"

import * as React from "react"
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"

import type { AnswerStatus, TaskSource } from "@workspace/db/schema/stages"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/reui/badge"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

import { dayScore, scoreLabel, type ReportState } from "@/lib/report/rules"

import {
  addOwnTask,
  answerTask,
  removeOwnTask,
  renameOwnTask,
  saveReportNotes,
  sendReport,
} from "./actions"

export type FormTask = {
  key: string
  source: TaskSource
  title: string
  overdueDays: number
  status: AnswerStatus | null
}

const SECTIONS: { title: string; sources: TaskSource[] }[] = [
  { title: "Tugas Rutin", sources: ["rutin"] },
  { title: "Planner", sources: ["planner"] },
  { title: "Tugas Lain", sources: ["manajer", "sendiri"] },
]

const selfId = (key: string) => Number(key.split(":")[1])

function AnswerToggle({
  title,
  value,
  disabled,
  onChange,
}: {
  title: string
  value: AnswerStatus | null
  disabled: boolean
  onChange: (status: AnswerStatus) => void
}) {
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      value={value ? [value] : []}
      disabled={disabled}
      onValueChange={(v) => v[0] && onChange(v[0] as AnswerStatus)}
      aria-label={`Status ${title}`}
    >
      <ToggleGroupItem
        value="T"
        aria-label={`Tuntas: ${title}`}
        className="h-11 min-w-12 aria-pressed:bg-success aria-pressed:text-white"
      >
        T
      </ToggleGroupItem>
      <ToggleGroupItem
        value="TL"
        aria-label={`Tindak lanjut: ${title}`}
        className="h-11 min-w-12 aria-pressed:bg-warning aria-pressed:text-white"
      >
        TL
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

function OwnTaskTools({
  task,
  disabled,
}: {
  task: FormTask
  disabled: boolean
}) {
  const [editing, setEditing] = React.useState(false)
  const [title, setTitle] = React.useState(task.title)
  const [pending, startTransition] = React.useTransition()
  const id = selfId(task.key)

  function rename(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const r = await renameOwnTask(id, title)
      if ("error" in r) toast.error(r.error)
      else setEditing(false)
    })
  }

  function remove() {
    startTransition(async () => {
      const r = await removeOwnTask(id)
      if ("error" in r) toast.error(r.error)
      else toast.success("Tugas dihapus")
    })
  }

  if (editing)
    return (
      <form onSubmit={rename} className="flex w-full items-center gap-2">
        <Input
          aria-label="Judul tugas"
          value={title}
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <Button type="submit" size="icon" aria-label="Simpan judul" disabled={pending}>
          <CheckIcon />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Batal ubah"
          onClick={() => {
            setTitle(task.title)
            setEditing(false)
          }}
        >
          <XIcon />
        </Button>
      </form>
    )

  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Ubah ${task.title}`}
        disabled={disabled || pending}
        onClick={() => setEditing(true)}
      >
        <PencilIcon />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Hapus ${task.title}`}
              disabled={disabled || pending}
            />
          }
        >
          <Trash2Icon />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tugas ini?</AlertDialogTitle>
            <AlertDialogDescription>
              “{task.title}” dihapus dari laporan hari ini beserta jawabannya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Hapus tugas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AddOwnTask({ date, disabled }: { date: string; disabled: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [pending, startTransition] = React.useTransition()

  function add(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const r = await addOwnTask(date, title)
      if ("error" in r) {
        toast.error(r.error)
        return
      }
      setTitle("")
      setOpen(false)
    })
  }

  if (!open)
    return (
      <Button
        variant="outline"
        className="w-fit"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <PlusIcon data-icon="inline-start" />
        Tambah tugas sendiri
      </Button>
    )

  return (
    <form onSubmit={add} className="flex max-w-md items-center gap-2">
      <Input
        aria-label="Judul tugas sendiri"
        placeholder="Apa yang kamu kerjakan?"
        value={title}
        maxLength={120}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <Button type="submit" disabled={pending}>
        {pending && <Spinner data-icon="inline-start" />}
        Tambah
      </Button>
      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
        Batal
      </Button>
    </form>
  )
}

export function ReportForm({
  date,
  tasks,
  obstacles,
  priorities,
  state,
  editable,
  readOnly = false,
}: {
  date: string
  tasks: FormTask[]
  obstacles: string
  priorities: string
  state: ReportState
  editable: boolean
  readOnly?: boolean
}) {
  const locked = readOnly || !editable
  const [, startTransition] = React.useTransition()
  const [submitting, startSubmit] = React.useTransition()
  const [answers, setAnswerOptimistic] = React.useOptimistic(
    Object.fromEntries(tasks.map((t) => [t.key, t.status])) as Record<
      string,
      AnswerStatus | null
    >,
    (cur, patch: { key: string; status: AnswerStatus }) => ({
      ...cur,
      [patch.key]: patch.status,
    })
  )
  const [notes, setNotes] = React.useState({ obstacles, priorities })
  const saved = React.useRef({ obstacles, priorities })

  function choose(key: string, status: AnswerStatus) {
    startTransition(async () => {
      setAnswerOptimistic({ key, status })
      const r = await answerTask(date, key, status)
      if ("error" in r) toast.error(r.error)
    })
  }

  function persistNotes() {
    if (
      notes.obstacles === saved.current.obstacles &&
      notes.priorities === saved.current.priorities
    )
      return
    startTransition(async () => {
      const r = await saveReportNotes(date, notes.obstacles, notes.priorities)
      if ("error" in r) toast.error(r.error)
      else saved.current = notes
    })
  }

  function submit() {
    startSubmit(async () => {
      const r = await sendReport(date)
      if ("error" in r) toast.error(r.error)
      else toast.success("Laporan dikirim")
    })
  }

  const answerMap = new Map(
    Object.entries(answers).flatMap(([k, v]) => (v ? [[k, v] as const] : []))
  )
  const score = scoreLabel(dayScore(tasks, answerMap))
  const resend = state === "dikirim" || state === "perlu_diperbarui"

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        T = Tuntas, TL = Tindak Lanjut. Jawaban tersimpan saat dipilih.
      </p>
      {SECTIONS.map((section) => {
        const rows = tasks.filter((t) => section.sources.includes(t.source))
        const showAdd = section.sources.includes("sendiri") && !readOnly
        if (rows.length === 0 && !showAdd) return null
        return (
          <section key={section.title} className="flex flex-col gap-1">
            <h3 className="text-base font-semibold">{section.title}</h3>
            <ul className="flex flex-col divide-y">
              {rows.map((t) => (
                <li
                  key={t.key}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3"
                >
                  <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
                    <span className="font-medium break-words">{t.title}</span>
                    <div className="flex flex-wrap items-center gap-1">
                      {t.overdueDays > 0 && (
                        <Badge variant="warning-light" size="sm">
                          Tertunda {t.overdueDays} hari
                        </Badge>
                      )}
                      {t.source === "manajer" && (
                        <Badge variant="outline" size="sm">
                          dari Manajer
                        </Badge>
                      )}
                      {t.source === "sendiri" && (
                        <Badge variant="outline" size="sm">
                          input sendiri
                        </Badge>
                      )}
                    </div>
                  </div>
                  {t.source === "sendiri" && !readOnly && (
                    <OwnTaskTools task={t} disabled={locked} />
                  )}
                  <AnswerToggle
                    title={t.title}
                    value={answers[t.key] ?? null}
                    disabled={locked}
                    onChange={(s) => choose(t.key, s)}
                  />
                </li>
              ))}
            </ul>
            {showAdd && <AddOwnTask date={date} disabled={locked} />}
          </section>
        )
      })}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="hambatan">Hambatan hari ini</FieldLabel>
          <Textarea
            id="hambatan"
            rows={4}
            maxLength={2000}
            disabled={locked}
            value={notes.obstacles}
            onChange={(e) => setNotes({ ...notes, obstacles: e.target.value })}
            onBlur={persistNotes}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="prioritas">Prioritas esok</FieldLabel>
          <Textarea
            id="prioritas"
            rows={4}
            maxLength={2000}
            disabled={locked}
            value={notes.priorities}
            onChange={(e) => setNotes({ ...notes, priorities: e.target.value })}
            onBlur={persistNotes}
          />
        </Field>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        <p className="text-sm font-medium tabular-nums" aria-live="polite">
          {score ?? "Belum ada tugas"}
        </p>
        {!locked && (
          <Button className="ml-auto" disabled={submitting} onClick={submit}>
            {submitting && <Spinner data-icon="inline-start" />}
            {resend ? "Kirim ulang" : "Kirim"}
          </Button>
        )}
      </div>
    </div>
  )
}
