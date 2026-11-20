import { describe, expect, it } from "vitest"

import { pickRecipients } from "./recipients"

const on = (id: string) => ({ id, disabledAt: null })

describe("pickRecipients", () => {
  it("membuang duplikat (mis. akun multi-peran muncul dua kali)", () => {
    expect(pickRecipients([on("a"), on("b"), on("a")])).toEqual(["a", "b"])
  })

  it("membuang aktor sendiri", () => {
    expect(pickRecipients([on("a"), on("b")], "a")).toEqual(["b"])
  })

  it("membuang akun nonaktif", () => {
    expect(
      pickRecipients([on("a"), { id: "b", disabledAt: new Date() }])
    ).toEqual(["a"])
  })
})
