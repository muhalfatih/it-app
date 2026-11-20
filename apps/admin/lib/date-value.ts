import { format, parseISO } from "date-fns"

/** Sama bentuknya dengan `DateRange` react-day-picker (dependensi packages/ui, bukan admin). */
type DateRange = { from: Date | undefined; to?: Date }

/** Tanggal ISO (`yyyy-MM-dd`) formulir ↔ nilai pemilih tanggal galeri (c-calendar-24/25). */
export function toDate(iso: string): Date | undefined {
  return iso ? parseISO(iso) : undefined
}

export function toIso(date: Date | undefined): string {
  return date ? format(date, "yyyy-MM-dd") : ""
}

export function toRange(start: string, end: string): DateRange | undefined {
  return start ? { from: parseISO(start), to: end ? parseISO(end) : undefined } : undefined
}

/** Rentang dengan satu ujung saja dianggap satu hari (end = start). Kosong → "". */
export function fromRange(range: DateRange | undefined): { start: string; end: string } {
  return { start: toIso(range?.from), end: toIso(range?.to ?? range?.from) }
}
