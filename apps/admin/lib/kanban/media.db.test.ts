// Tes mutasi media terhadap database KHUSUS uji (pola kanban.db.test.ts). Storage dipalsukan dalam memori.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { permissionsFor } from "@workspace/auth/permissions"
import type { Role } from "@workspace/db/schema/roles"
import type { ContentStage } from "@workspace/db/schema/stages"

const enc = (s: string) => new TextEncoder().encode(s)
const cat = (...p: Uint8Array[]) => {
  const out = new Uint8Array(p.reduce((n, x) => n + x.length, 0))
  let o = 0
  for (const x of p) (out.set(x, o), (o += x.length))
  return out
}
const u32 = (n: number) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255])
const box = (type: string, ...kids: Uint8Array[]) => {
  const body = cat(...kids)
  return cat(u32(8 + body.length), enc(type), body)
}
const mp4 = (entry: string) =>
  cat(
    box("ftyp", enc("isom"), u32(0)),
    box(
      "moov",
      box(
        "trak",
        box(
          "mdia",
          box("hdlr", u32(0), u32(0), enc("vide"), new Uint8Array(12)),
          box("minf", box("stbl", box("stsd", u32(0), u32(1), box(entry, new Uint8Array(20)))))
        )
      )
    ),
    box("mdat", new Uint8Array(100))
  )

// Objek palsu: key -> { size, mime, data }
const store = new Map<string, { size: number; mime: string; data: Uint8Array }>()
const removed: string[][] = []
const presigned: { key: string; mime: string; max: number }[] = []
vi.mock("@/lib/storage", () => ({
  presignUpload: vi.fn(async (key: string, mime: string, max: number) => {
    presigned.push({ key, mime, max })
    return { url: "http://minio/up", fields: { key } }
  }),
  statObject: vi.fn(async (key: string) => {
    const o = store.get(key)
    return o ? { size: o.size, mime: o.mime, lastModified: new Date() } : null
  }),
  readRange: vi.fn(async (key: string, offset: number, length: number) =>
    store.get(key)!.data.slice(offset, offset + length)
  ),
  removeObjects: vi.fn(async (keys: string[]) => {
    removed.push(keys)
  }),
}))

const TEST_DB = /\/[^/?]+_test(\?|$)/.test(process.env.DATABASE_URL ?? "")
const MB = 1024 * 1024

