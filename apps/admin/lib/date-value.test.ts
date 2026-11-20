import { describe, expect, it } from "vitest"

import { fromDateValue, toDateValue } from "./date-value"

describe("date-value", () => {
  it("bolak-balik satu hari dan rentang", () => {
    expect(fromDateValue(toDateValue("2026-12-10"))).toEqual({ start: "2026-12-10", end: "2026-12-10" })
    expect(fromDateValue(toDateValue("2026-12-10", "2026-12-11"))).toEqual({
      start: "2026-12-10",
      end: "2026-12-11",
    })
  })

  it("kosong dan periode bukan hari menjadi null", () => {
    expect(toDateValue("")).toBeUndefined()
    expect(fromDateValue(undefined)).toBeNull()
    expect(fromDateValue({ period: "day", operator: "between" })).toBeNull()
    expect(fromDateValue({ period: "year", operator: "is", year: 2026 })).toBeNull()
  })
})
