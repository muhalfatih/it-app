import { describe, expect, it } from "vitest"

import {
  loginPath,
  safeNext,
  simtamaUserInfo,
  usernameSchema,
  withoutManager,
} from "./rules"

describe("usernameSchema", () => {
  it("menormalkan spasi dan huruf besar", () => {
    expect(usernameSchema.parse("  Budi ")).toBe("budi")
    expect(usernameSchema.parse("Siti.R_2")).toBe("siti.r_2")
  })
  it.each(["a", "ab", "budi santoso", "budi-s", "x".repeat(31), "bu@di"])(
    "menolak %j",
    (value) => {
      expect(usernameSchema.safeParse(value).success).toBe(false)
    }
  )
})

describe("safeNext / loginPath", () => {
  it("menerima path internal beserta query", () => {
    expect(safeNext("/konten/12?tab=komentar")).toBe("/konten/12?tab=komentar")
    expect(loginPath("/konten/12")).toBe("/masuk?next=%2Fkonten%2F12")
  })
  it.each([
    null,
    "",
    "https://jahat.test",
    "//jahat.test",
    "/\\jahat.test",
    "/a\\b",
    "/x\nSet-Cookie:a",
    "/masuk",
    "/masuk?next=/",
    "/api/auth/sign-out",
  ])("menolak %j", (value) => {
    expect(safeNext(value)).toBeUndefined()
  })
  it("tanpa tujuan berarti /masuk polos", () => {
    expect(loginPath("/")).toBe("/masuk")
    expect(loginPath("//jahat.test")).toBe("/masuk")
    expect(loginPath(undefined)).toBe("/masuk")
  })
  it("tidak salah menolak path yang hanya berawalan sama", () => {
    expect(safeNext("/masukan")).toBe("/masukan")
  })
})

describe("withoutManager", () => {
  it("membuang Manajer, peran lain tetap", () => {
    expect(withoutManager(["manajer", "sdm_khusus"])).toEqual(["sdm_khusus"])
    expect(withoutManager([])).toEqual([])
  })
})

describe("simtamaUserInfo", () => {
  it("memakai sub sebagai id dan email sintetis dari username", () => {
    expect(
      simtamaUserInfo({
        sub: 42,
        username: "Budi",
        name: "Budi S",
        email: "budi@x.id",
      })
    ).toEqual({
      id: "42",
      email: "budi@akun.lokal",
      name: "Budi S",
      emailVerified: false,
      username: "budi",
    })
  })
  it.each([
    undefined,
    {},
    { sub: "1" },
    { username: "budi" },
    { sub: "", username: "budi" },
    { sub: "1", username: "budi-s" },
  ])("menolak profil %j", (account) => {
    expect(simtamaUserInfo(account)).toBeNull()
  })
})
