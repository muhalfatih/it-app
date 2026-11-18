import { describe, expect, it } from "vitest"

import { UserError } from "@/lib/user-error"

import {
  extForMime,
  isSameIdSet,
  normalizeMime,
  objectKeyFor,
  parseObjectKey,
  validateUploadFile,
} from "./media-rules"

const U = "123e4567-e89b-12d3-a456-426614174000"

describe("kunci objek", () => {
  it("ekstensi per MIME", () => {
    expect(extForMime("video/quicktime")).toBe("mov")
    expect(extForMime("image/gif")).toBeNull()
  })
  it("objectKeyFor cocok pola dan bisa di-parse balik", () => {
    const k = objectKeyFor(7, "video/mp4", U)
    expect(k).toBe(`cards/7/${U}.mp4`)
    expect(parseObjectKey(7, k)).toEqual({ mime: "video/mp4" })
  })
  it.each([
    [`cards/8/${U}.mp4`],
    [`cards/7/../8/${U}.mp4`],
    [`../cards/7/${U}.mp4`],
    [`cards/7/${U}.gif`],
    [`cards/7/x.mp4`],
    [`cards/70/${U}.mp4`],
    [`uploads/7/${U}.mp4`],
  ])("menolak %s", (k) => expect(parseObjectKey(7, k)).toBeNull())
})

describe("validateUploadFile", () => {
  const ok = { name: "a.mp4", size: 10, mime: "video/mp4" }
  it("menerima foto dan video", () => {
    expect(validateUploadFile(ok)).toEqual({ mime: "video/mp4", kind: "video" })
    expect(validateUploadFile({ name: "x.MOV", size: 1, mime: "" })).toEqual({ mime: "video/quicktime", kind: "video" })
    expect(normalizeMime("f.jpeg", "")).toBe("image/jpeg")
  })
  it("menolak GIF, kosong, dan > 500 MB (tepat 500 MB lolos)", () => {
    expect(() => validateUploadFile({ name: "a.gif", size: 1, mime: "image/gif" })).toThrow(UserError)
    expect(() => validateUploadFile({ ...ok, size: 0 })).toThrow(UserError)
    expect(() => validateUploadFile({ ...ok, size: 501 * 1024 * 1024 })).toThrow("500 MB")
    expect(() => validateUploadFile({ ...ok, size: 500 * 1024 * 1024 })).not.toThrow()
  })
})

describe("isSameIdSet", () => {
  it("harus persis himpunan yang sama", () => {
    expect(isSameIdSet([1, 2, 3], [3, 1, 2])).toBe(true)
    expect(isSameIdSet([1, 2, 3], [1, 2])).toBe(false)
    expect(isSameIdSet([1, 2], [1, 2, 3])).toBe(false)
    expect(isSameIdSet([1, 2], [1, 1])).toBe(false)
    expect(isSameIdSet([1, 2], [1, 9])).toBe(false)
  })
})
