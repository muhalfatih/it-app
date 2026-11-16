"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

// Data contoh deterministik (tanpa Math.random agar server & klien sama): 90 hari kerja terakhir.
const START = new Date(2026, 7, 10)
const TREND = Array.from({ length: 104 }, (_, i) => {
  const date = new Date(START)
  date.setDate(START.getDate() + i)
  return date
})
  .filter((date) => date.getDay() !== 0)
  .slice(-90)
  .map((date, i) => {
    const total = 46 + Math.round(6 * Math.sin(i / 4))
    const tuntas = Math.round(total * (0.68 + 0.18 * Math.sin(i / 11) ** 2))
    return {
      date: format(date, "yyyy-MM-dd"),
      tuntas,
      tindakLanjut: total - tuntas,
    }
  })

const AREA_CONFIG = {
  tuntas: { label: "Tuntas", color: "var(--chart-2)" },
  tindakLanjut: { label: "Tindak Lanjut", color: "var(--chart-4)" },
} satisfies ChartConfig

const RANGES = [
  { value: "7", label: "7 hari" },
  { value: "30", label: "30 hari" },
  { value: "90", label: "90 hari" },
]

const formatDay = (iso: string) =>
  format(parseISO(iso), "d MMM", { locale: localeId })

const pct = (rows: typeof TREND) => {
  const t = rows.reduce((s, r) => s + r.tuntas, 0)
  const all = rows.reduce((s, r) => s + r.tuntas + r.tindakLanjut, 0)
  return all ? (t / all) * 100 : 0
}

function TrendChart() {
  const [range, setRange] = React.useState(["30"])
  const days = Number(range[0] ?? 30)
  const data = TREND.slice(-days)
  const previous = TREND.slice(-days * 2, -days)
  const score = pct(data)
  const delta = previous.length ? score - pct(previous) : 0
  const up = delta >= 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Skor laporan harian tim
          <Badge variant={up ? "success-light" : "destructive-light"}>
            {up ? (
              <TrendingUpIcon aria-hidden="true" />
            ) : (
              <TrendingDownIcon aria-hidden="true" />
            )}
            {up ? "+" : ""}
            {delta.toFixed(1).replace(".", ",")} poin
          </Badge>
        </CardTitle>
        <CardDescription>
          Tugas Tuntas vs Tindak Lanjut per hari kerja · rata-rata{" "}
          <span className="font-medium text-foreground tabular-nums">
            {score.toFixed(1).replace(".", ",")}%
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            value={range}
            onValueChange={(v) => v.length && setRange(v)}
            variant="outline"
            size="sm"
            aria-label="Rentang waktu"
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r.value} value={r.value}>
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={AREA_CONFIG} className="h-64 w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ top: 12, right: 4, bottom: 0, left: 4 }}
          >
            <defs>
              {(Object.keys(AREA_CONFIG) as (keyof typeof AREA_CONFIG)[]).map(
                (key) => (
                  <linearGradient
                    key={key}
                    id={`skor-${key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={`var(--color-${key})`}
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="95%"
                      stopColor={`var(--color-${key})`}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                )
              )}
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={formatDay}
            />
            <YAxis hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  className="min-w-44"
                  labelFormatter={(value) => formatDay(String(value))}
                />
              }
            />
            <Area
              dataKey="tindakLanjut"
              type="natural"
              stackId="skor"
              fill="url(#skor-tindakLanjut)"
              stroke="var(--color-tindakLanjut)"
              strokeWidth={2}
            />
            <Area
              dataKey="tuntas"
              type="natural"
              stackId="skor"
              fill="url(#skor-tuntas)"
              stroke="var(--color-tuntas)"
              strokeWidth={2}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Dibanding {days} hari kerja sebelumnya. Hari libur dan absensi non-Hadir
        tidak dihitung.
      </CardFooter>
    </Card>
  )
}

const BAR_DATA = [
  { gedung: "Gedung A", a: 4, b: 2, c: 1, d: 3, e: 5 },
  { gedung: "Gedung B", a: 1, b: 3, c: 0, d: 2, e: 4 },
  { gedung: "Gedung C", a: 2, b: 1, c: 2, d: 1, e: 6 },
  { gedung: "Aula", a: 0, b: 2, c: 0, d: 1, e: 1 },
]

const BAR_CONFIG = {
  a: { label: "Wifi tidak muncul", color: "var(--chart-1)" },
  b: { label: "Tidak bisa terhubung", color: "var(--chart-2)" },
  c: { label: "Akun salah", color: "var(--chart-3)" },
  d: { label: "Tanpa internet", color: "var(--chart-4)" },
  e: { label: "Lambat", color: "var(--chart-5)" },
} satisfies ChartConfig

function ComplaintChart() {
  const total = BAR_DATA.reduce((s, r) => s + r.a + r.b + r.c + r.d + r.e, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaduan internet per gedung</CardTitle>
        <CardDescription>
          Pekan ini ·{" "}
          <span className="font-medium text-foreground tabular-nums">
            {total}
          </span>{" "}
          pengaduan, terbanyak &quot;Lambat&quot;
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={BAR_CONFIG} className="h-64 w-full">
          <BarChart data={BAR_DATA} accessibilityLayer layout="vertical">
            <CartesianGrid horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="gedung"
              tickLine={false}
              axisLine={false}
              width={84}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {Object.keys(BAR_CONFIG).map((key, i, keys) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="kendala"
                fill={`var(--color-${key})`}
                radius={i === keys.length - 1 ? [0, 4, 4, 0] : 0}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function ChartDemo() {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[3fr_2fr]">
      <TrendChart />
      <ComplaintChart />
    </div>
  )
}
