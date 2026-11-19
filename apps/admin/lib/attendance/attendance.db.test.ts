// Tes integrasi absensi, hari libur, dan daftar staf pelapor terhadap database KHUSUS uji.
// Dilewati bila nama database tidak berakhiran _test, karena tes mengosongkan tabel.
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import type { Role } from "@workspace/db/schema/roles"

const TEST_DB = /\/[^/?]+_test(\?|$)/.test(process.env.DATABASE_URL ?? "")

describe.skipIf(!TEST_DB)("absensi (database uji)", () => {
  let dbm: typeof import("@workspace/db/client")
  let orm: typeof import("@workspace/db/orm")
  let tables: typeof import("@workspace/db/schema")
  let accounts: typeof import("@workspace/auth/accounts")
  let mut: typeof import("./mutations")
  let qry: typeof import("./queries")
  let reporters: typeof import("../report/queries")

  beforeAll(async () => {
    dbm = await import("@workspace/db/client")
    orm = await import("@workspace/db/orm")
    tables = await import("@workspace/db/schema")
    accounts = await import("@workspace/auth/accounts")
    mut = await import("./mutations")
    qry = await import("./queries")
    reporters = await import("../report/queries")
  })

  let boss = ""
  let s1 = ""
  let dir = ""

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
    await dbm.db.execute(orm.sql`truncate table "user", holiday cascade`)
    boss = (await mk("uji.boss", ["manajer"])).id
    s1 = (await mk("uji.satu", ["sdm_khusus"])).id
    dir = (await mk("uji.dir", ["direktur"])).id
  })

  const MON = "2026-11-16"
  const SUN = "2026-11-15"

  it("setAttendance dua kali menyisakan satu baris berstatus terakhir", async () => {
    await mut.setAttendance(boss, s1, MON, "sakit")
    await mut.setAttendance(boss, s1, MON, "hadir")
    const rows = await dbm.db.select().from(tables.attendance)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe("hadir")
    expect((await qry.attendanceFor(MON)).get(s1)).toBe("hadir")
  })

  it("menolak besok, Minggu, hari libur, dan bukan staf pelapor", async () => {
    const tomorrow = new Date(Date.now() + 2 * 86_400_000)
      .toISOString()
      .slice(0, 10)
    await expect(mut.setAttendance(boss, s1, tomorrow, "izin")).rejects.toThrow()
    await expect(mut.setAttendance(boss, s1, SUN, "izin")).rejects.toThrow()
    await mut.addHoliday("2026-11-17", "Libur uji")
    await expect(
      mut.setAttendance(boss, s1, "2026-11-17", "izin")
    ).rejects.toThrow()
    await expect(mut.setAttendance(boss, dir, MON, "izin")).rejects.toThrow()
    expect(await dbm.db.select().from(tables.attendance)).toHaveLength(0)
  })

  it("hari libur ganda ditolak dengan pesan jelas; hapus berfungsi", async () => {
    await mut.addHoliday("2026-11-18", "Libur A")
    await expect(mut.addHoliday("2026-11-18", "Libur B")).rejects.toThrow(
      "Tanggal sudah ditandai libur"
    )
    expect(await qry.listHolidays("2026-11-01", "2026-11-30")).toEqual([
      { date: "2026-11-18", name: "Libur A" },
    ])
    expect(await qry.holidaySet("2026-11-01", "2026-11-30")).toEqual(
      new Set(["2026-11-18"])
    )
    await mut.deleteHoliday("2026-11-18")
    expect(await qry.listHolidays()).toEqual([])
  })

  it("attendanceOf mengembalikan peta tanggal → status dalam rentang", async () => {
    await mut.setAttendance(boss, s1, MON, "izin")
    const m = await qry.attendanceOf(s1, "2026-11-01", "2026-11-30")
    expect(m.get(MON)).toBe("izin")
  })

  it("listReporters tanpa Direktur, Staf Unit Lain, dan akun nonaktif", async () => {
    await mk("uji.lain", [])
    const off = await mk("uji.off", ["sdm_strategi"])
    await dbm.db
      .update(tables.user)
      .set({ disabledAt: new Date() })
      .where(orm.eq(tables.user.id, off.id))
    const list = await reporters.listReporters()
    expect(list.map((r) => r.name).sort()).toEqual(["uji.boss", "uji.satu"])
  })
})
