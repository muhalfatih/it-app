import { describe, expect, it } from "vitest"

import type { Permission } from "@workspace/auth/permissions"
import type { CurrentUser } from "@workspace/auth/session"
import { activeUrl } from "@workspace/ui/lib/active-url"

import { menuFor } from "./menu"

const userWith = (...perms: Permission[]) =>
  ({ permissions: new Set(perms) }) as unknown as CurrentUser

const titles = (user: CurrentUser) =>
  menuFor(user).map((s) => [s.title, s.items.map((i) => i.title)])

describe("menuFor", () => {
  it("staf unit lain hanya melihat Beranda dan Layanan", () => {
    const menu = menuFor(userWith("layanan.ajukan"))
    expect(menu.map((s) => s.title)).toEqual(["Kerja saya"])
    expect(menu[0]?.items.map((i) => i.title)).toEqual(["Beranda", "Layanan"])
  })

  it("menu dengan satu sub-menu tersisa jadi link langsung", () => {
    const absensi = menuFor(userWith("absensi.isi"))[0]?.items[1]
    expect(absensi).toMatchObject({ title: "Absensi", url: "/absensi", items: [] })
  })

  it("versi 'saya' disembunyikan untuk akun yang punya rekap tim", () => {
    const manager = userWith(
      "absensi.isi",
      "absensi.rekap.sendiri",
      "absensi.rekap.semua"
    )
    expect(titles(manager)).toEqual([
      ["Kerja saya", ["Beranda", "Absensi"]],
      ["Pantau tim", ["Absensi tim"]],
    ])
    expect(menuFor(manager)[0]?.items[1]?.items).toEqual([])
  })
})

describe("activeUrl", () => {
  const urls = [
    "/",
    "/absensi",
    "/absensi/rekap",
    "/planner",
    "/planner?tampilan=kalender",
  ]

  it("prefiks terpanjang menang", () => {
    expect(activeUrl(urls, "/absensi/rekap/12", "")).toBe("/absensi/rekap")
    expect(activeUrl(urls, "/absensi", "")).toBe("/absensi")
  })

  it("query di URL menu harus cocok", () => {
    expect(activeUrl(urls, "/planner", "?tampilan=kalender&minggu=2")).toBe(
      "/planner?tampilan=kalender"
    )
    expect(activeUrl(urls, "/planner", "")).toBe("/planner")
  })

  it("Beranda hanya cocok persis", () => {
    expect(activeUrl(urls, "/", "")).toBe("/")
    expect(activeUrl(urls, "/galeri", "")).toBeNull()
  })
})
