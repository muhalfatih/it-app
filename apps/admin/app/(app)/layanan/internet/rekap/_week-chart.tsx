"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

const CONFIG = {
  count: { label: "Pengaduan", color: "var(--chart-2)" },
} satisfies ChartConfig

export function WeekChart({
  weeks,
}: {
  weeks: { start: string; label: string; count: number }[]
}) {
  return (
    <ChartContainer config={CONFIG} className="h-56 w-full">
      <BarChart data={weeks} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={0}
          fontSize={12}
          // Rentang penuh ("26 Okt – 1 Nov") bertumpuk di layar HP; tooltip tetap menampilkannya.
          tickFormatter={(label: string) => label.split(" – ")[0] ?? label}
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
