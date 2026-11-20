"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { id as localeId } from "date-fns/locale"

import { Button } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  DEFAULT_DATE_SELECTOR_I18N,
  DateSelector,
  formatDateValue,
  type DateSelectorValue,
} from "@workspace/ui/components/reui/date-selector"
import { Separator } from "@workspace/ui/components/separator"
import { DATE_SELECTOR_I18N_ID } from "@workspace/ui/lib/i18n-id"
import { cn } from "@workspace/ui/lib/utils"

const I18N = { ...DEFAULT_DATE_SELECTOR_I18N, ...DATE_SELECTOR_I18N_ID }

/**
 * Pemilih tanggal/periode dalam popover (pola `@reui/c-date-selector-2`): pilihan hanya tersimpan setelah "Terapkan".
 * Bahasa Indonesia, format dd/MM/yyyy, rentang tahun sampai tahun depan.
 */
function DateSelectorPopover({
  value,
  onChange,
  label,
  mode,
  id,
  className,
  ...triggerProps
}: {
  value: DateSelectorValue | undefined
  onChange: (value: DateSelectorValue | undefined) => void
  /** Judul di dalam popover. */
  label?: string
  /** Kolom formulir: hanya hari, satu tanggal (`single`) atau rentang (`range`). Kosong = semua periode. */
  mode?: "single" | "range"
  /** Untuk `FieldLabel htmlFor`. */
  id?: string
  className?: string
} & Pick<
  React.ComponentProps<"button">,
  "aria-invalid" | "aria-describedby" | "aria-labelledby" | "disabled"
>) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<DateSelectorValue | undefined>()

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value)
        setOpen(next)
      }}
    >
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            className={cn("w-56 max-w-56 justify-start", className)}
            {...triggerProps}
          />
        }
      >
        <CalendarIcon />
        {value ? formatDateValue(value, I18N, "dd/MM/yyyy") : "Pilih tanggal"}
      </PopoverTrigger>
      <PopoverContent className="w-auto gap-3 p-0" align="start" sideOffset={4}>
        <div className="p-3">
          <DateSelector
            value={draft}
            onChange={setDraft}
            allowRange={mode !== "single"}
            periodTypes={mode ? ["day"] : undefined}
            presetMode={
              mode === "single" ? "is" : mode === "range" ? "between" : undefined
            }
            label={label}
            inputHint={mode ? "Coba: 17/11/2026" : "Coba: 2026, K4, 17/11/2026"}
            maxYear={new Date().getFullYear() + 1}
            dayDateFormat="dd/MM/yyyy"
            i18n={DATE_SELECTOR_I18N_ID}
            locale={localeId}
          />
        </div>
        <Separator className="p-0" />
        <div className="flex justify-end gap-2 p-3 pt-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={() => {
              onChange(draft)
              setOpen(false)
            }}
          >
            Terapkan
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DateSelectorPopover }
