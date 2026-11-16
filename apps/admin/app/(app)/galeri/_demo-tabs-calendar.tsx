"use client"

import * as React from "react"
import { id as localeId } from "date-fns/locale"

import { Calendar } from "@workspace/ui/components/calendar"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

type DateRange = { from: Date | undefined; to?: Date }

export function TabsCalendarDemo() {
  const [day, setDay] = React.useState<Date | undefined>(new Date(2026, 10, 16))
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(2026, 10, 16),
    to: new Date(2026, 10, 21),
  })

  return (
    <Tabs defaultValue="tunggal">
      <TabsList>
        <TabsTrigger value="tunggal">Tanggal</TabsTrigger>
        <TabsTrigger value="rentang">Rentang</TabsTrigger>
        <TabsTrigger value="libur">Hari libur</TabsTrigger>
      </TabsList>
      <TabsContent value="tunggal">
        <Card size="sm" className="w-fit">
          <CardContent>
            <Calendar
              mode="single"
              locale={localeId}
              weekStartsOn={1}
              selected={day}
              onSelect={setDay}
            />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="rentang">
        <Card size="sm" className="w-fit">
          <CardContent>
            <Calendar
              mode="range"
              locale={localeId}
              weekStartsOn={1}
              selected={range}
              onSelect={setRange}
            />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="libur">
        <p className="text-sm text-muted-foreground">
          Hari libur ditandai Manajer di menu Absensi; tidak ada laporan harian
          dan absensi pada tanggal itu.
        </p>
      </TabsContent>
    </Tabs>
  )
}
