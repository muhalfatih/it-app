// Tes integrasi Pengaduan Internet (dilewati bila DATABASE_URL bukan *_test).
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

import { UserError } from "@/lib/user-error"

const TEST_DB = /\/[^/?]+_test(\?|$)/.test(process.env.DATABASE_URL ?? "")

describe.skipIf(!TEST_DB)("pengaduan internet (database uji)", () => {
  let dbm: typeof import("@workspace/db/client")
  let orm: typeof import("@workspace/db/orm")
  let tables: typeof import("@workspace/db/schema")
  let accounts: typeof import("@workspace/auth/accounts")
  let c: typeof import("./complaints")

  let uid = ""
  let gedung = 0

  beforeAll(async () => {
    dbm = await import("@workspace/db/client")
    orm = await import("@workspace/db/orm")
    tables = await import("@workspace/db/schema")
    accounts = await import("@workspace/auth/accounts")
    c = await import("./complaints")
  })

  const input = (patch: Record<string, unknown> = {}) => ({
    buildingId: gedung,
    room: "R1",
    issue: "a",
    startedAt: new Date("2026-11-10T03:00:00Z"),
    othersAffected: "ya",
    description: null,
    ...patch,
  })

  beforeEach(async () => {
    await dbm.db.execute(
      orm.sql`truncate table "user", building, internet_complaint cascade`
    )
    uid = (
      await accounts.createAccount({
        username: "uji.pelapor",
        name: "Pelapor",
        roles: [],
        bidang: [],
        unitId: null,
      })
    ).id
    gedung = (
      await dbm.db.insert(tables.building).values({ name: "Gedung A" }).returning()
    )[0]!.id
  })

  it("menolak gedung nonaktif", async () => {
    await dbm.db.update(tables.building).set({ active: false })
    await expect(c.createComplaint(uid, input())).rejects.toBeInstanceOf(UserError)
  })

  it("deskripsi kosong disimpan null", async () => {
    await c.createComplaint(uid, input({ description: "   " }))
    const [r] = await dbm.db.select().from(tables.internetComplaint)
    expect(r!.description).toBeNull()
  })

  it("loadComplaintOptions hanya gedung aktif", async () => {
    await dbm.db.insert(tables.building).values({ name: "Gedung B", active: false })
    expect((await c.loadComplaintOptions()).buildings).toEqual([
      { value: String(gedung), label: "Gedung A" },
    ])
  })

  it("complaintMonth memfilter bulan (batas WIB) dan merekap", async () => {
    await c.createComplaint(uid, input({ startedAt: new Date("2026-11-05T03:00:00Z") }))
    await c.createComplaint(uid, input({ startedAt: new Date("2026-11-15T03:00:00Z") }))
    // Disisipkan langsung: tanggalnya melewati batas "tidak di masa depan" skema.
    await dbm.db.insert(tables.internetComplaint).values({
      ...input(),
      startedAt: new Date("2026-11-30T17:30:00Z"),
      reportedBy: uid,
    } as never)
    const nov = await c.complaintMonth("2026-11")
    expect(nov.rows).toHaveLength(2)
    expect(nov.rows[0]!.startedAt > nov.rows[1]!.startedAt).toBe(true)
    expect(nov.rows[0]!.reporterName).toBe("Pelapor")
    expect(nov.summary.buildings).toEqual([{ name: "Gedung A", count: 2 }])
    expect((await c.complaintMonth("2026-12")).rows).toHaveLength(1)
  })
})
