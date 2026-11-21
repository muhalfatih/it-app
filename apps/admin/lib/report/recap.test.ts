import { describe, expect, it } from "vitest"

import { dayScore, type ReportState } from "./rules"
import { formatPercent, summarizeRecap, type RecapDay } from "./recap"

type T = RecapDay["tasks"][number]
const t = (
  key: string,
  source: T["source"],
  status: T["status"],
  overdueDays = 0
): T => ({ key, source, title: `Tugas ${key}`, status, overdueDays })

function day(
  date: string,
  state: ReportState,
  tasks: T[],
  obstacles = ""
): RecapDay {
  const answers = new Map(
    tasks.flatMap((x) => (x.status ? [[x.key, x.status] as const] : []))
  )
  return { date, state, tasks, obstacles, score: dayScore(tasks, answers) }
}

describe("summarizeRecap", () => {
  const days = [
    day("2026-12-01", "terkunci", [t("rutin:1", "rutin", "T"), t("planner:1", "planner", "T")]), // 100%
    day("2026-12-02", "terkunci", [t("rutin:1", "rutin", "T"), t("planner:1", "planner", "TL", 2)], "Server lambat"), // 50%
    day("2026-12-03", "disembunyikan", [t("rutin:1", "rutin", null)]), // tidak dihitung
    day("2026-12-04", "libur", []),
    day("2026-12-05", "terbuka", []), // tanpa tugas: tidak ikut rata-rata
  ]
  const r = summarizeRecap(days)

  it("rata-rata dari persentase harian yang dihitung saja", () => {
    expect(r.average).toBe(75)
    expect(r.days.map((d) => d.pct)).toEqual([100, 50, null, null, null])
  })

  it("menjumlah rincian per sumber hanya dari hari yang dihitung", () => {
    expect(r.bySource.rutin).toEqual({ done: 2, total: 2 })
    expect(r.bySource.planner).toEqual({ done: 1, total: 2 })
  })

  it("daftar TL atau Tertunda, tanpa yang sudah T", () => {
    expect(r.open).toEqual([
      { date: "2026-12-02", key: "planner:1", title: "Tugas planner:1", source: "planner", status: "TL", overdueDays: 2 },
    ])
  })

  it("mengumpulkan Hambatan yang terisi", () => {
    expect(r.obstacles).toEqual([{ date: "2026-12-02", text: "Server lambat" }])
  })

  it("tanpa hari yang dihitung rata-rata null", () => {
    expect(summarizeRecap([day("2026-12-04", "libur", [])]).average).toBeNull()
  })
})

describe("formatPercent", () => {
  it("satu desimal dengan koma", () => {
    expect(formatPercent(54.545)).toBe("54,5%")
    expect(formatPercent(100)).toBe("100,0%")
  })
})
