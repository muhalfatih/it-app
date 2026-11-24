"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

const CONFIG = {
  score: { label: "Skor (%)", color: "var(--chart-2)" },
} satisfies ChartConfig

export function ScoreChart({
  weeks,
}: {
  /** `score` null = pekan tanpa hari yang dihitung (garis terputus). */
  weeks: { label: string; score: number | null }[]
}) {
  return (
    <ChartContainer config={CONFIG} className="h-56 w-full">
      <LineChart data={weeks} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={0} fontSize={12} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line dataKey="score" type="monotone" stroke="var(--color-score)" strokeWidth={2} dot />
      </LineChart>
    </ChartContainer>
  )
}
