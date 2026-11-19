import { describe, expect, it, vi } from "vitest"

import { UserError } from "@/lib/user-error"

vi.mock("@/lib/storage", () => ({
  presignUpload: vi.fn(async (key: string) => ({ url: "http://minio/up", fields: { key } })),
  statObject: vi.fn(),
  listObjects: vi.fn(),
  removeObjects: vi.fn(),
}))

import { parseRundownKey, rundownKeyFor, startRundownUpload } from "./rundown"

const U = "123e4567-e89b-12d3-a456-426614174000"

describe("parseRundownKey", () => {
  it("menolak kunci bukan requests/<uuid>.<ext>", () => {
    expect(parseRundownKey("cards/1/x.png")).toBeNull()
    expect(parseRundownKey("requests/../x.pdf")).toBeNull()
    expect(parseRundownKey(`requests/${U}.exe`)).toBeNull()
  })
  it("kunci valid memberi mime", () => {
    expect(parseRundownKey(`requests/${U}.pdf`)).toEqual({ mime: "application/pdf" })
    expect(parseRundownKey(rundownKeyFor("image/png", U))).toEqual({ mime: "image/png" })
  })
})

describe("startRundownUpload", () => {
  it("menolak 11 MB dan MIME text/html", async () => {
    await expect(
      startRundownUpload({ name: "a.pdf", size: 11 * 1024 * 1024, mime: "application/pdf" })
    ).rejects.toBeInstanceOf(UserError)
    await expect(
      startRundownUpload({ name: "a.html", size: 10, mime: "text/html" })
    ).rejects.toBeInstanceOf(UserError)
  })
  it("menerima berkas valid", async () => {
    const r = await startRundownUpload({ name: "a.pdf", size: 10, mime: "application/pdf" })
    expect(r.key).toMatch(/^requests\/[0-9a-f-]{36}\.pdf$/)
  })
})
