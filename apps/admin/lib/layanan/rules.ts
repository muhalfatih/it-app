// Aturan murni Layanan (tanpa db/next): label, nomor WA, dan rekap pengaduan per pekan WIB.
import type { Issue, OthersAffected, ServiceStatus } from "./types"
import { addDays, format, parseISO } from "date-fns"
import { id } from "date-fns/locale"

import type { IsoDate } from "@/lib/planner/types"

export const ISSUE_LABELS: Record<Issue, string> = {
  a: "Wifi #INSANTAMA tidak muncul/tidak terbaca",
  b: "Tidak bisa terhubung ke #INSANTAMA",
  c: "Username atau password salah/tidak tahu",
  d: "Terhubung ke #INSANTAMA tetapi tidak bisa akses internet sama sekali",
  e: "Terhubung ke #INSANTAMA tetapi akses internet lambat",
  f: "Bisa akses internet, namun tidak dapat mengakses website atau aplikasi tertentu",
}

export const OTHERS_LABELS: Record<OthersAffected, string> = {
  ya: "Ya",
  tidak: "Tidak",
  tidak_tahu: "Tidak tahu",
}

export const STATUS_LABELS: Record<ServiceStatus, string> = {
  diajukan: "Diajukan",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  dibatalkan: "Dibatalkan",
}

/** Hapus spasi/strip/kurung; `+` opsional di depan; 9–16 digit. */
export function normalizeWa(raw: string): string | null {
  const s = raw.replace(/[\s\-()]/g, "")
  return /^\+?\d{9,16}$/.test(s) ? s : null
}

const WIB_MS = 7 * 3_600_000
const iso = (d: Date) => d.toISOString().slice(0, 10)

/** Senin pekan itu menurut WIB. */
export function weekStartWib(d: Date): IsoDate {
  const t = new Date(d.getTime() + WIB_MS) // getUTC* di sini = jam dinding WIB
  return iso(new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * 86_400_000))
}

/** Rentang bulan WIB: from inklusif, to eksklusif. */
export function monthRangeWib(month: string): { from: Date; to: Date } {
  const [y, m] = month.split("-").map(Number)
  return {
    from: new Date(Date.UTC(y, m - 1, 1) - WIB_MS),
    to: new Date(Date.UTC(y, m, 1) - WIB_MS),
  }
}

const tally = <T extends string>(keys: T[]) => {
  const map = new Map<T, number>()
  for (const k of keys) map.set(k, (map.get(k) ?? 0) + 1)
  return [...map].sort((a, b) => b[1] - a[1])
}

export function summarizeComplaints(
  rows: { startedAt: Date; buildingName: string; issue: Issue }[],
  month: string
) {
  const { from, to } = monthRangeWib(month)
  const inMonth = rows.filter((r) => r.startedAt >= from && r.startedAt < to)

  const counts = new Map<string, number>()
  for (const r of inMonth) {
    const k = weekStartWib(r.startedAt)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const weeks: { start: IsoDate; label: string; count: number }[] = []
  const last = weekStartWib(new Date(to.getTime() - 1))
  for (let s = weekStartWib(from); s <= last; s = iso(new Date(Date.parse(s) + 7 * 86_400_000))) {
    const a = parseISO(s)
    weeks.push({
      start: s,
      label: `${format(a, "d MMM", { locale: id })} – ${format(addDays(a, 6), "d MMM", { locale: id })}`,
      count: counts.get(s) ?? 0,
    })
  }

  return {
    weeks,
    buildings: tally(inMonth.map((r) => r.buildingName)).map(([name, count]) => ({ name, count })),
    issues: tally(inMonth.map((r) => r.issue)).map(([issue, count]) => ({
      issue,
      label: ISSUE_LABELS[issue],
      count,
    })),
  }
}
