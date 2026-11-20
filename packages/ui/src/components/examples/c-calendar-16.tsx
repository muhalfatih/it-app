"use client"

import { useState } from "react"
import {
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns"
import { id as localeId } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { Card, CardContent } from "@workspace/ui/components/card"

/** Kalender rentang dengan preset (`@reui/c-calendar-16`): pintasan mengisi kedua ujung dan memindahkan tampilan. */
export function Pattern() {
  const today = new Date()
  const last = subMonths(today, 1)
  const lastYear = subYears(today, 1)
  const presets: { label: string; range: DateRange & { to: Date } }[] = [
    { label: "Hari ini", range: { from: today, to: today } },
    {
      label: "Kemarin",
      range: { from: subDays(today, 1), to: subDays(today, 1) },
    },
    { label: "7 hari terakhir", range: { from: subDays(today, 6), to: today } },
    {
      label: "30 hari terakhir",
      range: { from: subDays(today, 29), to: today },
    },
    { label: "Bulan ini", range: { from: startOfMonth(today), to: today } },
    {
      label: "Bulan lalu",
      range: { from: startOfMonth(last), to: endOfMonth(last) },
    },
    { label: "Tahun ini", range: { from: startOfYear(today), to: today } },
    {
      label: "Tahun lalu",
      range: { from: startOfYear(lastYear), to: endOfYear(lastYear) },
    },
  ]
  const [month, setMonth] = useState(today)
  const [date, setDate] = useState<DateRange | undefined>(presets[2]!.range)

  return (
    <Card className="p-0">
      <CardContent className="p-0">
        <div className="flex max-sm:flex-col">
          <div className="relative py-4 max-sm:order-1 max-sm:border-t sm:w-40">
            <div className="h-full sm:border-e">
              <div className="flex flex-col px-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    className="w-full justify-start"
                    onClick={() => {
                      setDate(preset.range)
                      setMonth(preset.range.to)
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <Calendar
            disabled={[{ after: today }]}
            mode="range"
            locale={localeId}
            weekStartsOn={1}
            month={month}
            onMonthChange={setMonth}
            onSelect={(next) => {
              if (next) setDate(next)
            }}
            selected={date}
          />
        </div>
      </CardContent>
    </Card>
  )
}
