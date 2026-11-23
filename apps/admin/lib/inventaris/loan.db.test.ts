// Tes integrasi peminjaman & pengembalian (dilewati bila DATABASE_URL bukan *_test).
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

// guarded() memanggil revalidatePath, yang butuh konteks request Next.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }))

const TEST_DB = /\/[^/?]+_test(\?|$)/.test(process.env.DATABASE_URL ?? "")

const HOUR = 3_600_000
const ago = (h: number) => new Date(Date.now() - h * HOUR)

describe.skipIf(!TEST_DB)("peminjaman alat (database uji)", () => {
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
        username: "uji.staf",
        name: "Staf Uji",
        roles: [],
        bidang: [],
        unitId: null,
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

  const loanInput = (
    items: { equipmentId: number; qty: number }[],
    over: Record<string, unknown> = {}
  ) => ({
    borrowerName: "Budi",
    unitId,
    waNumber: "",
    startedAt: ago(2),
    dueAt: new Date(Date.now() + 24 * HOUR),
    items,
    ...over,
  })

  async function borrow(items: { equipmentId: number; qty: number }[], over = {}) {
    const r = await m.createLoan(loanInput(items, over), uid)
    if (!("ok" in r)) throw new Error(r.error)
    return r.data!
  }

  const row = async (id: number) => (await q.listEquipment()).find((r) => r.id === id)!
  const loanCount = async () => (await dbm.db.select().from(tables.loan)).length
  const returnedAt = async (id: number) =>
    (await dbm.db.select().from(tables.loan).where(orm.eq(tables.loan.id, id)))[0]!.returnedAt

  it("createLoan menyimpan transaksi dan mengurangi stok", async () => {
    const cam = await addEquipment(5)
    const tri = await addEquipment(2, "Tripod", "Manfrotto")
    const id = await borrow([
      { equipmentId: tri, qty: 1 },
      { equipmentId: cam, qty: 2 },
    ])
    expect(await row(cam)).toMatchObject({ onLoan: 2, available: 3 })
    expect(await row(tri)).toMatchObject({ onLoan: 1, available: 1 })
    expect(await q.getLoan(id)).toMatchObject({
      id,
      borrowerName: "Budi",
      unitName: "Unit A",
      itemsLabel: "Kamera ×2, Tripod ×1",
      status: "dipinjam",
      waNumber: null,
      recordedByName: "Staf Uji",
      returnedByName: null,
      returnedAt: null,
      items: [
        { equipmentId: cam, equipmentName: "Kamera", brand: "Sony", qty: 2, problemQty: 0 },
        { equipmentId: tri, equipmentName: "Tripod", brand: "Manfrotto", qty: 1, problemQty: 0 },
      ],
    })
    expect(await q.getLoan(id + 999)).toBeNull()
  })

  it("qty melebihi stok ditolak tanpa menulis baris", async () => {
    const cam = await addEquipment(5)
    await borrow([{ equipmentId: cam, qty: 2 }])
    expect(await m.createLoan(loanInput([{ equipmentId: cam, qty: 4 }]), uid)).toEqual({
      error: "Stok Kamera tersedia hanya 3",
    })
    expect(await loanCount()).toBe(1)
  })

  it("dua createLoan bersamaan atas unit terakhir: tepat satu sukses", async () => {
    const cam = await addEquipment(1)
    const results = await Promise.all([
      m.createLoan(loanInput([{ equipmentId: cam, qty: 1 }]), uid),
      m.createLoan(loanInput([{ equipmentId: cam, qty: 1 }]), uid),
    ])
    expect(results.filter((r) => "ok" in r)).toHaveLength(1)
    expect(results.filter((r) => "error" in r)).toEqual([
      { error: "Stok Kamera tersedia hanya 0" },
    ])
    expect(await row(cam)).toMatchObject({ onLoan: 1, available: 0 })
    expect(await loanCount()).toBe(1)
  })

  it("updateEquipment menurunkan total bersamaan dengan createLoan: stok tak pernah negatif", async () => {
    for (let i = 0; i < 10; i++) {
      const cam = await addEquipment(5, `Kamera ${i}`)
      const [up, ln] = await Promise.all([
        m.updateEquipment(cam, {
          name: `Kamera ${i}`,
          brand: "Sony",
          total: 2,
        }),
        m.createLoan(loanInput([{ equipmentId: cam, qty: 4 }]), uid),
      ])
      const e = await row(cam)
      expect(e.available).toBeGreaterThanOrEqual(0)
      // Tepat satu menang: total turun ke 2 (pinjam 4 ditolak) atau pinjam 4 dulu (turun ke 2 ditolak).
      expect([up, ln].filter((r) => "ok" in r)).toHaveLength(1)
      expect(e).toMatchObject(
        "ok" in up
          ? { total: 2, onLoan: 0, available: 2 }
          : { total: 5, onLoan: 4, available: 1 }
      )
    }
  })

  it("updateEquipment menunggu createLoan yang sudah antre: hitungan tidak basi", async () => {
    const cam = await addEquipment(5)
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    let release!: () => void
    const held = new Promise<void>((r) => (release = r))
    let locked!: () => void
    const ready = new Promise<void>((r) => (locked = r))
    // Gerbang: tahan kunci alat agar createLoan lalu updateEquipment sama-sama antre di belakangnya.
    const gate = dbm.db.transaction(async (tx) => {
      await tx.select().from(tables.equipment).where(orm.eq(tables.equipment.id, cam)).for("update")
      locked()
      await held
    })
    await ready
    const ln = m.createLoan(loanInput([{ equipmentId: cam, qty: 4 }]), uid)
    await sleep(300)
    const up = m.updateEquipment(cam, { name: "Kamera", brand: "Sony", total: 2 })
    await sleep(300)
    release()
    await gate
    expect(await ln).toMatchObject({ ok: true })
    expect(await up).toEqual({
      error: "Jumlah tidak boleh kurang dari 4 yang sedang dipinjam atau bermasalah",
    })
    expect(await row(cam)).toMatchObject({ total: 5, onLoan: 4, available: 1 })
  })

  it("createLoan mengunci unit: penonaktifan yang sedang berjalan ditunggu", async () => {
    const cam = await addEquipment(5)
    let release!: () => void
    const held = new Promise<void>((r) => (release = r))
    let locked!: () => void
    const ready = new Promise<void>((r) => (locked = r))
    const deactivate = dbm.db.transaction(async (tx) => {
      await tx.update(tables.unit).set({ active: false })
      locked()
      await held
    })
    await ready
    const pending = m.createLoan(loanInput([{ equipmentId: cam, qty: 1 }]), uid)
    await new Promise((r) => setTimeout(r, 300))
    release()
    await deactivate
    expect(await pending).toEqual({
      error: "Unit tidak ditemukan atau nonaktif",
    })
    expect(await loanCount()).toBe(0)
  })

  it("tab Dikembalikan dibatasi 200 terbaru", async () => {
    const rows = Array.from({ length: 205 }, (_, i) => ({
      borrowerName: `B${i}`,
      unitId,
      startedAt: ago(1000),
      dueAt: ago(900),
      returnedAt: new Date(Date.now() - (1000 - i) * 1000),
      recordedBy: uid,
      returnedBy: uid,
    }))
    await dbm.db.insert(tables.loan).values(rows)
    const list = await q.listLoans("dikembalikan")
    expect(list).toHaveLength(200)
    expect(list[0]!.borrowerName).toBe("B204")
    expect(list[199]!.borrowerName).toBe("B5")
  })


  it("alat atau unit nonaktif ditolak", async () => {
    const cam = await addEquipment(5)
    await m.setEquipmentActive(cam, false)
    expect(await m.createLoan(loanInput([{ equipmentId: cam, qty: 1 }]), uid)).toEqual({
      error: "Kamera sedang nonaktif",
    })
    await m.setEquipmentActive(cam, true)
    await dbm.db.update(tables.unit).set({ active: false })
    expect(await m.createLoan(loanInput([{ equipmentId: cam, qty: 1 }]), uid)).toEqual({
      error: "Unit tidak ditemukan atau nonaktif",
    })
    expect(await loanCount()).toBe(0)
  })

  it("alat tak dikenal ditolak", async () => {
    expect(await m.createLoan(loanInput([{ equipmentId: 999, qty: 1 }]), uid)).toEqual({
      error: "Alat tidak ditemukan",
    })
  })

  it("returnLoan menyimpan pengembalian dan menahan alat bermasalah", async () => {
    const cam = await addEquipment(5)
    const id = await borrow([{ equipmentId: cam, qty: 3 }])
    const at = ago(1)
    expect(
      await m.returnLoan(
        id,
        { returnedAt: at, items: [{ equipmentId: cam, problemQty: 2, problemNote: "Lensa retak" }] },
        uid
      )
    ).toEqual({ ok: true })
    expect(await q.getLoan(id)).toMatchObject({
      returnedAt: at,
      returnedByName: "Staf Uji",
      status: "dikembalikan",
      items: [{ equipmentId: cam, problemQty: 2, problemNote: "Lensa retak", resolvedAt: null }],
    })
    expect(await row(cam)).toMatchObject({ onLoan: 0, unresolved: 2, available: 3 })
  })

  const ret = (cam: number) => ({
    returnedAt: ago(1),
    items: [{ equipmentId: cam, problemQty: 1, problemNote: "Baterai rusak" }],
  })

  it("returnLoan kedua kali ditolak", async () => {
    const cam = await addEquipment(5)
    const id = await borrow([{ equipmentId: cam, qty: 2 }])
    expect(await m.returnLoan(id, ret(cam), uid)).toEqual({ ok: true })
    expect(await m.returnLoan(id, ret(cam), uid)).toEqual({
      error: "Transaksi ini sudah dikembalikan",
    })
    expect(await row(cam)).toMatchObject({ unresolved: 1, available: 4 })
  })

  it("dua returnLoan bersamaan: tepat satu sukses, stok tertahan sekali", async () => {
    const cam = await addEquipment(5)
    const id = await borrow([{ equipmentId: cam, qty: 2 }])
    const results = await Promise.all([
      m.returnLoan(id, ret(cam), uid),
      m.returnLoan(id, ret(cam), uid),
    ])
    expect(results.filter((r) => "ok" in r)).toHaveLength(1)
    expect(results.filter((r) => "error" in r)).toEqual([
      { error: "Transaksi ini sudah dikembalikan" },
    ])
    expect(await row(cam)).toMatchObject({ unresolved: 1, available: 4 })
  })

  it("pengembalian harus memuat persis alat transaksi", async () => {
    const cam = await addEquipment(5)
    const tri = await addEquipment(2, "Tripod", "Manfrotto")
    const other = await addEquipment(2, "Mikrofon", "Rode")
    const id = await borrow([
      { equipmentId: cam, qty: 1 },
      { equipmentId: tri, qty: 1 },
    ])
    const line = (equipmentId: number) => ({ equipmentId, problemQty: 0, problemNote: null })
    const err = { error: "Isi semua alat dalam transaksi ini" }
    expect(await m.returnLoan(id, { returnedAt: ago(1), items: [line(cam)] }, uid)).toEqual(err)
    expect(
      await m.returnLoan(id, { returnedAt: ago(1), items: [line(cam), line(other)] }, uid)
    ).toEqual(err)
    expect(
      await m.returnLoan(id, { returnedAt: ago(1), items: [line(cam), line(tri), line(other)] }, uid)
    ).toEqual(err)
    expect(
      await m.returnLoan(id, { returnedAt: ago(1), items: [line(cam), line(cam)] }, uid)
    ).toEqual(err)
    expect(await returnedAt(id)).toBeNull()
  })

  it("problemQty melebihi qty ditolak", async () => {
    const cam = await addEquipment(5)
    const id = await borrow([{ equipmentId: cam, qty: 2 }])
    expect(
      await m.returnLoan(
        id,
        { returnedAt: ago(1), items: [{ equipmentId: cam, problemQty: 3, problemNote: "Hilang" }] },
        uid
      )
    ).toEqual({ error: "Jumlah bermasalah Kamera maksimal 2" })
    expect(await returnedAt(id)).toBeNull()
  })

  it("returnedAt sebelum startedAt ditolak", async () => {
    const cam = await addEquipment(5)
    const id = await borrow([{ equipmentId: cam, qty: 1 }])
    expect(
      await m.returnLoan(
        id,
        { returnedAt: ago(3), items: [{ equipmentId: cam, problemQty: 0, problemNote: null }] },
        uid
      )
    ).toEqual({ error: "Waktu kembali tidak boleh sebelum waktu pinjam" })
    expect(await returnedAt(id)).toBeNull()
  })

  it("returnLoan atas transaksi tak dikenal ditolak", async () => {
    expect(await m.returnLoan(999, { returnedAt: ago(1), items: [] }, uid)).toEqual({
      error: "Transaksi tidak ditemukan",
    })
  })

  it("check constraint loan_item menolak SQL langsung", async () => {
    const cam = await addEquipment(5)
    const id = await borrow([{ equipmentId: cam, qty: 2 }])
    const where = orm.and(
      orm.eq(tables.loanItem.loanId, id),
      orm.eq(tables.loanItem.equipmentId, cam)
    )
    const set = (v: { problemQty?: number; problemNote?: string | null }) =>
      dbm.db.update(tables.loanItem).set(v).where(where)
    await expect(set({ problemQty: 3, problemNote: "Hilang" })).rejects.toThrow()
    await expect(set({ problemQty: 1, problemNote: null })).rejects.toThrow()
    await expect(set({ problemQty: 0, problemNote: "Catatan" })).rejects.toThrow()
    await expect(
      dbm.db
        .insert(tables.loanItem)
        .values({ loanId: id, equipmentId: await addEquipment(1, "Tripod"), qty: 1, problemQty: 2, problemNote: "x" })
    ).rejects.toThrow()
  })

  it("hapus transaksi lewat SQL mengembalikan stok", async () => {
    const cam = await addEquipment(5)
    const id = await borrow([{ equipmentId: cam, qty: 3 }])
    await dbm.db.delete(tables.loan).where(orm.eq(tables.loan.id, id))
    expect(await dbm.db.select().from(tables.loanItem)).toEqual([])
    expect(await row(cam)).toMatchObject({ onLoan: 0, available: 5 })
  })

  it("listLoans memisah status; Terlambat urut terlama dulu", async () => {
    const cam = await addEquipment(10)
    const late1 = await borrow([{ equipmentId: cam, qty: 1 }], { startedAt: ago(50), dueAt: ago(48) })
    const late2 = await borrow([{ equipmentId: cam, qty: 1 }], { startedAt: ago(30), dueAt: ago(5) })
    const open = await borrow([{ equipmentId: cam, qty: 1 }])
    const done = await borrow([{ equipmentId: cam, qty: 1 }], { startedAt: ago(60), dueAt: ago(55) })
    await m.returnLoan(
      done,
      { returnedAt: ago(1), items: [{ equipmentId: cam, problemQty: 0, problemNote: null }] },
      uid
    )
    // Tersisip setelah late2 tapi jatuh tempo lebih awal: urutan harus menurut dueAt.
    const late0 = await borrow([{ equipmentId: cam, qty: 1 }], { startedAt: ago(80), dueAt: ago(70) })
    const ids = async (s: "dipinjam" | "terlambat" | "dikembalikan") =>
      (await q.listLoans(s)).map((r) => r.id)
    expect(await ids("terlambat")).toEqual([late0, late1, late2])
    expect(await ids("dipinjam")).toEqual([open])
    expect(await ids("dikembalikan")).toEqual([done])
    expect((await q.listLoans("terlambat"))[0]).toMatchObject({
      borrowerName: "Budi",
      unitName: "Unit A",
      itemsLabel: "Kamera ×1",
      status: "terlambat",
      returnedAt: null,
    })
  })

  it("listBorrowOptions hanya unit & alat aktif yang masih tersedia", async () => {
    const cam = await addEquipment(1)
    const tri = await addEquipment(2, "Tripod", "Manfrotto")
    const off = await addEquipment(2, "Mikrofon", "Rode")
    await m.setEquipmentActive(off, false)
    await dbm.db.insert(tables.unit).values({ name: "Unit B", active: false })
    await borrow([{ equipmentId: cam, qty: 1 }])
    expect(await q.listBorrowOptions()).toEqual({
      units: [{ id: unitId, name: "Unit A" }],
      equipment: [{ id: tri, name: "Tripod", brand: "Manfrotto", available: 2 }],
    })
  })
})
