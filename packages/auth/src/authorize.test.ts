import { describe, expect, it, vi } from "vitest"

import { authorize, withPermissionUsing, type Viewer } from "./authorize"

const viewer = (patch: Partial<NonNullable<Viewer>> = {}): Viewer => ({
  roles: ["sdm_khusus"],
  mustChangePassword: false,
  disabled: false,
  ...patch,
})

describe("authorize", () => {
  it("tanpa sesi -> unauthenticated", () => {
    expect(authorize(null)).toBe("unauthenticated")
  })
  it("akun nonaktif -> unauthenticated", () => {
    expect(authorize(viewer({ disabled: true }), "laporan.isi")).toBe(
      "unauthenticated"
    )
  })
  it("wajib ganti kata sandi -> must_change_password", () => {
    expect(authorize(viewer({ mustChangePassword: true }))).toBe(
      "must_change_password"
    )
  })
  it("halaman ganti kata sandi boleh dibuka saat wajib ganti", () => {
    expect(
      authorize(viewer({ mustChangePassword: true }), undefined, {
        allowPasswordChange: true,
      })
    ).toBe("ok")
  })
  it("tanpa izin -> forbidden", () => {
    expect(authorize(viewer(), "setting.kelola")).toBe("forbidden")
  })
  it("punya izin -> ok", () => {
    expect(authorize(viewer(), "laporan.isi")).toBe("ok")
    expect(authorize(viewer({ roles: ["manajer"] }), "setting.kelola")).toBe(
      "ok"
    )
  })
  it("tanpa peran hanya boleh layanan", () => {
    expect(authorize(viewer({ roles: [] }), "layanan.ajukan")).toBe("ok")
    expect(authorize(viewer({ roles: [] }), "planner.lihat")).toBe("forbidden")
  })
})

describe("withPermissionUsing (pembungkus aksi server)", () => {
  it("menolak tanpa menjalankan aksi bila tidak berizin", async () => {
    const fn = vi.fn(async () => "selesai")
    const action = withPermissionUsing(
      async () => viewer(),
      "setting.kelola",
      fn
    )
    await expect(action()).resolves.toEqual({ error: "Tidak diizinkan" })
    expect(fn).not.toHaveBeenCalled()
  })

  it("menolak tanpa sesi", async () => {
    const fn = vi.fn(async () => "selesai")
    const action = withPermissionUsing(async () => null, "laporan.isi", fn)
    await expect(action()).resolves.toEqual({ error: "Tidak diizinkan" })
    expect(fn).not.toHaveBeenCalled()
  })

  it("menjalankan aksi dengan argumennya bila berizin", async () => {
    const fn = vi.fn(async (a: number, b: number) => a + b)
    const action = withPermissionUsing(
      async () => viewer({ roles: ["manajer"] }),
      "setting.kelola",
      fn
    )
    await expect(action(2, 3)).resolves.toBe(5)
    expect(fn).toHaveBeenCalledWith(2, 3)
  })
})
