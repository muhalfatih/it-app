"use client"

import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { CalendarIcon, PlusIcon, Trash2Icon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

type Option = { value: string; label: string }

/** Satu penugasan di entri Planner. Tanggal dalam format ISO `yyyy-MM-dd`. */
type Assignment = {
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
}

const toIso = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : undefined)

function rangeLabel({ start, end }: Assignment) {
  if (!start) return "Pilih tanggal"
  const fmt = (iso: string) =>
    format(parseISO(iso), "d MMM", { locale: localeId })
  return end && end !== start ? `${fmt(start)} – ${fmt(end)}` : fmt(start)
}

function OptionSelect({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string
  options: Option[]
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <Select
      items={options}
      value={value || null}
      onValueChange={(v) => onValueChange(v ?? "")}
    >
      <SelectTrigger aria-label={label} className="w-full min-w-0">
        <SelectValue placeholder={label} />
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

/** Baris penugasan multi-entry: orang + jenis penugasan + rentang tanggal (spesifikasi §4.1). */
function AssignmentRows({
  value,
  onChange,
  people,
  taskTypes,
}: AssignmentRowsProps) {
  const update = (index: number, patch: Partial<Assignment>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  return (
    <div className="flex flex-col gap-2">
      {value.map((row, index) => {
        const selected: DateRange | undefined = row.start
          ? {
              from: parseISO(row.start),
              to: row.end ? parseISO(row.end) : undefined,
            }
          : undefined
        return (
          <div
            key={index}
            className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"
          >
            <OptionSelect
              label="Orang"
              options={people}
              value={row.personId}
              onValueChange={(personId) => update(index, { personId })}
            />
            <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
              <OptionSelect
                label="Jenis penugasan"
                options={taskTypes}
                value={row.taskTypeId}
                onValueChange={(taskTypeId) => update(index, { taskTypeId })}
              />
            </div>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="row-start-3 justify-start sm:row-start-auto"
                  />
                }
              >
                <CalendarIcon data-icon="inline-start" />
                {rangeLabel(row)}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  locale={localeId}
                  weekStartsOn={1}
                  selected={selected}
                  onSelect={(range) =>
                    update(index, {
                      start: toIso(range?.from),
                      end: toIso(range?.to),
                    })
                  }
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Hapus penugasan"
              className="col-start-2 row-start-1 sm:col-start-auto"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <Trash2Icon />
            </Button>
          </div>
        )
      })}
      <Button
        variant="outline"
        className="self-start"
        onClick={() => onChange([...value, { personId: "", taskTypeId: "" }])}
      >
        <PlusIcon data-icon="inline-start" />
        Tambah penugasan
      </Button>
    </div>
  )
}

export { AssignmentRows, type Assignment, type Option }
