// Tes hapus entri + penyapu yatim terhadap database KHUSUS uji (pola kanban.db.test.ts).
// Storage dipalsukan dalam memori.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { permissionsFor } from "@workspace/auth/permissions"

const removed: string[][] = []
let listed: { key: string; lastModified: Date }[] = []
let removeFails = false
vi.mock("@/lib/storage", () => ({
  removeObjects: vi.fn(async (keys: string[]) => {
    if (removeFails) throw new Error("minio mati")
    removed.push(keys)
  }),
  listObjects: async function* () {
    for (const o of listed) yield o
  },
}))

const TEST_DB = /\/[^/?]+_test(\?|$)/.test(process.env.DATABASE_URL ?? "")

describe.skipIf(!TEST_DB)("hapus entri dan penyapu (database uji)", () => {
  let dbm: typeof import("@workspace/db/client")
  let orm: typeof import("@workspace/db/orm")
  let t: typeof import("@workspace/db/schema")
  let accounts: typeof import("@workspace/auth/accounts")
  let planner: typeof import("../planner/mutations")
  let sweep: typeof import("./sweep")
  let userId = ""
  let tt = ""
  let ch = 0

  beforeAll(async () => {
    dbm = await import("@workspace/db/client")
    orm = await import("@workspace/db/orm")
    t = await import("@workspace/db/schema")
    accounts = await import("@workspace/auth/accounts")
    planner = await import("../planner/mutations")
    sweep = await import("./sweep")
  })

  beforeEach(async () => {
    removed.length = 0
    listed = []
    removeFails = false
    await dbm.db.execute(orm.sql`truncate table "user", task_type, channel cascade`)
    ;({ id: userId } = await accounts.createAccount({
      username: "uji.manajer",
      name: "uji.manajer",
      roles: ["manajer"],
      bidang: [],
      unitId: null,
    }))
    await accounts.transferManager(userId, { allowUnlinked: true })
    const [type] = await dbm.db.insert(t.taskType).values({ name: "Editing" }).returning()
    tt = String(type!.id)
    const [c] = await dbm.db.insert(t.channel).values({ name: "WA Grup" }).returning()
    ch = c!.id
  })

  /** Kartu (tahap ide) dengan 2 file + 1 sematan, disisipkan langsung. */
  async function cardWithMedia() {
    const { id: entryId } = await planner.createEntry(
      {
        name: "Video Profil",
        activityStart: null,
        activityEnd: null,
        publishDate: "2026-11-20",
        assignments: [{ personId: userId, taskTypeId: tt, start: "2026-11-16", end: "2026-11-17" }],
        channelIds: [ch],
      },
      userId
    )
    const [c] = await dbm.db
      .select()
      .from(t.contentCard)
      .where(orm.eq(t.contentCard.entryId, entryId))
    await dbm.db.insert(t.contentCardMedia).values([
      { cardId: c!.id, position: 1, source: "file", objectKey: "cards/1/a", mediaKind: "video", mime: "video/mp4", size: 1, originalName: "x.mp4", createdBy: userId },
      { cardId: c!.id, position: 2, source: "file", objectKey: "cards/1/b", mediaKind: "video", mime: "video/mp4", size: 1, originalName: "x.mp4", createdBy: userId },
      { cardId: c!.id, position: 3, source: "embed", url: "https://youtu.be/x", provider: "youtube", createdBy: userId },
    ])
    return entryId
  }

  it("deleteEntry menghapus file kartu satu kali setelah commit", async () => {
    const entryId = await cardWithMedia()
    await planner.deleteEntry(entryId, permissionsFor(["manajer"]))
    expect(removed).toHaveLength(1)
    expect([...removed[0]!].sort()).toEqual(["cards/1/a", "cards/1/b"])
  })

  it("deleteEntry menunggu kunci kartu: file yang disisipkan transaksi lain ikut dihapus", async () => {
    const entryId = await cardWithMedia()
    const [c] = await dbm.db.select().from(t.contentCard).where(orm.eq(t.contentCard.entryId, entryId))
    let done = false
    let del: Promise<void> = Promise.resolve()
    await dbm.db.transaction(async (tx) => {
      await tx.select().from(t.contentCard).where(orm.eq(t.contentCard.id, c!.id)).for("update")
      del = planner.deleteEntry(entryId, permissionsFor(["manajer"])).then(() => void (done = true))
      await new Promise((r) => setTimeout(r, 300))
      expect(done).toBe(false)
      await tx.insert(t.contentCardMedia).values({ cardId: c!.id, position: 9, source: "file", objectKey: "cards/1/baru", mediaKind: "video", mime: "video/mp4", size: 1, originalName: "x.mp4", createdBy: userId })
    })
    await del
    expect(removed).toHaveLength(1)
    expect(removed[0]).toContain("cards/1/baru")
  })

  it("deleteEntry tetap sukses bila removeObjects gagal", async () => {
    const entryId = await cardWithMedia()
    removeFails = true
    const err = vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(
      planner.deleteEntry(entryId, permissionsFor(["manajer"]))
    ).resolves.toBeUndefined()
    expect(err).toHaveBeenCalled()
    err.mockRestore()
    expect(await dbm.db.select().from(t.plannerEntry)).toHaveLength(0)
  })

  it("sweepOrphans menghapus yatim >24 jam, menyisakan yang baru dan yang punya baris", async () => {
    await cardWithMedia()
    const now = new Date("2026-11-18T12:00:00Z")
    const ago = (h: number) => new Date(now.getTime() - h * 3_600_000)
    listed = [
      { key: "cards/9/lama", lastModified: ago(25) },
      { key: "cards/9/baru", lastModified: ago(1) },
      { key: "cards/1/a", lastModified: ago(100) },
    ]
    const res = await sweep.sweepOrphans(now)
    expect(res.removed).toEqual(["cards/9/lama"])
    expect(removed).toEqual([["cards/9/lama"]])
  })
})