describe.skipIf(!TEST_DB)("mutasi media (database uji)", () => {
  let dbm: typeof import("@workspace/db/client")
  let orm: typeof import("@workspace/db/orm")
  let t: typeof import("@workspace/db/schema")
  let accounts: typeof import("@workspace/auth/accounts")
  let planner: typeof import("../planner/mutations")
  let mut: typeof import("./media-mutations")
  let storage: typeof import("@/lib/storage")

  type Actor = { id: string; permissions: ReadonlySet<import("@workspace/auth/permissions").Permission> }
  let M: Actor, K: Actor, V: Actor
  let tt = ""
  let ch = 0

  beforeAll(async () => {
    dbm = await import("@workspace/db/client")
    orm = await import("@workspace/db/orm")
    t = await import("@workspace/db/schema")
    accounts = await import("@workspace/auth/accounts")
    planner = await import("../planner/mutations")
    mut = await import("./media-mutations")
    storage = await import("@/lib/storage")
  })

  async function mk(username: string, roles: Role[]): Promise<Actor> {
    const { id } = await accounts.createAccount({
      username,
      name: username,
      roles,
      bidang: [],
      unitId: null,
      password: "Rahasia-Uji-1",
      mustChangePassword: false,
    })
    return { id, permissions: permissionsFor(roles) }
  }

  beforeEach(async () => {
    store.clear()
    removed.length = 0
    presigned.length = 0
    await dbm.db.execute(orm.sql`truncate table "user", task_type, channel cascade`)
    M = await mk("uji.manajer", ["manajer"])
    K = await mk("uji.khusus", ["sdm_khusus"])
    V = await mk("uji.direktur", ["direktur"]) // tanpa kanban.isi
    const [type] = await dbm.db.insert(t.taskType).values({ name: "Editing" }).returning()
    tt = String(type!.id)
    const [c] = await dbm.db.insert(t.channel).values({ name: "WA Grup" }).returning()
    ch = c!.id
  })

  async function card(stage: ContentStage = "draft") {
    const { id: entryId } = await planner.createEntry(
      {
        name: "Video Profil",
        activityStart: null,
        activityEnd: null,
        publishDate: "2026-11-20",
        assignments: [{ personId: K.id, taskTypeId: tt, start: "2026-11-16", end: "2026-11-17" }],
        channelIds: [ch],
      },
      M.id
    )
    const [c] = await dbm.db
      .update(t.contentCard)
      .set({ stage })
      .where(orm.eq(t.contentCard.entryId, entryId))
      .returning()
    return c!.id
  }
  const setStage = (id: number, stage: ContentStage) =>
    dbm.db.update(t.contentCard).set({ stage }).where(orm.eq(t.contentCard.id, id))
  const rows = (cardId: number) =>
    dbm.db
      .select()
      .from(t.contentCardMedia)
      .where(orm.eq(t.contentCardMedia.cardId, cardId))
      .orderBy(t.contentCardMedia.position)

  const vid = { name: "a.mp4", size: 1000, mime: "video/mp4" }
  /** Unggahan "selesai": startUpload lalu objek muncul di storage. */
  async function uploaded(cardId: number, data: Uint8Array = mp4("avc1"), mime = "video/mp4", file = vid) {
    const { key } = await mut.startUpload(cardId, file, K)
    store.set(key, { size: data.length, mime, data })
    return key
  }
  const photo = async (cardId: number) => {
    const { key } = await mut.startUpload(cardId, { name: "f.jpg", size: 10, mime: "image/jpeg" }, K)
    store.set(key, { size: 10, mime: "image/jpeg", data: new Uint8Array(10) })
    await mut.finishUpload(cardId, key, "f.jpg", K)
    return (await rows(cardId)).at(-1)!
  }

  it("startUpload di Draft: key sesuai pola, maxBytes 500 MB", async () => {
    const id = await card()
    const r = await mut.startUpload(id, vid, K)
    expect(r.key).toMatch(/^cards\/\d+\/[0-9a-f-]{36}\.mp4$/)
    expect(presigned[0]).toMatchObject({ mime: "video/mp4", max: 524288000 })
  })

  it("startUpload menolak 501 MB, .gif, tanpa izin, dan tahap Review", async () => {
    const id = await card()
    await expect(mut.startUpload(id, { ...vid, size: 501 * MB }, K)).rejects.toThrow()
    await expect(mut.startUpload(id, { name: "a.gif", size: 5, mime: "image/gif" }, K)).rejects.toThrow()
    await expect(mut.startUpload(id, vid, V)).rejects.toThrow()
    await setStage(id, "review")
    await expect(mut.startUpload(id, vid, K)).rejects.toThrow()
  })

  it("finishUpload sukses: satu baris file di posisi terakhir", async () => {
    const id = await card()
    const key = await uploaded(id)
    await mut.finishUpload(id, key, "a.mp4", K)
    const r = await rows(id)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ source: "file", objectKey: key, mediaKind: "video", originalName: "a.mp4" })
    await mut.addEmbed(id, "https://vimeo.com/1", K)
    const key2 = await uploaded(id)
    await mut.finishUpload(id, key2, "b.mp4", K)
    expect((await rows(id)).map((x) => x.objectKey)).toEqual([key, null, key2])
  })

  it("finishUpload dua kali untuk key yang sama: keduanya sukses, satu baris, objek tidak dihapus", async () => {
    const id = await card()
    const key = await uploaded(id)
    await mut.finishUpload(id, key, "a.mp4", K)
    await mut.finishUpload(id, key, "a.mp4", K)
    await Promise.all([mut.finishUpload(id, key, "a.mp4", K), mut.finishUpload(id, key, "a.mp4", K)])
    expect(await rows(id)).toHaveLength(1)
    expect(removed).toEqual([])
    expect(store.has(key)).toBe(true)
  })

  it("finish kedua saat readRange melempar: baris tetap, objek tidak dihapus", async () => {
    const id = await card()
    const key = await uploaded(id)
    await mut.finishUpload(id, key, "a.mp4", K)
    const spy = vi.mocked(storage.readRange)
    const orig = spy.getMockImplementation()!
    spy.mockRejectedValue(new Error("minio mati"))
    try {
      await expect(mut.finishUpload(id, key, "a.mp4", K)).resolves.toBeUndefined()
    } finally {
      spy.mockImplementation(orig)
    }
    expect(await rows(id)).toHaveLength(1)
    expect(removed).toEqual([])
  })

  it("finishUpload tanpa kanban.isi: ditolak sebelum storage dibaca", async () => {
    const id = await card()
    const key = await uploaded(id)
    vi.mocked(storage.statObject).mockClear()
    vi.mocked(storage.readRange).mockClear()
    await expect(mut.finishUpload(id, key, "a.mp4", V)).rejects.toThrow()
    expect(storage.statObject).not.toHaveBeenCalled()
    expect(storage.readRange).not.toHaveBeenCalled()
    expect(removed).toEqual([])
  })

  it("readRange melempar pada unggahan baru: galat diteruskan, objek tidak dihapus", async () => {
    const id = await card()
    const key = await uploaded(id)
    vi.mocked(storage.readRange).mockRejectedValueOnce(new Error("minio mati"))
    await expect(mut.finishUpload(id, key, "a.mp4", K)).rejects.toThrow(new Error("minio mati"))
    expect(removed).toEqual([])
    expect(store.has(key)).toBe(true)
    expect(await rows(id)).toHaveLength(0)
  })

  it("kartu pindah ke Review di antara start dan finish: ditolak, objek dihapus", async () => {
    const id = await card()
    const key = await uploaded(id)
    await setStage(id, "review")
    await expect(mut.finishUpload(id, key, "a.mp4", K)).rejects.toThrow("Kartu sudah masuk Review; file tidak disimpan.")
    expect(removed).toEqual([[key]])
    expect(await rows(id)).toHaveLength(0)
  })

  it("finishUpload dengan HEVC: galat HEVC dan objek dihapus", async () => {
    const id = await card()
    const key = await uploaded(id, mp4("hvc1"))
    await expect(mut.finishUpload(id, key, "a.mp4", K)).rejects.toThrow("kodek HEVC")
    expect(removed).toEqual([[key]])
  })

  it("key kartu lain atau `..`: ditolak tanpa menghapus objek itu", async () => {
    const a = await card()
    const b = await card()
    const keyB = await uploaded(b)
    await expect(mut.finishUpload(a, keyB, "x.mp4", K)).rejects.toThrow()
    await expect(mut.finishUpload(a, `cards/${a}/../${b}/x.mp4`, "x.mp4", K)).rejects.toThrow()
    expect(removed).toEqual([])
    expect(store.has(keyB)).toBe(true)
  })

  it("objek belum ada: Unggahan tidak ditemukan", async () => {
    const id = await card()
    const { key } = await mut.startUpload(id, vid, K)
    await expect(mut.finishUpload(id, key, "a.mp4", K)).rejects.toThrow("Unggahan tidak ditemukan, coba lagi.")
  })

  it("item ke-11 ditolak di startUpload, finishUpload, dan addEmbed", async () => {
    const id = await card()
    const pending = await uploaded(id) // diunggah saat masih ada slot
    for (let i = 0; i < 9; i++) await mut.addEmbed(id, `https://vimeo.com/${i}`, K)
    await mut.addEmbed(id, "https://vimeo.com/9", K) // item ke-10
    await expect(mut.startUpload(id, vid, K)).rejects.toThrow()
    await expect(mut.finishUpload(id, pending, "a.mp4", K)).rejects.toThrow()
    await expect(mut.addEmbed(id, "https://vimeo.com/10", K)).rejects.toThrow()
    expect(await rows(id)).toHaveLength(10)
  })

  it("addEmbed YouTube mengisi provider dan providerRef", async () => {
    const id = await card()
    await mut.addEmbed(id, "https://youtu.be/dQw4w9WgXcQ", K)
    expect((await rows(id))[0]).toMatchObject({ source: "embed", provider: "youtube", providerRef: "dQw4w9WgXcQ" })
  })

  it("reorderMedia: id kurang/lebih/kartu lain ditolak; benar menulis posisi 0..n-1", async () => {
    const id = await card()
    const other = await card()
    await mut.addEmbed(id, "https://vimeo.com/1", K)
    await mut.addEmbed(id, "https://vimeo.com/2", K)
    await mut.addEmbed(other, "https://vimeo.com/3", K)
    const [a, b] = await rows(id)
    const [x] = await rows(other)
    await expect(mut.reorderMedia(id, [a!.id], K)).rejects.toThrow()
    await expect(mut.reorderMedia(id, [a!.id, b!.id, x!.id], K)).rejects.toThrow()
    await expect(mut.reorderMedia(id, [a!.id, x!.id], K)).rejects.toThrow()
    await mut.reorderMedia(id, [b!.id, a!.id], K)
    const r = await rows(id)
    expect(r.map((m) => [m.id, m.position])).toEqual([[b!.id, 0], [a!.id, 1]])
  })

  it("setThumbnail: video dan tautan ditolak, foto tersimpan; removeMedia foto itu mengosongkan thumbnail dan menghapus objek setelah commit", async () => {
    const id = await card()
    const key = await uploaded(id)
    await mut.finishUpload(id, key, "a.mp4", K)
    await mut.addEmbed(id, "https://vimeo.com/1", K)
    const [v, link] = await rows(id)
    await expect(mut.setThumbnail(id, v!.id, K)).rejects.toThrow()
    await expect(mut.setThumbnail(id, link!.id, K)).rejects.toThrow()
    const p = await photo(id)
    await mut.setThumbnail(id, p.id, K)
    const thumb = async () =>
      (await dbm.db.select().from(t.contentCard).where(orm.eq(t.contentCard.id, id)))[0]!.thumbnailMediaId
    expect(await thumb()).toBe(p.id)
    removed.length = 0
    await mut.removeMedia(id, p.id, K)
    expect(await thumb()).toBeNull()
    expect(removed).toEqual([[p.objectKey]])
    await mut.setThumbnail(id, null, K)
  })

  it("semua mutasi ditolak di tahap Review", async () => {
    const id = await card()
    await mut.addEmbed(id, "https://vimeo.com/1", K)
    const [m] = await rows(id)
    await setStage(id, "review")
    await expect(mut.addEmbed(id, "https://vimeo.com/2", K)).rejects.toThrow()
    await expect(mut.reorderMedia(id, [m!.id], K)).rejects.toThrow()
    await expect(mut.removeMedia(id, m!.id, K)).rejects.toThrow()
    await expect(mut.setThumbnail(id, null, K)).rejects.toThrow()
    await expect(mut.startUpload(id, vid, K)).rejects.toThrow()
  })
})
