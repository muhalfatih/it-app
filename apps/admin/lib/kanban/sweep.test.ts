import { describe, expect, it } from "vitest"

import { pickOrphans } from "./pick-orphans"

const now = new Date("2026-11-18T12:00:00Z")
const ago = (h: number) => new Date(now.getTime() - h * 3_600_000)

describe("pickOrphans", () => {
  it("hanya objek tanpa baris dan lebih tua dari 24 jam", () => {
    const objs = [
      { key: "cards/1/a", lastModified: ago(25) }, // yatim lama
      { key: "cards/1/b", lastModified: ago(1) }, // yatim baru
      { key: "cards/1/c", lastModified: ago(100) }, // punya baris
    ]
    expect(pickOrphans(objs, new Set(["cards/1/c"]), now)).toEqual(["cards/1/a"])
  })
})
