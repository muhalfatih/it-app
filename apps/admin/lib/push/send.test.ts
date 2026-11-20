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
