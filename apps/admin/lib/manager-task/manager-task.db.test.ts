// Tes integrasi Tugas dari Manajer terhadap database KHUSUS uji (dilewati bila bukan *_test).
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { Role } from "@workspace/db/schema/roles"

import { notify } from "@/lib/push/send"

vi.mock("@/lib/push/send", () => ({ notify: vi.fn(async () => {}) }))
const pushed = () => vi.mocked(notify).mock.calls.map(([to, m]) => ({ ...to, title: m.title }))

const TEST_DB = /\/[^/?]+_test(\?|$)/.test(process.env.DATABASE_URL ?? "")

describe.skipIf(!TEST_DB)("tugas dari manajer (database uji)", () => {
  let dbm: typeof import("@workspace/db/client")
  let orm: typeof import("@workspace/db/orm")
  let tables: typeof import("@workspace/db/schema")
  let accounts: typeof import("@workspace/auth/accounts")
  let mut: typeof import("./mutations")
  let qry: typeof import("./queries")

  beforeAll(async () => {
    dbm = await import("@workspace/db/client")
    orm = await import("@workspace/db/orm")
    tables = await import("@workspace/db/schema")
    accounts = await import("@workspace/auth/accounts")
    mut = await import("./mutations")
    qry = await import("./queries")
  })

  let boss = ""
  let s1 = ""
  let s2 = ""

  async function mk(username: string, roles: Role[]) {
    return accounts.createAccount({
      username,
      name: username,
      roles,
      bidang: [],
      unitId: null,
    })
  }

  const input = (patch: Record<string, unknown> = {}) => ({
    title: "Rapat vendor",
    startDate: "2026-12-02",
    endDate: "2026-12-04",
    assigneeIds: [s1, s2],
    ...patch,
  })

  beforeEach(async () => {
    await dbm.db.execute(orm.sql`truncate table "user" cascade`)
    boss = (await mk("uji.boss", ["manajer"])).id
    s1 = (await mk("uji.satu", ["sdm_khusus"])).id
    s2 = (await mk("uji.dua", ["sdm_strategi"])).id
  })

  it("tugas untuk dua staf muncul di managerTasksFor keduanya", async () => {
    const { id } = await mut.createManagerTask(boss, input())
    for (const u of [s1, s2]) {
      const r = await qry.managerTasksFor(u, "2026-12-03")
      expect(r).toEqual([
        { id, title: "Rapat vendor", startDate: "2026-12-02", endDate: "2026-12-04" },
      ])
    }
    expect(await qry.managerTasksFor(s1, "2026-12-01")).toEqual([])
  })

  it("update mengganti penerima; yang dikeluarkan tidak lagi mendapatnya", async () => {
    const { id } = await mut.createManagerTask(boss, input())
    await mut.updateManagerTask(id, input({ assigneeIds: [s2], title: "Baru" }))
    expect(await qry.managerTasksFor(s1, "2026-12-03")).toEqual([])
    expect((await qry.managerTasksFor(s2, "2026-12-03"))[0]?.title).toBe("Baru")
  })

  it("push §10.2: buat dan ubah → penerima tugas, kecuali manajer pelaku", async () => {
    vi.mocked(notify).mockClear()
    const { id } = await mut.createManagerTask(boss, input())
    await mut.updateManagerTask(id, input({ assigneeIds: [s2] }), boss)
    expect(pushed()).toEqual([
      { userIds: [s1, s2], except: boss, title: "Tugas baru dari Manajer" },
      { userIds: [s2], except: boss, title: "Tugas dari Manajer berubah" },
    ])
  })

  it("menolak penerima Direktur atau akun nonaktif", async () => {
    const dir = (await mk("uji.dir", ["direktur"])).id
    await expect(
      mut.createManagerTask(boss, input({ assigneeIds: [dir] }))
    ).rejects.toThrow("Staf tidak valid")
    await dbm.db
      .update(tables.user)
      .set({ disabledAt: new Date() })
      .where(orm.eq(tables.user.id, s2))
    await expect(
      mut.createManagerTask(boss, input({ assigneeIds: [s2] }))
    ).rejects.toThrow("Staf tidak valid")
  })

  it("menolak selesai sebelum mulai dan tanpa penerima", async () => {
    await expect(
      mut.createManagerTask(boss, input({ endDate: "2026-12-01" }))
    ).rejects.toThrow("Tanggal selesai harus setelah tanggal mulai")
    await expect(
      mut.createManagerTask(boss, input({ assigneeIds: [] }))
    ).rejects.toThrow("Pilih minimal satu staf")
  })

  it("menolak tanggal yang bukan tanggal kalender", async () => {
    await expect(
      mut.createManagerTask(boss, input({ startDate: "2026-13-45" }))
    ).rejects.toThrow("Tanggal tidak valid")
    await expect(
      mut.createManagerTask(boss, input({ endDate: "2026-02-30" }))
    ).rejects.toThrow("Tanggal tidak valid")
  })

  it("hapus menghilangkan tugas dari managerTasksFor", async () => {
    const { id } = await mut.createManagerTask(boss, input())
    await mut.deleteManagerTask(id, boss)
    expect(await qry.managerTasksFor(s1, "2026-12-03")).toEqual([])
    expect(await qry.getManagerTask(id)).toBeNull()
  })

  it("done true setelah ada jawaban T untuk manajer:<id>", async () => {
    const { id } = await mut.createManagerTask(boss, input())
    await dbm.db.insert(tables.dailyReportAnswer).values({
      userId: s1,
      date: "2026-12-03",
      taskKey: `manajer:${id}`,
      status: "T",
    })
    const row = (await qry.listManagerTasks())[0]
    expect(row?.assignees.find((a) => a.id === s1)?.done).toBe(true)
    expect(row?.assignees.find((a) => a.id === s2)?.done).toBe(false)
    expect((await qry.getManagerTask(id))?.title).toBe("Rapat vendor")
  })
})
