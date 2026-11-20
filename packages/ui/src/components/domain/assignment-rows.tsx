"use client"

import * as React from "react"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { CalendarIcon, PlusIcon, Trash2Icon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@workspace/ui/components/reui/frame"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

type Option = { value: string; label: string }

/** Satu penugasan di entri Planner. Tanggal dalam format ISO `yyyy-MM-dd`. */
type Assignment = {
  /** Id stabil baris (dari database); baris baru diberi id sementara. */
  id?: string
  personId: string
  taskTypeId: string
  start?: string
  end?: string
}

type AssignmentRowsProps = {
  value: Assignment[]
  onChange: (value: Assignment[]) => void
  people: Option[]
  taskTypes: Option[]
  /** Mode baca saja: sembunyikan kontrol tambah/hapus baris dan petunjuk ubah. */
  readOnly?: boolean
  /** `"type"`: hanya jenis tugas per baris (formulir pengaju), tanpa orang/tanggal/durasi. */
  fields?: "all" | "type"
}

// Desktop: satu baris per penugasan. HP: orang + hapus, lalu jenis, lalu tanggal + durasi.
const ROW =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.1fr)_5.5rem_2.25rem]"
// Mode jenis saja: "SDM n", jenis, hapus (sama di HP dan desktop).
const TYPE_ROW =
  "grid grid-cols-[3.5rem_minmax(0,1fr)_2.25rem] items-center gap-x-2"

const toIso = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : undefined)

function rangeLabel({ start, end }: Assignment) {
  if (!start) return "Pilih tanggal"
  const fmt = (iso: string) =>
    format(parseISO(iso), "d MMM", { locale: localeId })
  return end && end !== start ? `${fmt(start)} – ${fmt(end)}` : fmt(start)
}

/** Jumlah hari kalender (inklusif) dalam rentang penugasan. */
function dayCount({ start, end }: Assignment) {
  if (!start) return 0
  return differenceInCalendarDays(parseISO(end ?? start), parseISO(start)) + 1
}

