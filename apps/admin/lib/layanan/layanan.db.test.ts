// Tes integrasi Pengajuan SDM terhadap database KHUSUS uji (dilewati bila bukan *_test).
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { Role } from "@workspace/db/schema/roles"

import { UserError } from "@/lib/user-error"

const TEST_DB = /\/[^/?]+_test(\?|$)/.test(process.env.DATABASE_URL ?? "")

describe.skipIf(!TEST_DB)("pengajuan SDM (database uji)", () => {
  let dbm: typeof import("@workspace/db/client")
  let orm: typeof import("@workspace/db/orm")
  let tables: typeof import("@workspace/db/schema")
  let accounts: typeof import("@workspace/auth/accounts")
  let perms: typeof import("@workspace/auth/permissions")
  let mut: typeof import("./mutations")
  let qry: typeof import("./queries")

  beforeAll(async () => {
    dbm = await import("@workspace/db/client")
    orm = await import("@workspace/db/orm")
    tables = await import("@workspace/db/schema")
    accounts = await import("@workspace/auth/accounts")
    perms = await import("@workspace/auth/permissions")
    mut = await import("./mutations")
    qry = await import("./queries")
  })

  let boss = ""
  let staf = ""
  let pengaju = ""
  let lain = ""
  let unitId = 0
  let dok = 0
  let edit = 0

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

  const request = (patch: Record<string, unknown> = {}) => ({
    activityName: "Wisuda",
    startDate: "2026-12-02",
    endDate: "2026-12-03",
    unitId,
    waNumber: "0812 3456 789",
    feeAgreed: true,
    needs: [{ taskTypeId: edit }, { taskTypeId: dok }],
    rundownKey: null,
    rundownName: null,
    ...patch,
  })

  const approval = () => ({
    rows: [
      { personId: staf, taskTypeId: dok, start: "2026-12-02", end: "2026-12-03" },
      { personId: staf, taskTypeId: edit, start: "2026-12-04", end: "2026-12-05" },
    ],
    note: "Siap",
  })

  const linkedTasks = (id: number) =>
    dbm.db
      .select()
      .from(tables.managerTask)
      .where(orm.eq(tables.managerTask.serviceRequestId, id))
      .orderBy(tables.managerTask.id)

  const load = async (id: number) =>
    (
      await dbm.db
        .select()
        .from(tables.serviceRequest)
        .where(orm.eq(tables.serviceRequest.id, id))
    )[0]

  beforeEach(async () => {
    await dbm.db.execute(
      orm.sql`truncate table "user", task_type, unit, channel cascade`
    )
    boss = (await mk("uji.boss", ["manajer"])).id
    staf = (await mk("uji.staf", ["sdm_khusus"])).id
    pengaju = (await mk("uji.pengaju", [])).id
    lain = (await mk("uji.lain", [])).id
    unitId = (
      await dbm.db.insert(tables.unit).values({ name: "SD" }).returning()
    )[0]!.id
    const types = await dbm.db
      .insert(tables.taskType)
      .values([{ name: "Dokumentasi" }, { name: "Editing" }])
      .returning()
    dok = types[0]!.id
    edit = types[1]!.id
  })

  it("createRequest menyimpan kebutuhan berurutan", async () => {
    const { id } = await mut.createRequest(pengaju, request())
    const needs = await dbm.db
      .select()
      .from(tables.serviceRequestStaff)
      .where(orm.eq(tables.serviceRequestStaff.requestId, id))
      .orderBy(tables.serviceRequestStaff.position)
    expect(needs.map((n) => n.taskTypeId)).toEqual([edit, dok])
    expect((await load(id))?.waNumber).toBe("08123456789")
  })

  it("createRequest menolak unit atau jenis nonaktif dan rundown", async () => {
    await dbm.db.update(tables.unit).set({ active: false })
    await expect(mut.createRequest(pengaju, request())).rejects.toBeInstanceOf(
      UserError
    )
    await dbm.db.update(tables.unit).set({ active: true })
    await dbm.db
      .update(tables.taskType)
      .set({ active: false })
      .where(orm.eq(tables.taskType.id, dok))
    await expect(mut.createRequest(pengaju, request())).rejects.toBeInstanceOf(
      UserError
    )
    await expect(
      mut.createRequest(
        pengaju,
        request({ needs: [{ taskTypeId: edit }], rundownKey: "requests/x.pdf" })
      )
    ).rejects.toBeInstanceOf(UserError)
  })

  it("approveWithTasks membuat satu tugas tertaut per baris", async () => {
    const { id } = await mut.createRequest(pengaju, request())
    await mut.approveWithTasks(boss, id, approval())
    const tasks = await linkedTasks(id)
    expect(tasks.map((t) => t.title)).toEqual([
      "Dokumentasi · Wisuda",
      "Editing · Wisuda",
    ])
    for (const t of tasks) {
      const people = await dbm.db
        .select()
        .from(tables.managerTaskAssignee)
        .where(orm.eq(tables.managerTaskAssignee.taskId, t.id))
      expect(people.map((p) => p.userId)).toEqual([staf])
      expect(t.createdBy).toBe(boss)
    }
    const row = await load(id)
    expect(row).toMatchObject({
      status: "disetujui",
      followUp: "tugas",
      managerNote: "Siap",
      decidedBy: boss,
    })
    const view = await qry.getRequestFor(
      { id: pengaju, permissions: new Set() },
      id
    )
    expect(view?.taskIds).toEqual(tasks.map((t) => t.id))
    expect(view?.staff).toEqual([
      { name: "uji.staf", label: "Dokumentasi · Wisuda", start: "2026-12-02", end: "2026-12-03" },
      { name: "uji.staf", label: "Editing · Wisuda", start: "2026-12-04", end: "2026-12-05" },
    ])
  })

  it("judul tugas dari nama kegiatan panjang dipotong ke batas judul tugas", async () => {
    const { managerTaskSchema } = await import("@/lib/manager-task/schema")
    const longName = "K".repeat(120)
    const { id } = await mut.createRequest(pengaju, request({ activityName: longName }))
    await mut.approveWithTasks(boss, id, approval())
    for (const t of await linkedTasks(id)) {
      expect(t.title.length).toBeLessThanOrEqual(120)
      expect(t.title.endsWith("…")).toBe(true)
      expect(managerTaskSchema.shape.title.safeParse(t.title).success).toBe(true)
    }
  })

  it("dua persetujuan bersamaan: hanya satu menang", async () => {
    const { id } = await mut.createRequest(pengaju, request())
    const results = await Promise.allSettled([
      mut.approveWithTasks(boss, id, approval()),
      mut.approveWithTasks(boss, id, approval()),
    ])
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    const failed = results.find((r) => r.status === "rejected")
    expect((failed as PromiseRejectedResult).reason.message).toBe(
      "Pengajuan sudah diputuskan"
    )
    expect(await linkedTasks(id)).toHaveLength(2)
    expect(await dbm.db.select().from(tables.managerTask)).toHaveLength(2)
  })

  it("approveWithTasks menolak orang yang bukan staf pelapor", async () => {
    const { id } = await mut.createRequest(pengaju, request())
    const raw = approval()
    raw.rows[0]!.personId = lain
    await expect(mut.approveWithTasks(boss, id, raw)).rejects.toBeInstanceOf(
      UserError
    )
    expect(await dbm.db.select().from(tables.managerTask)).toHaveLength(0)
    expect((await load(id))?.status).toBe("diajukan")
  })

  it("rejectRequest wajib alasan dan hanya sekali", async () => {
    const { id } = await mut.createRequest(pengaju, request())
    await expect(mut.rejectRequest(boss, id, "")).rejects.toBeInstanceOf(
      UserError
    )
    await mut.rejectRequest(boss, id, "Jadwal penuh")
    expect(await load(id)).toMatchObject({
      status: "ditolak",
      managerNote: "Jadwal penuh",
      decidedBy: boss,
    })
    await expect(mut.rejectRequest(boss, id, "Lagi")).rejects.toThrow(
      "Pengajuan sudah diputuskan"
    )
  })

  it("withdrawRequest hanya pemilik dan hanya saat diajukan", async () => {
    const { id } = await mut.createRequest(pengaju, request())
    await expect(mut.withdrawRequest(lain, id)).rejects.toThrow(
      "Pengajuan tidak ditemukan"
    )
    await mut.withdrawRequest(pengaju, id)
    expect(await load(id)).toBeUndefined()

    const second = await mut.createRequest(pengaju, request())
    await mut.approveWithTasks(boss, second.id, approval())
    await expect(mut.withdrawRequest(lain, second.id)).rejects.toThrow(
      "Pengajuan tidak ditemukan"
    )
    await expect(mut.withdrawRequest(pengaju, second.id)).rejects.toThrow(
      "Pengajuan sudah diputuskan"
    )
  })

  it("getRequestFor: pengaju lain null, Manajer dapat data", async () => {
    const { id } = await mut.createRequest(pengaju, request())
    expect(
      await qry.getRequestFor({ id: lain, permissions: new Set() }, id)
    ).toBeNull()
    const view = await qry.getRequestFor(
      { id: boss, permissions: perms.permissionsFor(["manajer"]) },
      id
    )
    expect(view).toMatchObject({
      id,
      activityName: "Wisuda",
      unitName: "SD",
      status: "diajukan",
      followUp: null,
      plannerEntryId: null,
      taskIds: [],
      requestedBy: { id: pengaju, name: "uji.pengaju" },
      rundown: null,
    })
    expect(view?.staff).toEqual([
      { name: null, label: "Editing", start: "2026-12-02", end: "2026-12-03" },
      { name: null, label: "Dokumentasi", start: "2026-12-02", end: "2026-12-03" },
    ])
    expect(await qry.getRequestFor({ id: boss, permissions: new Set() }, 999_999)).toBeNull()
  })

  it("listRequests: diajukan terlama dulu, lainnya terbaru dulu", async () => {
    const a = await mut.createRequest(pengaju, request({ activityName: "Acara A" }))
    const b = await mut.createRequest(lain, request({ activityName: "Acara B" }))
    const c = await mut.createRequest(pengaju, request({ activityName: "Acara C" }))
    const d = await mut.createRequest(pengaju, request({ activityName: "Acara D" }))
    await mut.rejectRequest(boss, a.id, "Tidak bisa")
    await mut.rejectRequest(boss, d.id, "Tidak bisa")
    expect((await qry.listRequests()).map((r) => r.id)).toEqual([
      b.id,
      c.id,
      d.id,
      a.id,
    ])
    expect((await qry.listRequests("ditolak")).map((r) => r.id)).toEqual([d.id, a.id])
    expect((await qry.listMyRequests(lain)).map((r) => r.id)).toEqual([b.id])
  })

  it("cancelRequestTx melepas tugas dan menyimpan snapshot", async () => {
    const { id } = await mut.createRequest(pengaju, request())
    await mut.approveWithTasks(boss, id, approval())
    const tasks = await linkedTasks(id)
    await dbm.db.transaction((tx) =>
      mut.cancelRequestTx(tx, id, "Acara batal", boss)
    )
    expect(await linkedTasks(id)).toHaveLength(0)
    expect(await dbm.db.select().from(tables.managerTask)).toHaveLength(tasks.length)
    const row = await load(id)
    expect(row).toMatchObject({ status: "dibatalkan", managerNote: "Acara batal" })
    expect(row?.cancelledStaff).toEqual([
      { name: "uji.staf", label: "Dokumentasi · Wisuda", start: "2026-12-02", end: "2026-12-03" },
      { name: "uji.staf", label: "Editing · Wisuda", start: "2026-12-04", end: "2026-12-05" },
    ])
  })

  it("check constraint menolak disetujui tanpa tindak lanjut", async () => {
    await expect(
      dbm.db.insert(tables.serviceRequest).values({
        activityName: "X",
        startDate: "2026-12-02",
        endDate: "2026-12-02",
        unitId,
        waNumber: "08123456789",
        feeAgreed: true,
        status: "disetujui",
        followUp: null,
        requestedBy: pengaju,
      })
    ).rejects.toThrow()
  })
})
