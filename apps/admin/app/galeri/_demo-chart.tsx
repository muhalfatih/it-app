"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

const DATA = [
  { gedung: "A", a: 4, b: 2, c: 1, d: 3, e: 5 },
  { gedung: "B", a: 1, b: 3, c: 0, d: 2, e: 4 },
  { gedung: "C", a: 2, b: 1, c: 2, d: 1, e: 6 },
  { gedung: "Aula", a: 0, b: 2, c: 0, d: 1, e: 1 },
]

const CONFIG = {
  a: { label: "Wifi tidak muncul", color: "var(--chart-1)" },
  b: { label: "Tidak bisa terhubung", color: "var(--chart-2)" },
  c: { label: "Akun salah", color: "var(--chart-3)" },
  d: { label: "Tanpa internet", color: "var(--chart-4)" },
  e: { label: "Lambat", color: "var(--chart-5)" },
} satisfies ChartConfig

export function ChartDemo() {
  return (
    <ChartContainer config={CONFIG} className="h-64 w-full max-w-2xl">
      <BarChart data={DATA} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="gedung" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {Object.keys(CONFIG).map((key) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="kendala"
            fill={`var(--color-${key})`}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