/** Penugasan lain milik orang yang sama dengan rentang tanggal beririsan. */
function overlaps(rows: Assignment[], index: number) {
  const a = rows[index]
  if (!a?.personId || !a.start) return false
  const aEnd = a.end ?? a.start
  return rows.some((b, i) => {
    if (i === index || b.personId !== a.personId || !b.start) return false
    return a.start! <= (b.end ?? b.start) && b.start <= aEnd
  })
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function OptionSelect({
  label,
  placeholder,
  options,
  value,
  onValueChange,
  autoFocus,
}: {
  label: string
  placeholder: string
  options: Option[]
  value: string
  onValueChange: (value: string) => void
  autoFocus?: boolean
}) {
  return (
    <Select
      items={options}
      value={value || null}
      onValueChange={(v) => onValueChange(v ?? "")}
    >
      <SelectTrigger
        size="sm"
        aria-label={label}
        autoFocus={autoFocus}
        className="w-full min-w-0"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

/**
 * Penugasan multi-entry (spesifikasi §4.1) dengan editing inline: tiap sel langsung bisa diubah.
 * Satu orang boleh punya dua tugas atau lebih; rentang yang beririsan diberi tanda "Bentrok".
 */
function AssignmentRows({
  value,
  onChange,
  people,
  taskTypes,
  readOnly = false,
  fields = "all",
}: AssignmentRowsProps) {
  const typeOnly = fields === "type"
  const baseId = React.useId()
  const counter = React.useRef(0)
  const [focusId, setFocusId] = React.useState<string | null>(null)

  const update = (index: number, patch: Partial<Assignment>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  const add = () => {
    const id = `${baseId}-baru-${counter.current++}`
    setFocusId(id)
    onChange([...value, { id, personId: "", taskTypeId: "" }])
  }
  const personName = (id: string) =>
    people.find((p) => p.value === id)?.label ?? ""
  const isMissing = (r: Assignment) =>
    typeOnly ? !r.taskTypeId : !r.personId || !r.taskTypeId || !r.start
  const incomplete = value.filter(isMissing).length
  const noun = typeOnly ? "kebutuhan SDM" : "penugasan"

  return (
    <Frame spacing="xs">
      <FrameHeader className="flex flex-row flex-wrap items-center gap-2">
        <FrameTitle>{typeOnly ? "Kebutuhan SDM" : "Penugasan"}</FrameTitle>
        <Badge variant="outline" size="sm">
          {value.length}
        </Badge>
        {incomplete > 0 ? (
          <Badge variant="warning-light" size="sm">
            {incomplete} belum lengkap
          </Badge>
        ) : null}
        {!readOnly && (
          <span className="ml-auto text-xs text-muted-foreground">
            Ubah langsung di tiap baris
          </span>
        )}
      </FrameHeader>
      <FramePanel className="p-0!">
        {!typeOnly && (
          <div
            aria-hidden
            className={cn(
              ROW,
              "hidden border-b px-3 py-2 text-xs font-medium text-muted-foreground sm:grid"
            )}
          >
            <span>Orang</span>
            <span>Jenis tugas</span>
            <span>Tanggal</span>
            <span className="text-right">Durasi</span>
            <span />
          </div>
        )}

        {value.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {readOnly
              ? `Belum ada ${noun}.`
              : `Belum ada ${noun}. Tambahkan baris di bawah.`}
          </p>
        ) : (
          <ul className="divide-y">
            {value.map((row, index) => {
              const key = row.id ?? `baris-${index}`
              const name = personName(row.personId)
              const n = index + 1
              const missing = isMissing(row)
              if (typeOnly)
                return (
                  <li key={key} className={cn(TYPE_ROW, "px-3 py-2")}>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      SDM {n}
                    </span>
                    <OptionSelect
                      label={`Jenis tugas, SDM ${n}`}
                      placeholder="Pilih jenis"
                      options={taskTypes}
                      value={row.taskTypeId}
                      autoFocus={key === focusId}
                      onValueChange={(taskTypeId) =>
                        update(index, { taskTypeId })
                      }
                    />
                    {readOnly ? (
                      <span aria-hidden />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Hapus SDM ${n}`}
                        onClick={() =>
                          onChange(value.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2Icon />
                      </Button>
                    )}
                  </li>
                )
              const clash = !missing && overlaps(value, index)
              const selected: DateRange | undefined = row.start
                ? {
                    from: parseISO(row.start),
                    to: row.end ? parseISO(row.end) : undefined,
                  }
                : undefined
              return (
                <li key={key} className={cn(ROW, "px-3 py-2")}>
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar size="sm" aria-hidden>
                      <AvatarFallback>
                        {name ? initials(name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <OptionSelect
                      label={`Orang, baris ${n}`}
                      placeholder="Pilih orang"
                      options={people}
                      value={row.personId}
                      autoFocus={key === focusId}
                      onValueChange={(personId) => update(index, { personId })}
                    />
                  </div>
                  {readOnly ? (
                    // Pengganti sel kolom hapus supaya tata letak grid tetap.
                    <span aria-hidden className="sm:order-last" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Hapus baris ${n}${name ? `: ${name}` : ""}`}
                      className="sm:order-last"
                      onClick={() =>
                        onChange(value.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2Icon />
                    </Button>
                  )}
                  <div className="col-span-2 sm:col-span-1">
                    <OptionSelect
                      label={`Jenis tugas, baris ${n}`}
                      placeholder="Pilih jenis"
                      options={taskTypes}
                      value={row.taskTypeId}
                      onValueChange={(taskTypeId) =>
                        update(index, { taskTypeId })
                      }
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={`Tanggal, baris ${n}: ${rangeLabel(row)}`}
                          className="w-full min-w-0 justify-start"
                        />
                      }
                    >
                      <CalendarIcon data-icon="inline-start" />
                      <span className="truncate tabular-nums">
                        {rangeLabel(row)}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        locale={localeId}
                        weekStartsOn={1}
                        selected={selected}
                        defaultMonth={selected?.from}
                        onSelect={(range) =>
                          update(index, {
                            start: toIso(range?.from),
                            end: toIso(range?.to),
                          })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex justify-end">
                    {missing ? (
                      <Badge variant="warning-light" size="sm">
                        Belum lengkap
                      </Badge>
                    ) : clash ? (
                      <Badge
                        variant="warning-light"
                        size="sm"
                        title="Tanggal beririsan dengan tugas lain orang ini"
                      >
                        Bentrok
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {dayCount(row)} hari
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {!readOnly && (
          <div className="border-t p-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={add}
            >
              <PlusIcon data-icon="inline-start" />
              {typeOnly ? "Tambah SDM" : "Tambah penugasan"}
            </Button>
          </div>
        )}
      </FramePanel>
    </Frame>
  )
}

export { AssignmentRows, type Assignment, type Option }
