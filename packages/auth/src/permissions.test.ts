import { describe, expect, it } from "vitest"

import type { Role } from "@workspace/db/schema/roles"

import {
  PERMISSIONS,
  can,
  defaultMyWorkOnly,
  permissionsFor,
  type Permission,
} from "./permissions"

// Matriks akses spesifikasi §3.3: D=Direktur, M=Manajer, S=SDM Strategi, K=SDM Khusus.
const ROLE_CODE: Record<string, Role> = {
  D: "direktur",
  M: "manajer",
  S: "sdm_strategi",
  K: "sdm_khusus",
}
const MATRIX: [Permission, string][] = [
  ["planner.lihat", "DMSK"],
  ["planner.ubah", "MS"],
  ["planner.pdf", "DMSK"],
  ["planner.hapus_terkunci", "M"],
  ["laporan.isi", "MSK"],
  ["laporan.rekap.semua", "DM"],
  ["laporan.rekap.sendiri", "SK"],
  ["laporan.buka_kunci", "M"],
  ["tugas_manajer.kelola", "M"],
  ["kanban.lihat", "DMSK"],
  ["kanban.isi", "MSK"],
  // PRD #3 dan #4: Manajer diberi hak cadangan.
  ["kanban.ide_ke_draft", "MS"],
  ["kanban.draft_ke_review", "M"],
  ["kanban.review_ke_disetujui", "D"],
  ["kanban.tayang", "MSK"],
  ["kanban.batal_tayang", "M"],
  ["absensi.isi", "M"],
  ["absensi.rekap.semua", "DM"],
  ["absensi.rekap.sendiri", "SK"],
  ["layanan.ajukan", "DMSK"],
  ["layanan.setujui_sdm", "M"],
  ["pengaduan.lihat", "DMSK"],
  ["inventaris.kelola", "M"],
  ["peminjaman.catat", "MSK"],
  ["setting.kelola", "M"],
]

describe("matriks akses §3.3 (satu peran)", () => {
  it("mencakup setiap izin tepat sekali", () => {
    expect(MATRIX.map(([p]) => p).sort()).toEqual([...PERMISSIONS].sort())
  })

  for (const [permission, allowed] of MATRIX) {
    for (const [code, role] of Object.entries(ROLE_CODE)) {
      const expected = allowed.includes(code)
      it(`${role} ${expected ? "boleh" : "tidak boleh"} ${permission}`, () => {
        expect(can([role], permission)).toBe(expected)
      })
    }
  }
})

it("hanya Manajer yang boleh membuka kunci laporan", () => {
  expect(can(["manajer"], "laporan.buka_kunci")).toBe(true)
  for (const role of ["direktur", "sdm_strategi", "sdm_khusus"] as const)
    expect(can([role], "laporan.buka_kunci")).toBe(false)
})

describe("akun tanpa peran (Staf Unit Lain)", () => {
  it("hanya boleh mengajukan layanan", () => {
    expect([...permissionsFor([])]).toEqual(["layanan.ajukan"])
  })
})

describe("multi-peran", () => {
  it("hak akses = gabungan semua peran", () => {
    const p = permissionsFor(["sdm_strategi", "sdm_khusus"])
    expect(p.has("kanban.ide_ke_draft")).toBe(true)
    expect(p.has("laporan.isi")).toBe(true)
    expect(p.has("setting.kelola")).toBe(false)
  })

  it("Direktur tidak mengisi laporan dan tidak mencentang Tayang", () => {
    expect(can(["direktur"], "laporan.isi")).toBe(false)
    expect(can(["direktur"], "kanban.tayang")).toBe(false)
    expect(can(["direktur"], "kanban.review_ke_disetujui")).toBe(true)
    expect(can(["direktur"], "laporan.rekap.semua")).toBe(true)
  })
})

describe("filter awal 'Pekerjaan saya saja'", () => {
  it.each<[Role[], boolean]>([
    [["sdm_khusus"], true],
    [["sdm_khusus", "sdm_strategi"], false],
    [["sdm_khusus", "manajer"], false],
    [["sdm_khusus", "direktur"], false],
    [["sdm_strategi"], false],
    [[], false],
  ])("%j -> %s", (roles, expected) => {
    expect(defaultMyWorkOnly(roles)).toBe(expected)
  })
})
