import { format, parseISO } from "date-fns"

import type { DateSelectorValue } from "@workspace/ui/components/reui/date-selector"

/** Tanggal ISO (`yyyy-MM-dd`) dari formulir → nilai DateSelectorPopover. Kosong → undefined. */
export function toDateValue(start: string, end = start): DateSelectorValue | undefined {
  if (!start) return undefined
  return start === end || !end
    ? { period: "day", operator: "is", startDate: parseISO(start) }
    : { period: "day", operator: "between", startDate: parseISO(start), endDate: parseISO(end) }
}

/** Nilai DateSelectorPopover → rentang ISO; satu hari = start sama dengan end. Bukan periode hari → null. */
export function fromDateValue(
  value: DateSelectorValue | undefined
): { start: string; end: string } | null {
  if (!value || value.period !== "day" || !value.startDate) return null
  const start = format(value.startDate, "yyyy-MM-dd")
  return { start, end: value.endDate ? format(value.endDate, "yyyy-MM-dd") : start }
}
