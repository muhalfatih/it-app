// Tes integrasi query & mutasi Planner terhadap database KHUSUS uji.
// Jalankan: DATABASE_URL=postgres://.../itapp_test pnpm --filter admin test
// Dilewati bila nama database tidak berakhiran _test, karena tes mengosongkan tabel.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { permissionsFor } from "@workspace/auth/permissions"
import type { Role } from "@workspace/db/schema/roles"

import { notify } from "@/lib/push/send"

import { inPeriod, resolvePeriod } from "./rules"

vi.mock("@/lib/push/send", () => ({ notify: vi.fn(async () => {}) }))
const pushed = () => vi.mocked(notify).mock.calls.map(([to, m]) => ({ ...to, title: m.title }))

const TEST_DB = /\/[^/?]+_test(\?|$)/.test(process.env.DATABASE_URL ?? "")

describe.skipIf(!TEST_DB)("planner (database uji)", () => {
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

  let admin = ""
  let s1 = ""
  let s2 = ""
  let tt = ""
  let ch1 = 0
  let ch2 = 0

  async function mk(username: string, roles: Role[]) {
    return accounts.createAccount({
      username,
      name: username,
      roles,
      bidang: [],
      unitId: null,
      password: "Rahasia-Uji-1",
      mustChangePassword: false,
    })
  }

  beforeEach(async () => {
    const { db } = dbm
    await db.execute(
      orm.sql`truncate table "user", task_type, channel cascade`
    )
    admin = (await mk("uji.boss", ["manajer"])).id
    s1 = (await mk("uji.satu", ["sdm_khusus"])).id
    s2 = (await mk("uji.dua", ["sdm_khusus"])).id
    const [t] = await db
      .insert(tables.taskType)
      .values({ name: "Editing" })
      .returning()
    tt = String(t!.id)
    const chs = await db
      .insert(tables.channel)
      .values([{ name: "Instagram" }, { name: "YouTube" }])
      .returning()
    ch1 = chs[0]!.id
    ch2 = chs[1]!.id
  })

  const row = (personId: string, start = "2026-11-16", end = "2026-11-17") => ({
    personId,
    taskTypeId: tt,
    start,
    end,
  })
  const input = (patch: Record<string, unknown> = {}) => ({
    name: "Video Profil",
    activityStart: null,
    activityEnd: null,
    publishDate: "2026-11-20",
    assignments: [row(s1)],
    channelIds: [ch1],
    ...patch,
  })
  const count = async (
    t: typeof tables.plannerEntry | typeof tables.contentCard
  ) => (await dbm.db.select({ n: orm.count() }).from(t))[0]!.n

  it("createEntry membuat kartu tahap ide; tanpa kanal ditolak tanpa sisa baris", async () => {
    const { id } = await mut.createEntry(input(), admin)
    const cards = await dbm.db.select().from(tables.contentCard)
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ entryId: id, stage: "ide" })

    await expect(
      mut.createEntry(input({ name: "Lain", channelIds: [] }), admin)
    ).rejects.toThrow()
    expect(await count(tables.plannerEntry)).toBe(1)
  })

  it("updateEntry mempertahankan, menghapus, dan menambah penugasan per id", async () => {
    const { id } = await mut.createEntry(
      input({ assignments: [row(s1), row(s2)] }),
      admin
    )
    const before = (await qry.getEntry(id))!.assignments
    const keep = before.find((a) => a.userId === s1)!
    await mut.updateEntry(
      id, admin,
      input({
        name: "Video Profil 2",
        assignments: [
          { id: String(keep.id), ...row(s1) },
          { id: "x-baru-0", ...row(s2, "2026-11-18", "2026-11-18") },
        ],
      })
    )
    const after = (await qry.getEntry(id))!
    expect(after.name).toBe("Video Profil 2")
    expect(after.assignments).toHaveLength(2)
    expect(after.assignments.map((a) => a.id)).toContain(keep.id)
    const dropped = before.find((a) => a.userId === s2)!
    expect(after.assignments.map((a) => a.id)).not.toContain(dropped.id)
    expect(after.stage).toBe("ide")
  })

  it("push §10.2: create → semua yang ditugaskan; update → hanya baris baru/berubah", async () => {
    vi.mocked(notify).mockClear()
    const { id } = await mut.createEntry(input({ assignments: [row(s1), row(s2)] }), admin)
    const keep = (await qry.getEntry(id))!.assignments.find((a) => a.userId === s1)!
    await mut.updateEntry(
      id, s2,
      input({
        assignments: [
          { id: String(keep.id), ...row(s1) },
          { id: "x-baru-0", ...row(s2, "2026-11-18", "2026-11-18") },
        ],
      })
    )
    const title = "Penugasan Media Planner"
    expect(pushed()).toEqual([
      { userIds: [s1, s2], except: admin, title },
      { userIds: [s2], except: s2, title },
    ])
  })

  it("updateEntry menolak id penugasan milik entri lain", async () => {
    const { id } = await mut.createEntry(input(), admin)
    const other = await mut.createEntry(input({ name: "Lain" }), admin)
    const foreign = (await qry.getEntry(other.id))!.assignments[0]!
    await expect(
      mut.updateEntry(
        id, admin,
        input({ assignments: [{ id: String(foreign.id), ...row(s1) }] })
      )
    ).rejects.toThrow("Penugasan tidak valid")
  })

  it("staf dinonaktifkan: baris lama lolos, baris baru ditolak", async () => {
    const { id } = await mut.createEntry(input(), admin)
    const old = (await qry.getEntry(id))!.assignments[0]!
    await accounts.setDisabled(s1, true)
    await mut.updateEntry(
      id, admin,
      input({
        name: "Diubah",
        assignments: [{ id: String(old.id), ...row(s1) }],
      })
    )
    await expect(
      mut.updateEntry(
        id, admin,
        input({
          assignments: [{ id: String(old.id), ...row(s1) }, row(s1)],
        })
      )
    ).rejects.toThrow("sudah dinonaktifkan")
  })

  it("kanal dinonaktifkan: tetap boleh bila lama, ditolak bila baru", async () => {
    const { id } = await mut.createEntry(input(), admin)
    await dbm.db
      .update(tables.channel)
      .set({ active: false })
      .where(orm.eq(tables.channel.id, ch1))
    await dbm.db
      .update(tables.channel)
      .set({ active: false })
      .where(orm.eq(tables.channel.id, ch2))
    const old = (await qry.getEntry(id))!.assignments[0]!
    const keepRow = { id: String(old.id), ...row(s1) }
    await mut.updateEntry(
      id, admin,
      input({ name: "Sama", assignments: [keepRow], channelIds: [ch1] })
    )
    await expect(
      mut.updateEntry(
        id, admin,
        input({ assignments: [keepRow], channelIds: [ch1, ch2] })
      )
    ).rejects.toThrow("sudah dinonaktifkan")
  })

  it("deleteEntry: tahap bebas oleh strategi, terkunci butuh manajer + nama", async () => {
    const { id } = await mut.createEntry(input(), admin)
    await mut.deleteEntry(id, permissionsFor(["sdm_strategi"]))
    expect(await count(tables.plannerEntry)).toBe(0)
    expect(await count(tables.contentCard)).toBe(0)

    const locked = await mut.createEntry(input({ name: "Terkunci" }), admin)
    await dbm.db
      .update(tables.contentCard)
      .set({ stage: "review" })
      .where(orm.eq(tables.contentCard.entryId, locked.id))
    await expect(
      mut.deleteEntry(locked.id, permissionsFor(["sdm_strategi"]))
    ).rejects.toThrow()
    await expect(
      mut.deleteEntry(locked.id, permissionsFor(["manajer"]))
    ).rejects.toThrow("Ketik nama konten persis untuk menghapus")
    await mut.deleteEntry(locked.id, permissionsFor(["manajer"]), " Terkunci ")
    expect(await count(tables.plannerEntry)).toBe(0)
  })

  it("baris lama staf nonaktif yang diubah (tanggal atau jenis) ditolak", async () => {
    const { id } = await mut.createEntry(input(), admin)
    const old = (await qry.getEntry(id))!.assignments[0]!
    await accounts.setDisabled(s1, true)
    await expect(
      mut.updateEntry(id, admin, input({ assignments: [{ id: String(old.id), ...row(s1, "2026-11-25", "2026-11-26") }] }))
    ).rejects.toThrow("sudah dinonaktifkan")
  })

  it("jenis dinonaktifkan: baris lama tak berubah lolos, baris baru atau berubah ditolak", async () => {
    const { id } = await mut.createEntry(input(), admin)
    const old = (await qry.getEntry(id))!.assignments[0]!
    await dbm.db
      .update(tables.taskType)
      .set({ active: false })
      .where(orm.eq(tables.taskType.id, Number(tt)))
    const keep = { id: String(old.id), ...row(s1) }
    await mut.updateEntry(id, admin, input({ name: "Sama", assignments: [keep] }))
    await expect(
      mut.updateEntry(id, admin, input({ assignments: [keep, row(s2)] }))
    ).rejects.toThrow("Jenis sudah dinonaktifkan")
    await expect(
      mut.updateEntry(id, admin, input({ assignments: [{ ...keep, start: "2026-11-30", end: "2026-11-30" }] }))
    ).rejects.toThrow("Jenis sudah dinonaktifkan")
  })

  it("formulir basi (versi lama) ditolak dan tidak menimpa", async () => {
    const { id } = await mut.createEntry(input(), admin)
    const v1 = (await qry.getEntry(id))!.updatedAt
    await mut.updateEntry(id, admin, input({ name: "Dari A" }), v1)
    await expect(
      mut.updateEntry(id, admin, input({ name: "Dari B" }), v1)
    ).rejects.toThrow("sudah diubah orang lain")
    expect((await qry.getEntry(id))!.name).toBe("Dari A")
    const v2 = (await qry.getEntry(id))!.updatedAt
    await mut.updateEntry(id, admin, input({ name: "Dari B" }), v2)
  })

  it("id jenis atau kanal di luar int4 / bukan angka ditolak oleh skema, bukan 500", async () => {
    await expect(mut.createEntry(input({ assignments: [{ ...row(s1), taskTypeId: "abc" }] }), admin)).rejects.toThrow()
    await expect(mut.createEntry(input({ assignments: [{ ...row(s1), taskTypeId: "99999999999" }] }), admin)).rejects.toThrow()
    await expect(mut.createEntry(input({ channelIds: [99999999999] }), admin)).rejects.toThrow()
  })

  it("updateEntry menolak id penugasan lama yang muncul dua kali", async () => {
    const { id } = await mut.createEntry(input(), admin)
    const old = (await qry.getEntry(id))!.assignments[0]!
    const dup = { id: String(old.id), ...row(s1) }
    await expect(
      mut.updateEntry(id, admin, input({ assignments: [dup, dup] }))
    ).rejects.toThrow("Penugasan tidak valid")
  })

  it("id entri yang bukan bilangan bulat valid → Entri tidak ditemukan", async () => {
    for (const bad of [Number.NaN, 1.5, -1, 0, 2 ** 40]) {
      await expect(mut.updateEntry(bad, admin, input())).rejects.toThrow(
        "Entri tidak ditemukan"
      )
      await expect(
        mut.deleteEntry(bad, permissionsFor(["manajer"]))
      ).rejects.toThrow("Entri tidak ditemukan")
    }
  })

  it("update/delete entri yang tidak ada → Entri tidak ditemukan", async () => {
    await expect(mut.updateEntry(999999, admin, input())).rejects.toThrow(
      "Entri tidak ditemukan"
    )
    await expect(
      mut.deleteEntry(999999, permissionsFor(["manajer"]))
    ).rejects.toThrow("Entri tidak ditemukan")
  })

  it("listEntriesInPeriod sepakat dengan inPeriod", async () => {
    const period = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
    const mkEntry = (name: string, o: Record<string, unknown>) =>
      mut.createEntry(input({ name, ...o }), admin)
    const ids = [
      (
        await mkEntry("A kegiatan", {
          activityStart: "2026-11-18",
          activityEnd: "2026-11-19",
          publishDate: "2026-12-30",
          assignments: [row(s1, "2026-12-01", "2026-12-01")],
        })
      ).id,
      (
        await mkEntry("B penugasan", {
          publishDate: "2026-12-30",
          assignments: [row(s1, "2026-11-13", "2026-11-17")],
        })
      ).id,
      (
        await mkEntry("C tayang minggu", {
          publishDate: "2026-11-22",
          assignments: [row(s1, "2026-10-01", "2026-10-01")],
        })
      ).id,
      (
        await mkEntry("D sebelum", {
          activityStart: "2026-11-01",
          activityEnd: "2026-11-02",
          publishDate: "2026-11-03",
          assignments: [row(s1, "2026-11-01", "2026-11-01")],
        })
      ).id,
      (
        await mkEntry("E sesudah", {
          activityStart: "2026-11-23",
          activityEnd: "2026-11-24",
          publishDate: "2026-11-25",
          assignments: [row(s1, "2026-11-23", "2026-11-23")],
        })
      ).id,
    ]
    const all = await Promise.all(ids.map((i) => qry.getEntry(i)))
    const expected = all
      .filter((e) => e && inPeriod(e, period))
      .map((e) => e!.id)
      .sort()
    const got = (await qry.listEntriesInPeriod(period)).map((e) => e.id).sort()
    expect(got).toEqual(expected)
    expect(got).toEqual([ids[0], ids[1], ids[2]].sort())
  })

  it("listStaff tidak memuat direktur-saja dan akun tanpa peran", async () => {
    await mk("uji.dir", ["direktur"])
    await mk("uji.tanpa", [])
    const names = (await qry.listStaff()).map((s) => s.name)
    expect(names.sort()).toEqual(["uji.boss", "uji.dua", "uji.satu"])
  })
})
