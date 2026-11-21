import { describe, expect, it } from "vitest"

import {
  assertManagerRemains,
  passwordSchema,
  simtamaUserInfo,
  usernameSchema,
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

describe("passwordSchema", () => {
  it("minimal 8 karakter", () => {
    expect(passwordSchema.safeParse("1234567").success).toBe(false)
    expect(passwordSchema.safeParse("12345678").success).toBe(true)
  })
})

describe("assertManagerRemains", () => {
  const accounts = [
    { id: "m1", roles: ["manajer" as const], disabled: false },
    { id: "s1", roles: ["sdm_khusus" as const], disabled: false },
  ]

  it("menolak melepas peran Manajer aktif terakhir", () => {
    expect(() =>
      assertManagerRemains(accounts, { id: "m1", roles: ["sdm_strategi"] })
    ).toThrow("Harus ada minimal satu Manajer aktif")
  })

  it("menolak menonaktifkan Manajer aktif terakhir", () => {
    expect(() =>
      assertManagerRemains(accounts, { id: "m1", disabled: true })
    ).toThrow("Harus ada minimal satu Manajer aktif")
  })

  it("aman bila masih ada Manajer aktif lain", () => {
    const two = [
      ...accounts,
      { id: "m2", roles: ["manajer" as const], disabled: false },
    ]
    expect(() =>
      assertManagerRemains(two, { id: "m1", disabled: true })
    ).not.toThrow()
  })

  it("Manajer lain yang nonaktif tidak dihitung", () => {
    const withDisabled = [
      ...accounts,
      { id: "m2", roles: ["manajer" as const], disabled: true },
    ]
    expect(() =>
      assertManagerRemains(withDisabled, { id: "m1", roles: [] })
    ).toThrow()
  })

  it("perubahan akun non-Manajer selalu aman", () => {
    expect(() =>
      assertManagerRemains(accounts, { id: "s1", disabled: true })
    ).not.toThrow()
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
