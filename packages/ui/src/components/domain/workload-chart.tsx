"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

const CONFIG = {
  count: { label: "Penugasan", color: "var(--chart-2)" },
} satisfies ChartConfig

const ROW = 36

export function WorkloadChart({ people }: { people: { name: string; count: number }[] }) {
  return (
    <ChartContainer
      config={CONFIG}
      className="w-full"
      style={{ height: Math.max(people.length, 1) * ROW + 32 }}
    >
      <BarChart data={people} layout="vertical" accessibilityLayer>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} fontSize={12} interval={0} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
