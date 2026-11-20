"use client"

import { useId, useState } from "react"
import { format } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import type { Matcher } from "react-day-picker"

import { cn } from "cn"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"

/**
 * Pemilih satu tanggal dalam popover (`@reui/c-calendar-24`); isinya kalender biasa seperti `c-calendar-1`.
 * Tanpa `onChange` berjalan mandiri (demo galeri); dengan `value`/`onChange` dikendalikan formulir.
 */
export function Pattern({
  id: idProp,
  "aria-labelledby": labelledBy,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
  value,
  onChange,
  disabledDays,
}: {
  id?: string
  "aria-labelledby"?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
  value?: Date
  onChange?: (date: Date | undefined) => void
  /** Hari yang tidak bisa dipilih, mis. `{ after: new Date() }`. */
  disabledDays?: Matcher | Matcher[]
}) {
  const autoId = useId()
  const [open, setOpen] = useState(false)
  const [own, setOwn] = useState<Date | undefined>(new Date())
  const date = onChange ? value : own
  const setDate = onChange ?? setOwn

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={idProp ?? autoId}
            aria-labelledby={labelledBy}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className="group/pick-date w-60 max-w-60 justify-between"
            variant="outline"
          />
        }
      >
        <span className={cn("truncate", !date && "text-muted-foreground")}>
          {date ? format(date, "PPP", { locale: localeId }) : "Pilih tanggal"}
        </span>
        <CalendarIcon
          aria-hidden="true"
          className="opacity-60 transition-opacity group-hover/pick-date:opacity-100"
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Card className="p-0">
          <CardContent className="p-0">
            <Calendar
              mode="single"
              locale={localeId}
              weekStartsOn={1}
              selected={date}
              defaultMonth={date}
              disabled={disabledDays}
              onSelect={(next) => {
                setDate(next)
                setOpen(false)
              }}
            />
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
