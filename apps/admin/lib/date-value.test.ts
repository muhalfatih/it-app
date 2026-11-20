import { describe, expect, it } from "vitest"

import { fromRange, toDate, toIso, toRange } from "./date-value"

describe("date-value", () => {
  it("bolak-balik satu tanggal", () => {
    expect(toIso(toDate("2026-12-10"))).toBe("2026-12-10")
    expect(toDate("")).toBeUndefined()
    expect(toIso(undefined)).toBe("")
  })

  it("bolak-balik rentang; satu ujung = satu hari; kosong", () => {
    expect(fromRange(toRange("2026-12-10", "2026-12-16"))).toEqual({ start: "2026-12-10", end: "2026-12-16" })
    expect(fromRange({ from: toDate("2026-12-10"), to: undefined })).toEqual({
      start: "2026-12-10",
      end: "2026-12-10",
    })
    expect(toRange("", "")).toBeUndefined()
    expect(fromRange(undefined)).toEqual({ start: "", end: "" })
  })
})
