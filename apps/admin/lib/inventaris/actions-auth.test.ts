import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Role } from "@workspace/db/schema/roles"

// Otorisasi aksi server Inventaris per peran (spec "Pengujian → Otorisasi"): izin dicek di
// pembungkus aksi, bukan hanya di halaman. Mutasi di-mock agar tes tidak butuh database.
const viewer = vi.hoisted(() => ({ roles: [] as Role[] }))
const calls = vi.hoisted(() => [] as string[])

vi.mock("next/cache", () => ({ revalidatePath: () => {} }))
vi.mock("@workspace/auth/session", async () => {
  const { withPermissionUsing } = await import("@workspace/auth/authorize")
  return {
    getCurrentUser: async () => ({ id: "u1" }),
    withPermission: (permission: never, fn: never) =>
      withPermissionUsing(
        async () => ({ roles: viewer.roles, disabled: false }),
        permission,
        fn
      ),
  }
})
vi.mock("@/lib/inventaris/mutations", () => {
  const ok = (name: string) => async () => {
    calls.push(name)
    return { ok: true }
  }
  return {
    createEquipment: ok("createEquipment"),
    updateEquipment: ok("updateEquipment"),
    setEquipmentActive: ok("setEquipmentActive"),
    deleteEquipment: ok("deleteEquipment"),
    resolveProblem: ok("resolveProblem"),
    createLoan: ok("createLoan"),
    returnLoan: ok("returnLoan"),
  }
})

const kelola = await import("@/app/(app)/inventaris/actions")
const { createLoanAction } = await import("@/app/(app)/inventaris/peminjaman/baru/actions")
const { returnLoanAction } = await import("@/app/(app)/inventaris/peminjaman/[id]/actions")

const kelolaActions = [
  () => kelola.createEquipmentAction({}),
  () => kelola.updateEquipmentAction(1, {}),
  () => kelola.setEquipmentActiveAction(1, false),
  () => kelola.deleteEquipmentAction(1),
  () => kelola.resolveProblemAction(1, 1),
]
const catatActions = [() => createLoanAction({}), () => returnLoanAction(1, {})]

const DENIED = { error: "Tidak diizinkan" }

describe("otorisasi aksi Inventaris", () => {
  beforeEach(() => {
    calls.length = 0
  })

  it.each<[Role[], boolean, boolean]>([
    [["manajer"], true, true],
    [["sdm_strategi"], false, true],
    [["sdm_khusus"], false, true],
    [["direktur"], false, false],
    [[], false, false],
  ])("peran %j: kelola=%s, catat=%s", async (roles, bolehKelola, bolehCatat) => {
    viewer.roles = roles
    for (const run of kelolaActions) {
      expect(await run()).toEqual(bolehKelola ? { ok: true } : DENIED)
    }
    for (const run of catatActions) {
      expect(await run()).toEqual(bolehCatat ? { ok: true } : DENIED)
    }
    const expected = (bolehKelola ? 5 : 0) + (bolehCatat ? 2 : 0)
    expect(calls).toHaveLength(expected)
  })
})
