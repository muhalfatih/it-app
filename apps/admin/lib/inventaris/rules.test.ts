import { afterEach, describe, expect, it, vi } from "vitest"

import { normalizeWa } from "@/lib/wa"

import { loanStatus, summarizeStock, type StockRow } from "./rules"
import { loanInputSchema, returnInputSchema } from "./schema"

afterEach(() => vi.useRealTimers())

describe("normalizeWa", () => {
  it("normalizes", () => {
    expect(normalizeWa("0812-3456-7890")).toBe("081234567890")
    expect(normalizeWa("+62 812 3456 7890")).toBe("+6281234567890")
    expect(normalizeWa("12345")).toBeNull()
    expect(normalizeWa("08a12")).toBeNull()
  })
})

describe("summarizeStock", () => {
  const eq = [{ id: 1, total: 5 }]
  const row = (p: Partial<StockRow>): StockRow => ({
    equipmentId: 1,
    qty: 2,
    problemQty: 0,
    returned: false,
    resolved: false,
    ...p,
  })

  it("counts unreturned qty", () => {
    expect(summarizeStock(eq, [row({})])).toEqual([
      { id: 1, total: 5, onLoan: 2, unresolved: 0, available: 3 },
    ])
  })
  it("does not double count a returned problem row", () => {
    expect(summarizeStock(eq, [row({ returned: true, problemQty: 2 })])).toEqual([
      { id: 1, total: 5, onLoan: 0, unresolved: 2, available: 3 },
    ])
  })
  it("resolved problem no longer holds stock", () => {
    expect(
      summarizeStock(eq, [row({ returned: true, problemQty: 2, resolved: true })])[0]?.available
    ).toBe(5)
  })
  it("equipment without rows is fully available", () => {
    expect(summarizeStock(eq, [])[0]?.available).toBe(5)
  })
  it("combines loan and unresolved problem", () => {
    const rows = [row({ qty: 3 }), row({ qty: 1, returned: true, problemQty: 1 })]
    expect(summarizeStock(eq, rows)[0]?.available).toBe(1)
  })
})

describe("loanStatus", () => {
  const now = new Date("2026-11-20T17:30:00Z") // 21 Nov 00.30 WIB
  it("is terlambat after due across WIB midnight", () => {
    expect(loanStatus({ dueAt: new Date("2026-11-20T16:59:00Z"), returnedAt: null }, now)).toBe(
      "terlambat"
    )
  })
  it("is dipinjam before due", () => {
    expect(loanStatus({ dueAt: new Date("2026-11-20T18:00:00Z"), returnedAt: null }, now)).toBe(
      "dipinjam"
    )
  })
  it("is dikembalikan once returned even if overdue", () => {
    expect(
      loanStatus({ dueAt: new Date("2026-11-20T16:59:00Z"), returnedAt: new Date(now) }, now)
    ).toBe("dikembalikan")
  })
})

describe("loanInputSchema", () => {
  const start = new Date("2026-11-20T01:00:00Z")
  const base = {
    borrowerName: "Budi",
    unitId: 1,
    waNumber: "",
    startedAt: start,
    dueAt: new Date("2026-11-20T05:00:00Z"),
    items: [{ equipmentId: 1, qty: 1 }],
  }

  it("accepts and normalizes", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-20T02:00:00Z"))
    expect(loanInputSchema.parse(base).waNumber).toBeNull()
    expect(loanInputSchema.parse({ ...base, waNumber: "0812-3456-7890" }).waNumber).toBe(
      "081234567890"
    )
  })
  it.each([
    ["empty items", { items: [] }],
    ["21 items", { items: Array.from({ length: 21 }, (_, i) => ({ equipmentId: i + 1, qty: 1 })) }],
    ["duplicate equipment", { items: [{ equipmentId: 1, qty: 1 }, { equipmentId: 1, qty: 2 }] }],
    ["qty 0", { items: [{ equipmentId: 1, qty: 0 }] }],
    ["due <= start", { dueAt: start }],
    ["start 10 min in future", { startedAt: new Date("2026-11-20T02:10:00Z"), dueAt: new Date("2026-11-20T05:00:00Z") }],
    ["bad wa", { waNumber: "12345" }],
  ])("rejects %s", (_n, patch) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-20T02:00:00Z"))
    expect(loanInputSchema.safeParse({ ...base, ...patch }).success).toBe(false)
  })
})

describe("returnInputSchema", () => {
  const item = { equipmentId: 1, problemQty: 0, problemNote: null }
  const ok = (items: unknown[]) =>
    returnInputSchema.safeParse({ returnedAt: new Date(Date.now() - 60_000), items }).success

  it("accepts", () => {
    expect(ok([item])).toBe(true)
    expect(ok([{ ...item, problemQty: 2, problemNote: "Layar retak" }])).toBe(true)
  })
  it.each([
    ["problem without note", { problemQty: 2 }],
    ["note too short", { problemQty: 2, problemNote: "ab" }],
    ["negative problemQty", { problemQty: -1 }],
  ])("rejects %s", (_n, patch) => {
    expect(ok([{ ...item, ...patch }])).toBe(false)
  })
})
