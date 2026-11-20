"use client"

import { useId, useState } from "react"
import { addDays, format, isSameDay } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { cn } from "cn"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"

const label = (d: Date) => format(d, "d MMM yyyy", { locale: localeId })

/**
 * Pemilih rentang tanggal dalam popover (`@reui/c-calendar-25`); isinya kalender rentang seperti `c-calendar-2`.
 * Tanpa `onChange` berjalan mandiri (demo galeri); dengan `value`/`onChange` dikendalikan formulir.
 */
export function Pattern({
  id: idProp,
  "aria-labelledby": labelledBy,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
  value,
  onChange,
}: {
  id?: string
  "aria-labelledby"?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
}) {
  const autoId = useId()
  const [own, setOwn] = useState<DateRange | undefined>(() => {
    const today = new Date()
    return { from: today, to: addDays(today, 5) }
  })
  const date = onChange ? value : own
  const setDate = onChange ?? setOwn

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            id={idProp ?? autoId}
            aria-labelledby={labelledBy}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className="group/pick-date w-72 max-w-72 justify-between"
            variant="outline"
          />
        }
      >
        <span
          className={cn("truncate", !date?.from && "text-muted-foreground")}
        >
          {date?.from
            ? date.to && !isSameDay(date.from, date.to)
              ? `${label(date.from)} - ${label(date.to)}`
              : label(date.from)
            : "Pilih rentang tanggal"}
        </span>
        <CalendarIcon
          aria-hidden="true"
          className="shrink-0 text-muted-foreground/80 transition-colors group-hover/pick-date:text-foreground"
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Card className="p-0">
          <CardContent className="p-0">
            <Calendar
              mode="range"
              locale={localeId}
              weekStartsOn={1}
              selected={date}
              defaultMonth={date?.from}
              onSelect={setDate}
            />
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
