import { describe, expect, it } from "vitest"

import { resolvePeriod } from "../planner/rules"
import { parseRecapParams, periodLinks } from "./recap"

const NOW = new Date("2026-12-10T05:00:00Z") // Kamis 10 Des 2026, WIB

describe("parseRecapParams", () => {
  it("bawaan: bulan ini, tanggal hari ini", () => {
    expect(parseRecapParams({}, NOW)).toEqual({ rentang: "bulan", tanggal: "2026-12-10" })
  })
  it("pekan dan tanggal valid diterima", () => {
    expect(parseRecapParams({ rentang: "pekan", tanggal: "2026-12-02" }, NOW)).toEqual({
      rentang: "pekan",
      tanggal: "2026-12-02",
    })
  })
  it("tanggal masa depan dijepit ke hari ini; nilai asing jatuh ke bawaan", () => {
    expect(parseRecapParams({ tanggal: "2027-01-05" }, NOW).tanggal).toBe("2026-12-10")
    expect(parseRecapParams({ rentang: "tahun", tanggal: "2026-02-30" }, NOW)).toEqual({
      rentang: "bulan",
      tanggal: "2026-12-10",
    })
  })
})

describe("periodLinks", () => {
  it("bulan: sebelumnya ke awal bulan lalu; berikutnya hilang bila melewati hari ini", () => {
    const p = resolvePeriod({ tanggal: "2026-12-10", rentang: "bulan" })
    const l = periodLinks("/laporan/rekap", p, "2026-12-10", "2026-12-10")
    expect(l.prev).toBe("/laporan/rekap?rentang=bulan&tanggal=2026-11-01")
    expect(l.next).toBeNull()
    expect(l.pekan).toBe("/laporan/rekap?rentang=pekan&tanggal=2026-12-10")
  })
  it("pekan: berikutnya ada bila awal pekan depan belum lewat hari ini", () => {
    const p = resolvePeriod({ tanggal: "2026-12-02", rentang: "pekan" }) // 30 Nov–6 Des
    const l = periodLinks("/x", p, "2026-12-02", "2026-12-10")
    expect(l.prev).toBe("/x?rentang=pekan&tanggal=2026-11-23")
    expect(l.next).toBe("/x?rentang=pekan&tanggal=2026-12-07")
  })
})
