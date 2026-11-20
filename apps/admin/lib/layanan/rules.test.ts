import { afterEach, describe, expect, it, vi } from "vitest"

import { complaintInputSchema, requestInputSchema } from "./schema"
import { nowWib, summarizeComplaints, weekStartWib } from "./rules"

afterEach(() => vi.useRealTimers())

describe("weekStartWib", () => {
  it("uses Monday in WIB", () => {
    expect(weekStartWib(new Date("2026-11-22T16:30:00Z"))).toBe("2026-11-16")
    expect(weekStartWib(new Date("2026-11-22T17:30:00Z"))).toBe("2026-11-23")
  })
})

describe("summarizeComplaints", () => {
  it("groups by week, building, issue", () => {
    const r = summarizeComplaints(
      [
        { startedAt: new Date("2026-11-22T16:30:00Z"), buildingName: "A", issue: "a" },
        { startedAt: new Date("2026-11-10T03:00:00Z"), buildingName: "B", issue: "a" },
        { startedAt: new Date("2026-11-11T03:00:00Z"), buildingName: "B", issue: "e" },
      ],
      "2026-11"
    )
    expect(r.weeks[0]).toEqual({ start: "2026-10-26", label: "26 Okt – 1 Nov", count: 0 })
    expect(r.weeks.map((w) => w.start)).toEqual([
      "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30",
    ])
    expect(r.weeks.map((w) => w.count)).toEqual([0, 0, 2, 1, 0, 0])
    expect(r.buildings).toEqual([
      { name: "B", count: 2 },
      { name: "A", count: 1 },
    ])
    expect(r.issues.map((i) => [i.issue, i.count])).toEqual([["a", 2], ["e", 1]])
  })
})

const base = {
  activityName: "Seminar",
  startDate: "2026-12-01",
  endDate: "2026-12-02",
  unitId: 1,
  waNumber: "0812-3456-7890",
  feeAgreed: true,
  needs: [{ taskTypeId: 1 }],
  rundownKey: null,
  rundownName: null,
}

describe("requestInputSchema", () => {
  it("accepts and normalizes", () => {
    const r = requestInputSchema.parse(base)
    expect(r.waNumber).toBe("081234567890")
  })
  it.each([
    ["empty needs", { needs: [] }],
    ["21 needs", { needs: Array.from({ length: 21 }, () => ({ taskTypeId: 1 })) }],
    ["fee false", { feeAgreed: false }],
    ["end<start", { endDate: "2026-11-30" }],
    ["non-calendar", { startDate: "2026-02-30" }],
  ])("rejects %s", (_n, patch) => {
    expect(requestInputSchema.safeParse({ ...base, ...patch }).success).toBe(false)
  })
})

describe("complaintInputSchema", () => {
  it("rejects startedAt >5 min in future", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-19T00:00:00Z"))
    const c = { buildingId: 1, room: "R1", issue: "a", othersAffected: "ya", description: null }
    expect(
      complaintInputSchema.safeParse({ ...c, startedAt: new Date("2026-11-19T00:10:00Z") }).success
    ).toBe(false)
    expect(
      complaintInputSchema.safeParse({ ...c, startedAt: new Date("2026-11-19T00:03:00Z") }).success
    ).toBe(true)
  })
})

describe("nowWib", () => {
  it("uses WIB wall clock across the date line", () => {
    expect(nowWib(new Date("2026-11-30T17:30:00Z"))).toEqual({
      date: "2026-12-01",
      time: "00:30",
      month: "2026-12",
    })
  })
})
