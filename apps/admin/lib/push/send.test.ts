import { readFileSync } from "node:fs"

import { describe, expect, it, vi } from "vitest"

import { deliver, type Sub } from "./send"

const sub = (endpoint: string): Sub => ({ endpoint, p256dh: "k", auth: "a" })
const httpError = (statusCode: number) => Object.assign(new Error("push"), { statusCode })

describe("deliver", () => {
  it("menghapus langganan yang dijawab 404/410", async () => {
    const send = vi.fn(async (s: Sub) => {
      if (s.endpoint === "gone") throw httpError(410)
      if (s.endpoint === "missing") throw httpError(404)
    })
    const remove = vi.fn(async () => {})
    await deliver([sub("ok"), sub("gone"), sub("missing")], "{}", send, remove)
    expect(remove).toHaveBeenCalledWith(["gone", "missing"])
  })

  it("satu endpoint gagal tidak menghentikan sisanya dan tidak dilempar", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const sent: string[] = []
    const send = vi.fn(async (s: Sub) => {
      if (s.endpoint === "rusak") throw httpError(500)
      sent.push(s.endpoint)
    })
    const remove = vi.fn(async () => {})
    await deliver([sub("rusak"), sub("a"), sub("b")], "{}", send, remove)
    expect(sent).toEqual(["a", "b"])
    expect(remove).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})

describe("notify di luar request", () => {
  it("tanpa request scope after() melempar, jadi pengiriman dijalankan langsung", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { notify } = await import("./send")
    await notify({ userIds: ["u"] }, { title: "t", body: "b", url: "/" })
    // Tanpa kunci VAPID push() langsung berhenti sambil memberi peringatan: bukti ia berjalan inline.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("VAPID"))
    warn.mockRestore()
  })
})

describe("impor web-push", () => {
  // Bundler Vite/Next menambal default export, Node/tsx tidak: skrip cron mati di impor.
  it("tidak memakai default import (web-push 4 ESM tanpa default export)", () => {
    const src = readFileSync(new URL("./send.ts", import.meta.url), "utf8")
    expect(src).not.toMatch(/import\s+[A-Za-z_$][\w$]*\s+from\s+"web-push"/)
  })
})
