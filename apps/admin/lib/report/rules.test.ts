import { describe, expect, it } from "vitest"

import {
  REPORT_START_DATE,
  firstReportDay,
  isReportDay,
  isWorkday,
  lockDeadline,
  workdaysBetween,
} from "./rules"

const H = new Set(["2026-12-07"]) // Senin libur

describe("tanggal laporan", () => {
  it("hari kerja = Senin–Sabtu bukan libur", () => {
    expect(isWorkday("2026-12-05", H)).toBe(true)
    expect(isWorkday("2026-12-06", H)).toBe(false)
    expect(isWorkday("2026-12-07", H)).toBe(false)
  })

  it("batas kunci: pukul 10.00 WIB hari kerja berikutnya", () => {
    expect(lockDeadline("2026-12-05", H).toISOString()).toBe("2026-12-08T03:00:00.000Z")
    expect(lockDeadline("2026-12-02", new Set()).toISOString()).toBe("2026-12-03T03:00:00.000Z")
    expect(lockDeadline("2026-12-05", new Set()).toISOString()).toBe("2026-12-07T03:00:00.000Z")
  })

  it("hari laporan pertama = yang lebih akhir dari go-live dan akun dibuat (WIB)", () => {
    expect(firstReportDay(new Date("2026-11-01T00:00:00Z"))).toBe(REPORT_START_DATE)
    expect(firstReportDay(new Date("2026-12-09T20:00:00Z"))).toBe("2026-12-10")
  })

  it("isReportDay menolak masa depan, sebelum awal, dan Minggu", () => {
    expect(isReportDay("2026-12-03", H, "2026-12-01", "2026-12-02")).toBe(false)
    expect(isReportDay("2026-11-30", H, "2026-12-01", "2026-12-02")).toBe(false)
    expect(isReportDay("2026-12-06", H, "2026-12-01", "2026-12-08")).toBe(false)
    expect(isReportDay("2026-12-02", H, "2026-12-01", "2026-12-02")).toBe(true)
  })

  it("workdaysBetween menghitung hari kerja di (after, upTo]", () => {
    expect(workdaysBetween("2026-12-04", "2026-12-08", H)).toBe(2)
  })
})
