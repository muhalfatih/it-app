import { describe, expect, it } from "vitest"

import { summarizeAttendance, workdaysIn } from "./recap"

describe("workdaysIn", () => {
  it("Senin–Sabtu bukan libur dalam rentang", () => {
    // 30 Nov (Sen) – 6 Des (Min); Rabu 2 Des libur.
    expect(workdaysIn("2026-11-30", "2026-12-06", new Set(["2026-12-02"]))).toEqual([
      "2026-11-30",
      "2026-12-01",
      "2026-12-03",
      "2026-12-04",
      "2026-12-05",
    ])
  })
  it("rentang terbalik kosong", () => {
    expect(workdaysIn("2026-12-06", "2026-12-01", new Set())).toEqual([])
  })
})

describe("summarizeAttendance", () => {
  const workdays = ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05"]
  const rows = new Map<string, "sakit" | "izin" | "hadir">([
    ["2026-12-02", "sakit"],
    ["2026-12-03", "izin"],
    ["2026-12-04", "hadir"],
    ["2026-12-09", "sakit"], // di luar hari kerja yang dihitung
  ])
  const r = summarizeAttendance(workdays, rows)

  it("tanpa baris dan baris Hadir dihitung Hadir; selain itu per status", () => {
    expect(r.counts).toEqual({
      hadir: 3,
      izin: 1,
      izin_kegiatan: 0,
      sakit: 1,
      tanpa_keterangan: 0,
    })
    expect(r.total).toBe(5)
  })

  it("daftar ketidakhadiran berurut tanggal, tanpa yang di luar rentang", () => {
    expect(r.absences).toEqual([
      { date: "2026-12-02", status: "sakit" },
      { date: "2026-12-03", status: "izin" },
    ])
  })
})
