import { describe, expect, it } from "vitest"

import { permissionsFor } from "@workspace/auth/permissions"

import {
  allowedMoves,
  canCheck,
  canEditContent,
  canUncheck,
  formatWib,
  isFullyPublished,
  noteSchema,
  publishUrlError,
} from "./rules"

const M = permissionsFor(["manajer"])
const S = permissionsFor(["sdm_strategi"])
const K = permissionsFor(["sdm_khusus"])
const D = permissionsFor(["direktur"])

describe("allowedMoves", () => {
  it.each([
    ["manajer di ide", M, "ide", 0, { forward: "draft" }],
    ["sdm strategi di ide", S, "ide", 0, { forward: "draft" }],
    ["sdm khusus di ide", K, "ide", 0, {}],
    ["manajer di draft", M, "draft", 0, { forward: "review", back: "ide" }],
    ["sdm strategi di draft", S, "draft", 0, { back: "ide" }],
    ["direktur di review", D, "review", 0, { forward: "disetujui" }],
    ["manajer di review", M, "review", 0, { back: "draft" }],
    [
      "manajer+direktur di review",
      permissionsFor(["manajer", "direktur"]),
      "review",
      0,
      { forward: "disetujui", back: "draft" },
    ],
    ["direktur di disetujui tanpa centang", D, "disetujui", 0, { back: "review" }],
    ["direktur di disetujui dengan centang", D, "disetujui", 1, {}],
    ["manajer di disetujui", M, "disetujui", 0, {}],
    ["manajer di tayang", M, "tayang", 2, {}],
  ] as const)("%s", (_, perms, stage, published, expected) => {
    expect(allowedMoves(perms, stage, published)).toEqual(expected)
  })
})

describe("wewenang isi dan tayang", () => {
  it("isi kartu hanya di ide/draft bagi pemegang kanban.isi", () => {
    expect(canEditContent(K, "draft")).toBe(true)
    expect(canEditContent(K, "ide")).toBe(true)
    expect(canEditContent(K, "review")).toBe(false)
    expect(canEditContent(D, "ide")).toBe(false)
  })

  it("centang hanya di disetujui, bukan direktur", () => {
    expect(canCheck(K, "disetujui")).toBe(true)
    expect(canCheck(K, "review")).toBe(false)
    expect(canCheck(K, "tayang")).toBe(false)
    expect(canCheck(D, "disetujui")).toBe(false)
  })

  it("batal centang hanya manajer, di disetujui/tayang", () => {
    expect(canUncheck(M, "tayang")).toBe(true)
    expect(canUncheck(M, "disetujui")).toBe(true)
    expect(canUncheck(M, "review")).toBe(false)
    expect(canUncheck(S, "tayang")).toBe(false)
  })
})

describe("isFullyPublished", () => {
  it.each([
    [[1, 2], [2, 1], true],
    [[1, 2], [1], false],
    [[], [], false],
    [[1], [1, 9], true],
  ])("%j / %j -> %s", (channels, published, expected) => {
    expect(isFullyPublished(channels, published)).toBe(expected)
  })
})

describe("publishUrlError", () => {
  it.each([
    [true, null, false],
    [true, "https://youtu.be/x", true],
    [true, "http://instagram.com/p/1", true],
    [true, "javascript:alert(1)", false],
    [true, "youtu.be/x", false],
    [true, "   ", false],
    [false, null, true],
    [false, "", true],
    [false, "ftp://x", false],
    [false, "javascript:alert(1)", false],
  ] as const)("wajib=%s, %j -> valid %s", (requiresLink, url, valid) => {
    expect(publishUrlError(requiresLink, url) === null).toBe(valid)
  })
})

describe("noteSchema", () => {
  it("menolak spasi saja dan teks > 2000", () => {
    expect(noteSchema.safeParse("   ").success).toBe(false)
    expect(noteSchema.safeParse("a".repeat(2001)).success).toBe(false)
    expect(noteSchema.parse("  Perbaiki judul ")).toBe("Perbaiki judul")
  })
})

describe("formatWib", () => {
  it("menampilkan tanggal dan jam WIB", () => {
    expect(formatWib(new Date("2026-11-12T07:20:00Z"))).toBe("12 Nov 14.20")
    expect(formatWib(new Date("2026-11-12T17:05:00Z"))).toBe("13 Nov 00.05")
  })
})
