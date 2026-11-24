"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"

const CONFIG = {
  hadir: { label: "Hadir", color: "var(--att-hadir)" },
  izin: { label: "Izin", color: "var(--att-izin)" },
  izin_kegiatan: { label: "Izin Kegiatan", color: "var(--att-izin-kegiatan)" },
  sakit: { label: "Sakit", color: "var(--att-sakit)" },
  tanpa_keterangan: { label: "Tanpa Keterangan", color: "var(--att-tanpa-keterangan)" },
} satisfies ChartConfig

export type AttendanceChartDay = {
  label: string
  hadir: number
  izin: number
  izin_kegiatan: number
  sakit: number
  tanpa_keterangan: number
}

export function AttendanceChart({ days }: { days: AttendanceChartDay[] }) {
  return (
    <ChartContainer config={CONFIG} className="h-64 w-full">
      <BarChart data={days} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={0} fontSize={12} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {(Object.keys(CONFIG) as (keyof typeof CONFIG)[]).map((k) => (
          <Bar key={k} dataKey={k} stackId="a" fill={`var(--color-${k})`} />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
