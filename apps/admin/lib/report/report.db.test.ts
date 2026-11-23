// Tes integrasi laporan harian terhadap database KHUSUS uji (dilewati bila bukan *_test).
// Waktu `now` disuntikkan; Kamis 2026-12-03 sebagai "hari ini" kecuali disebut lain.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { permissionsFor } from "@workspace/auth/permissions"
import type { Role } from "@workspace/db/schema/roles"

import { notify } from "@/lib/push/send"

vi.mock("@/lib/push/send", () => ({ notify: vi.fn(async () => {}) }))

const TEST_DB = /\/[^/?]+_test(\?|$)/.test(process.env.DATABASE_URL ?? "")

const NOW = new Date("2026-12-03T05:00:00Z") // Kamis 12.00 WIB
const EARLY = new Date("2026-12-03T02:00:00Z") // Kamis 09.00 WIB, kemarin masih terbuka
const LATE = new Date("2026-12-04T04:00:00Z") // Jumat 11.00 WIB, Rabu-Kamis lewat batas
const D = "2026-12-03"

describe.skipIf(!TEST_DB)("laporan harian (database uji)", () => {
  let dbm: typeof import("@workspace/db/client")
  let orm: typeof import("@workspace/db/orm")
  let tables: typeof import("@workspace/db/schema")
  let accounts: typeof import("@workspace/auth/accounts")
  let mut: typeof import("./mutations")
  let qry: typeof import("./queries")
  let freeze: typeof import("./freeze")
  let planner: typeof import("../planner/mutations")
  let mtask: typeof import("../manager-task/mutations")

  beforeAll(async () => {
    dbm = await import("@workspace/db/client")
    orm = await import("@workspace/db/orm")
    tables = await import("@workspace/db/schema")
    accounts = await import("@workspace/auth/accounts")
    mut = await import("./mutations")
    qry = await import("./queries")
    freeze = await import("./freeze")
    planner = await import("../planner/mutations")
    mtask = await import("../manager-task/mutations")
  })

  let boss = ""
  let s1 = ""
  let s2 = ""
  let tt = ""
  let ch = 0
  let routineId = 0

  async function mk(username: string, roles: Role[]) {
    return accounts.createAccount({
      username,
      name: username,
      roles,
      bidang: [],
      unitId: null,
    })
  }

  beforeEach(async () => {
    await dbm.db.execute(
      orm.sql`truncate table "user", task_type, channel, holiday cascade`
    )
    boss = (await mk("uji.boss", ["manajer"])).id
    s1 = (await mk("uji.satu", ["sdm_khusus"])).id
    s2 = (await mk("uji.dua", ["sdm_khusus"])).id
    // Hari pertama laporan = max(akun dibuat, REPORT_START_DATE): patok ke 1 Des agar tak ikut jam asli.
    await dbm.db.update(tables.user).set({ createdAt: new Date("2026-12-01T00:00:00Z") })
    const [t] = await dbm.db
      .insert(tables.taskType)
      .values({ name: "Editing" })
      .returning()
    tt = String(t!.id)
    const [c] = await dbm.db
      .insert(tables.channel)
      .values({ name: "Instagram" })
      .returning()
    ch = c!.id
    const [r] = await dbm.db
      .insert(tables.routineTask)
      .values({ userId: s1, title: "Cek server", sortOrder: 0 })
      .returning()
    routineId = r!.id
  })

  const plan = async (start: string, end: string, name = "Video Profil") =>
    (
      await planner.createEntry(
        {
          name,
          activityStart: null,
          activityEnd: null,
          publishDate: "2026-12-20",
          assignments: [{ personId: s1, taskTypeId: tt, start, end }],
          channelIds: [ch],
        },
        boss
      )
    ).id
  const plannerKey = async () => {
    const [a] = await dbm.db.select().from(tables.plannerAssignment)
    return `planner:${a!.id}`
  }
  const mgr = (patch: Record<string, unknown> = {}) => ({
    title: "Rapat vendor",
    startDate: D,
    endDate: D,
    assigneeIds: [s1],
    ...patch,
  })
  const answerRows = () => dbm.db.select().from(tables.dailyReportAnswer)

  it("memuat rutin, planner, manajer, sendiri dengan urutan dan judul benar", async () => {
    await plan(D, D)
    const { id: mid } = await mtask.createManagerTask(boss, mgr())
    const { id: sid } = await mut.addSelfTask(s1, D, "Rekap foto", NOW)
    const day = await qry.loadDay(s1, D, NOW)
    expect(day.tasks.map((t) => t.key)).toEqual([
      `rutin:${routineId}`,
      await plannerKey(),
      `manajer:${mid}`,
      `sendiri:${sid}`,
    ])
    expect(day.tasks[1]?.title).toBe("Editing — Video Profil")
    expect(day.state).toBe("terbuka")
    expect(day.editable).toBe(true)
  })

  it("T lalu TL berturut-turut (juga bersamaan) menyisakan satu baris, terakhir menang", async () => {
    const key = `rutin:${routineId}`
    await mut.setAnswer(s1, D, key, "T", NOW)
    await mut.setAnswer(s1, D, key, "TL", NOW)
    expect(await answerRows()).toHaveLength(1)
    expect((await answerRows())[0]?.status).toBe("TL")
    await Promise.all([
      mut.setAnswer(s1, D, key, "T", NOW),
      mut.setAnswer(s1, D, key, "TL", NOW),
    ])
    expect(await answerRows()).toHaveLength(1)
  })

  it("T kemarin pada tugas beberapa hari langsung menghilangkannya dari hari ini", async () => {
    await plan("2026-12-01", "2026-12-04")
    const key = await plannerKey()
    expect((await qry.loadDay(s1, D, EARLY)).tasks.map((t) => t.key)).toContain(key)
    await mut.setAnswer(s1, "2026-12-02", key, "T", EARLY)
    expect((await qry.loadDay(s1, D, EARLY)).tasks.map((t) => t.key)).not.toContain(key)
    expect(
      (await qry.loadDay(s1, "2026-12-02", EARLY)).tasks.map((t) => t.key)
    ).toContain(key)
  })

  it("absensi Sakit menyembunyikan dan menolak ubah; kembali Hadir memulihkan jawaban", async () => {
    const key = `rutin:${routineId}`
    await mut.setAnswer(s1, D, key, "T", NOW)
    await dbm.db
      .insert(tables.attendance)
      .values({ userId: s1, date: D, status: "sakit", updatedBy: boss })
    expect((await qry.loadDay(s1, D, NOW)).state).toBe("disembunyikan")
    await expect(mut.setAnswer(s1, D, key, "TL", NOW)).rejects.toThrow(
      "Hari ini bukan hari laporan"
    )
    await dbm.db
      .update(tables.attendance)
      .set({ status: "hadir" })
      .where(orm.eq(tables.attendance.userId, s1))
    const day = await qry.loadDay(s1, D, NOW)
    expect(day.state).toBe("terbuka")
    expect(day.tasks[0]?.status).toBe("T")
    expect(day.score.done).toBe(1)
  })

  it("menolak tanggal besok, Minggu, sebelum hari pertama laporan, dan kunci asing", async () => {
    const key = `rutin:${routineId}`
    const bad = "Hari ini bukan hari laporan"
    await expect(mut.setAnswer(s1, "2026-12-04", key, "T", NOW)).rejects.toThrow(bad)
    await expect(mut.setAnswer(s1, "2026-12-06", key, "T", new Date("2026-12-08T05:00:00Z"))).rejects.toThrow(bad)
    await expect(mut.setAnswer(s1, "2026-11-30", key, "T", NOW)).rejects.toThrow(bad)
    await expect(mut.saveNotes(s1, "2026-12-04", "x", "y", NOW)).rejects.toThrow(bad)
    await expect(mut.addSelfTask(s1, "2026-12-04", "Tugas", NOW)).rejects.toThrow(bad)
    await expect(mut.submitReport(s1, "2026-12-04", NOW)).rejects.toThrow(bad)
    await expect(mut.setAnswer(s1, D, "rutin:999999", "T", NOW)).rejects.toThrow(
      "Tugas tidak ada di laporan hari ini"
    )
    expect(await answerRows()).toHaveLength(0)
  })

  it("lewat batas: freezeDue membekukan, salinan tidak berubah saat sumber dihapus, ubah ditolak", async () => {
    const eid = await plan(D, D)
    await mut.setAnswer(s1, D, `rutin:${routineId}`, "T", NOW)
    expect(await freeze.freezeDue([s1], LATE)).toBe(3)
    const before = await qry.loadDay(s1, D, LATE)
    expect(before.state).toBe("terkunci")
    await planner.deleteEntry(eid, permissionsFor(["manajer"]))
    const after = await qry.loadDay(s1, D, LATE)
    expect(after.tasks).toEqual(before.tasks)
    expect(after.score).toEqual(before.score)
    await expect(
      mut.setAnswer(s1, D, `rutin:${routineId}`, "TL", LATE)
    ).rejects.toThrow("Laporan sudah terkunci")
    expect(await freeze.freezeDue([s1], LATE)).toBe(0)
  })

  it("hari tanpa jawaban dibekukan dengan skor 0 dari total", async () => {
    await freeze.freezeDue([s1], LATE)
    const day = await qry.loadDay(s1, "2026-12-01", LATE)
    expect(day.state).toBe("terkunci")
    expect(day.score.done).toBe(0)
    expect(day.score.total).toBe(1)
  })

  it("buka kunci → isi → kirim → beku lagi; freezeDue melewati yang dibuka", async () => {
    await freeze.freezeDue([s1], LATE)
    await expect(mut.unlockReport(boss, s1, "2026-12-04")).rejects.toThrow(
      "Laporan belum terkunci"
    )
    vi.mocked(notify).mockClear()
    await mut.unlockReport(boss, s1, D)
    // §10.2: buka kunci → staf pemilik laporan.
    expect(vi.mocked(notify).mock.calls).toEqual([
      [{ userIds: [s1], except: boss }, expect.objectContaining({ title: "Laporan perlu diisi ulang" })],
    ])
    expect(await freeze.freezeDue([s1], LATE)).toBe(0)
    const open = await qry.loadDay(s1, D, LATE)
    expect(open.unlocked).toBe(true)
    expect(open.editable).toBe(true)
    await mut.setAnswer(s1, D, `rutin:${routineId}`, "T", LATE)
    await mut.submitReport(s1, D, LATE)
    const again = await qry.loadDay(s1, D, LATE)
    expect(again.state).toBe("terkunci")
    expect(again.unlocked).toBe(false)
    expect(again.score.done).toBe(1)
  })

  it("judul Tugas dari Manajer berubah setelah kirim → perlu diperbarui; kirim ulang → dikirim", async () => {
    const { id } = await mtask.createManagerTask(boss, mgr())
    await mut.submitReport(s1, D, NOW)
    expect((await qry.loadDay(s1, D, NOW)).state).toBe("dikirim")
    await mtask.updateManagerTask(id, mgr({ title: "Rapat vendor 2" }))
    expect((await qry.loadDay(s1, D, NOW)).state).toBe("perlu_diperbarui")
    await mut.submitReport(s1, D, NOW)
    expect((await qry.loadDay(s1, D, NOW)).state).toBe("dikirim")
  })

  it("tugas sendiri milik orang lain tidak bisa diubah/dihapus; hapus sendiri ikut menghapus jawaban", async () => {
    const { id } = await mut.addSelfTask(s1, D, "Rekap foto", NOW)
    await expect(mut.deleteSelfTask(s2, id, NOW)).rejects.toThrow()
    await expect(mut.renameSelfTask(s2, id, "Curian", NOW)).rejects.toThrow()
    await mut.setAnswer(s1, D, `sendiri:${id}`, "T", NOW)
    await mut.deleteSelfTask(s1, id, NOW)
    expect(await dbm.db.select().from(tables.selfTask)).toHaveLength(0)
    expect(await answerRows()).toHaveLength(0)
  })

  it("loadPeriodDays sama dengan loadDay per hari laporan; melewati libur dan di luar masa laporan", async () => {
    await dbm.db.insert(tables.holiday).values({ date: "2026-12-02", name: "Libur uji" })
    await plan(D, D)
    await mut.setAnswer(s1, D, `rutin:${routineId}`, "T", NOW)
    await freeze.freezeDue([s1], LATE)
    // 30 Nov sebelum hari pertama (akun dibuat 1 Des), 2 Des libur, 5 Des lewat "hari ini" (Jumat 4 Des).
    const days = await qry.loadPeriodDays(s1, "2026-11-30", "2026-12-06", LATE)
    expect(days.map((d) => d.date)).toEqual(["2026-12-01", D, "2026-12-04"])
    for (const d of days) expect(d).toEqual(await qry.loadDay(s1, d.date, LATE))
    expect(await qry.loadPeriodDays(s1, "2026-12-07", "2026-12-13", LATE)).toEqual([])
  })

  it("listTeamDay memuat status dan skor tiap staf pelapor", async () => {
    const rows = await qry.listTeamDay(D, NOW)
    expect(rows.map((r) => r.user.name)).toEqual(["uji.boss", "uji.dua", "uji.satu"])
    const one = rows.find((r) => r.user.id === s1)
    expect(one?.state).toBe("terbuka")
    expect(one?.score.total).toBe(1)
  })
})
