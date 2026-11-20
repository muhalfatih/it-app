// Tes integrasi data alat (dilewati bila DATABASE_URL bukan *_test).
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// guarded() memanggil revalidatePath, yang butuh konteks request Next.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }))

const TEST_DB = /\/[^/?]+_test(\?|$)/.test(process.env.DATABASE_URL ?? "")

describe.skipIf(!TEST_DB)("data alat (database uji)", () => {
  let dbm: typeof import("@workspace/db/client")
  let orm: typeof import("@workspace/db/orm")
  let tables: typeof import("@workspace/db/schema")
  let accounts: typeof import("@workspace/auth/accounts")
  let q: typeof import("./queries")
  let m: typeof import("./mutations")

  let uid = ""
  let unitId = 0

  beforeAll(async () => {
    dbm = await import("@workspace/db/client")
    orm = await import("@workspace/db/orm")
    tables = await import("@workspace/db/schema")
    accounts = await import("@workspace/auth/accounts")
    q = await import("./queries")
    m = await import("./mutations")
  })

  beforeEach(async () => {
    await dbm.db.execute(
      orm.sql`truncate table "user", unit, equipment, loan, loan_item cascade`
    )
    uid = (
      await accounts.createAccount({
        username: "uji.manajer",
        name: "Manajer",
        roles: [],
        bidang: [],
        unitId: null,
        password: "Rahasia-Uji-1",
        mustChangePassword: false,
      })
    ).id
    unitId = (
      await dbm.db.insert(tables.unit).values({ name: "Unit A" }).returning()
    )[0]!.id
  })

  async function addEquipment(total = 5, name = "Kamera", brand = "Sony") {
    const r = await m.createEquipment({ name, brand, total })
    if (!("ok" in r)) throw new Error(r.error)
    return r.data!
  }

  /** Peminjaman disisipkan langsung (createLoan baru ada di Task 4). */
  async function addLoan(
    equipmentId: number,
    qty: number,
    ret?: { problemQty: number; problemNote: string | null }
  ) {
    const [l] = await dbm.db
      .insert(tables.loan)
      .values({
        borrowerName: "Budi",
        unitId,
        startedAt: new Date("2026-11-10T03:00:00Z"),
        dueAt: new Date("2026-11-11T03:00:00Z"),
        recordedBy: uid,
        ...(ret && { returnedAt: new Date("2026-11-11T02:00:00Z"), returnedBy: uid }),
      })
      .returning()
    await dbm.db
      .insert(tables.loanItem)
      .values({ loanId: l!.id, equipmentId, qty, ...ret })
    return l!.id
  }

  const row = async (id: number) =>
    (await q.listEquipment()).find((r) => r.id === id)!

  it("nama+merek ganda (beda huruf) ditolak; merek beda boleh", async () => {
    await addEquipment(5, "Kamera", "Sony")
    expect(await m.createEquipment({ name: "kamera", brand: "SONY", total: 1 })).toEqual({
      error: "Nama itu sudah ada",
    })
    expect(await m.createEquipment({ name: "Kamera", brand: "Canon", total: 1 })).toMatchObject({
      ok: true,
    })
    expect((await q.listEquipment()).map((r) => r.brand)).toEqual(["Canon", "Sony"])
  })

  it("listEquipment menghitung dipinjam dan tersedia", async () => {
    const id = await addEquipment(5)
    await addLoan(id, 2)
    expect(await row(id)).toMatchObject({
      name: "Kamera",
      brand: "Sony",
      active: true,
      total: 5,
      onLoan: 2,
      unresolved: 0,
      available: 3,
    })
  })

  it("total tidak boleh di bawah yang dipinjam atau bermasalah", async () => {
    const id = await addEquipment(5)
    await addLoan(id, 2)
    expect(await m.updateEquipment(id, { name: "Kamera", brand: "Sony", total: 1 })).toEqual({
      error: "Jumlah tidak boleh kurang dari 2 yang sedang dipinjam atau bermasalah",
    })
    expect((await row(id)).total).toBe(5)
    expect(await m.updateEquipment(id, { name: "Kamera", brand: "Sony", total: 2 })).toEqual({
      ok: true,
    })
    expect(await row(id)).toMatchObject({ total: 2, available: 0 })
  })

  it("baris bermasalah juga menahan penurunan total", async () => {
    const id = await addEquipment(5)
    await addLoan(id, 3, { problemQty: 2, problemNote: "Lensa retak" })
    expect(await m.updateEquipment(id, { name: "Kamera", brand: "Sony", total: 1 })).toEqual({
      error: "Jumlah tidak boleh kurang dari 2 yang sedang dipinjam atau bermasalah",
    })
  })

  it("hapus alat berriwayat ditolak; tanpa riwayat terhapus", async () => {
    const used = await addEquipment(5)
    const fresh = await addEquipment(1, "Tripod", "Manfrotto")
    await addLoan(used, 1)
    expect(await m.deleteEquipment(used)).toEqual({
      error: "Alat ini punya riwayat peminjaman. Nonaktifkan saja agar riwayat tetap terbaca.",
    })
    expect(await m.deleteEquipment(fresh)).toEqual({ ok: true })
    expect((await q.listEquipment()).map((r) => r.id)).toEqual([used])
  })

  it("resolveProblem memulihkan stok sekali saja", async () => {
    const id = await addEquipment(5)
    const loanId = await addLoan(id, 3, { problemQty: 2, problemNote: "Lensa retak" })
    expect(await row(id)).toMatchObject({ unresolved: 2, available: 3 })
    expect(await q.listOpenProblems()).toEqual([
      {
        loanId,
        equipmentId: id,
        equipmentName: "Kamera",
        problemQty: 2,
        problemNote: "Lensa retak",
        returnedAt: new Date("2026-11-11T02:00:00Z"),
        borrowerName: "Budi",
      },
    ])
    expect(await m.resolveProblem(loanId, id, uid)).toEqual({ ok: true })
    expect(await row(id)).toMatchObject({ unresolved: 0, available: 5 })
    expect(await q.listOpenProblems()).toEqual([])
    expect(await m.resolveProblem(loanId, id, uid)).toEqual({ error: "Alat sudah dipulihkan" })
  })

  it("resolveProblem atas baris tanpa masalah ditolak", async () => {
    const id = await addEquipment(5)
    const loanId = await addLoan(id, 1, { problemQty: 0, problemNote: null })
    expect(await m.resolveProblem(loanId, id, uid)).toEqual({ error: "Alat sudah dipulihkan" })
  })

  it("nonaktif tetap terbaca", async () => {
    const id = await addEquipment(5)
    expect(await m.setEquipmentActive(id, false)).toEqual({ ok: true })
    expect((await row(id)).active).toBe(false)
  })
})
