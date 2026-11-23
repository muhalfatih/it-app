// Tes integrasi mutasi Kanban terhadap database KHUSUS uji (pola planner.db.test.ts).
// Jalankan: DATABASE_URL=postgres://.../itapp_test pnpm --filter admin test
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { permissionsFor } from "@workspace/auth/permissions"
import type { Role } from "@workspace/db/schema/roles"
import type { ContentStage } from "@workspace/db/schema/stages"

import { notify } from "@/lib/push/send"

vi.mock("@/lib/push/send", () => ({ notify: vi.fn(async () => {}) }))
const pushed = () => vi.mocked(notify).mock.calls.map(([to, m]) => ({ ...to, title: m.title }))

const TEST_DB = /\/[^/?]+_test(\?|$)/.test(process.env.DATABASE_URL ?? "")

describe.skipIf(!TEST_DB)("kanban (database uji)", () => {
  let dbm: typeof import("@workspace/db/client")
  let orm: typeof import("@workspace/db/orm")
  let t: typeof import("@workspace/db/schema")
  let accounts: typeof import("@workspace/auth/accounts")
  let planner: typeof import("../planner/mutations")
  let mut: typeof import("./mutations")

  beforeAll(async () => {
    dbm = await import("@workspace/db/client")
    orm = await import("@workspace/db/orm")
    t = await import("@workspace/db/schema")
    accounts = await import("@workspace/auth/accounts")
    planner = await import("../planner/mutations")
    mut = await import("./mutations")
  })

  type Actor = { id: string; permissions: ReadonlySet<import("@workspace/auth/permissions").Permission> }
  let M: Actor, S: Actor, D: Actor, K: Actor
  let tt = ""
  let chLink = 0
  let chPlain = 0

  async function mk(username: string, roles: Role[]): Promise<Actor> {
    const { id } = await accounts.createAccount({
      username,
      name: username,
      roles,
      bidang: [],
      unitId: null,
    })
    return { id, permissions: permissionsFor(roles) }
  }

  beforeEach(async () => {
    await dbm.db.execute(
      orm.sql`truncate table "user", task_type, channel cascade`
    )
    M = await mk("uji.manajer", ["manajer"])
    await accounts.transferManager(M.id, { allowUnlinked: true })
    S = await mk("uji.strategi", ["sdm_strategi"])
    D = await mk("uji.direktur", ["direktur"])
    K = await mk("uji.khusus", ["sdm_khusus"])
    const [type] = await dbm.db
      .insert(t.taskType)
      .values({ name: "Editing" })
      .returning()
    tt = String(type!.id)
    const chs = await dbm.db
      .insert(t.channel)
      .values([
        { name: "YouTube", requiresLink: true },
        { name: "WA Grup" },
      ])
      .returning()
    chLink = chs[0]!.id
    chPlain = chs[1]!.id
  })

  /** Entri baru + kartunya, langsung di tahap yang diminta. */
  async function card(stage: ContentStage = "ide", channelIds = [chLink, chPlain]) {
    const { id: entryId } = await planner.createEntry(
      {
        name: "Video Profil",
        activityStart: null,
        activityEnd: null,
        publishDate: "2026-11-20",
        assignments: [{ personId: K.id, taskTypeId: tt, start: "2026-11-16", end: "2026-11-17" }],
        channelIds,
      },
      M.id
    )
    const [c] = await dbm.db
      .update(t.contentCard)
      .set({ stage })
      .where(orm.eq(t.contentCard.entryId, entryId))
      .returning()
    return { cardId: c!.id, entryId }
  }
  const stageOf = async (cardId: number) =>
    (await dbm.db.select().from(t.contentCard).where(orm.eq(t.contentCard.id, cardId)))[0]!.stage
  const events = (cardId: number) =>
    dbm.db
      .select()
      .from(t.contentCardEvent)
      .where(orm.eq(t.contentCardEvent.cardId, cardId))
      .orderBy(t.contentCardEvent.id)

  it("maju ide→draft oleh SDM Strategi mencatat event maju", async () => {
    const { cardId } = await card("ide")
    await mut.moveCard(cardId, "ide", "draft", S)
    expect(await stageOf(cardId)).toBe("draft")
    const ev = await events(cardId)
    expect(ev).toHaveLength(1)
    expect(ev[0]).toMatchObject({ kind: "maju", fromStage: "ide", toStage: "draft", actorId: S.id })
  })

  it("kembali wajib catatan, lalu tercatat", async () => {
    const { cardId } = await card("draft")
    await expect(mut.moveCard(cardId, "draft", "ide", M)).rejects.toThrow("Catatan wajib diisi")
    await expect(mut.moveCard(cardId, "draft", "ide", M, "   ")).rejects.toThrow("Catatan wajib diisi")
    await mut.moveCard(cardId, "draft", "ide", M, "Perbaiki judul")
    const ev = await events(cardId)
    expect(ev.at(-1)).toMatchObject({ kind: "kembali", note: "Perbaiki judul" })
  })

  it("push §10.2: masuk Review → Manajer; dikembalikan → yang ditugaskan; maju lain → tidak ada", async () => {
    const { cardId } = await card("ide")
    vi.mocked(notify).mockClear()
    await mut.moveCard(cardId, "ide", "draft", S)
    await mut.moveCard(cardId, "draft", "review", M)
    await mut.moveCard(cardId, "review", "draft", M, "Perbaiki")
    expect(pushed()).toEqual([
      { roles: ["manajer"], except: M.id, title: "Kartu masuk Review" },
      { userIds: [K.id], except: M.id, title: "Kartu dikembalikan untuk revisi" },
    ])
    await mut.moveCard(cardId, "draft", "review", M)
    vi.mocked(notify).mockClear()
    await mut.moveCard(cardId, "review", "disetujui", D)
    expect(pushed()).toEqual([])
  })

  it("from basi ditolak dengan pesan konkurensi", async () => {
    const { cardId } = await card("draft")
    await expect(mut.moveCard(cardId, "ide", "draft", S)).rejects.toThrow(
      "Kartu sudah dipindah orang lain, muat ulang."
    )
  })

  it("perpindahan tanpa wewenang ditolak di server", async () => {
    const { cardId } = await card("review")
    await expect(mut.moveCard(cardId, "review", "disetujui", K)).rejects.toThrow(
      "Anda tidak berwenang memindahkan kartu ini"
    )
    await expect(mut.moveCard(cardId, "review", "tayang", D)).rejects.toThrow(
      "Anda tidak berwenang memindahkan kartu ini"
    )
  })

  it("kartu tidak ada → Kartu tidak ditemukan", async () => {
    await expect(mut.moveCard(999999, "ide", "draft", M)).rejects.toThrow("Kartu tidak ditemukan")
    await expect(mut.moveCard(Number.NaN, "ide", "draft", M)).rejects.toThrow("Kartu tidak ditemukan")
  })

  it("tahap tujuan kosong atau sembarang ditolak; kartu tayang tidak berubah", async () => {
    const { cardId } = await card("tayang")
    const before = (await dbm.db.select().from(t.contentCard).where(orm.eq(t.contentCard.id, cardId)))[0]!
    for (const bad of [undefined, "x", null]) {
      await expect(mut.moveCard(cardId, "tayang", bad as never, K)).rejects.toThrow()
      await expect(mut.moveCard(cardId, "x" as never, "tayang", K)).rejects.toThrow()
    }
    const after = (await dbm.db.select().from(t.contentCard).where(orm.eq(t.contentCard.id, cardId)))[0]!
    expect(after.stage).toBe("tayang")
    expect(after.stageChangedAt).toEqual(before.stageChangedAt)
    expect(await events(cardId)).toHaveLength(0)
  })

  it("Direktur Disetujui→Review tanpa centang berhasil", async () => {
    const { cardId } = await card("disetujui")
    await mut.moveCard(cardId, "disetujui", "review", D, "Ulang")
    expect(await stageOf(cardId)).toBe("review")
  })

  it("batal centang di disetujui: tahap tetap disetujui", async () => {
    const { cardId } = await card("disetujui")
    await mut.checkChannel(cardId, chPlain, null, K)
    expect(await mut.uncheckChannel(cardId, chPlain, "Keliru", M)).toEqual({ stage: "disetujui" })
    expect(await stageOf(cardId)).toBe("disetujui")
  })

  it("dua centang kanal sama bersamaan: satu berhasil, satu ditolak", async () => {
    const { cardId } = await card("disetujui")
    const r = await Promise.allSettled([
      mut.checkChannel(cardId, chPlain, null, K),
      mut.checkChannel(cardId, chPlain, null, S),
    ])
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1)
    const rej = r.find((x) => x.status === "rejected") as PromiseRejectedResult
    expect(String(rej.reason)).toContain("Kanal sudah dicentang")
  })

  it("dua perpindahan dari tahap sama bersamaan: satu berhasil, satu ditolak", async () => {
    const { cardId } = await card("ide")
    const r = await Promise.allSettled([
      mut.moveCard(cardId, "ide", "draft", S),
      mut.moveCard(cardId, "ide", "draft", M),
    ])
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1)
    const rej = r.find((x) => x.status === "rejected") as PromiseRejectedResult
    expect(String(rej.reason)).toContain("Kartu sudah dipindah orang lain")
    expect(await events(cardId)).toHaveLength(1)
  })

  it("caption terkunci sejak review", async () => {
    const { cardId } = await card("review")
    await expect(mut.saveCaption(cardId, "Teks", K)).rejects.toThrow()
    const { cardId: draft } = await card("draft")
    await mut.saveCaption(draft, "  Teks caption ", K)
    const [row] = await dbm.db.select().from(t.contentCard).where(orm.eq(t.contentCard.id, draft))
    expect(row!.caption).toBe("Teks caption")
  })

  it("centang: wajib link ditolak tanpa URL; semua tercentang → tayang otomatis", async () => {
    const { cardId } = await card("disetujui")
    await expect(mut.checkChannel(cardId, chLink, null, K)).rejects.toThrow("Link postingan wajib diisi")
    expect(await mut.checkChannel(cardId, chPlain, null, K)).toEqual({ stage: "disetujui" })
    expect(await mut.checkChannel(cardId, chLink, "https://youtu.be/x", K)).toEqual({ stage: "tayang" })
    expect(await stageOf(cardId)).toBe("tayang")
    const kinds = (await events(cardId)).map((e) => e.kind)
    expect(kinds).toEqual(["centang", "centang", "otomatis"])
  })

  it("centang dua kali → Kanal sudah dicentang", async () => {
    const { cardId } = await card("disetujui")
    await mut.checkChannel(cardId, chPlain, null, K)
    await expect(mut.checkChannel(cardId, chPlain, null, S)).rejects.toThrow("Kanal sudah dicentang")
  })

  it("kanal bukan milik entri ditolak; kanal nonaktif milik entri tetap boleh", async () => {
    const { cardId } = await card("disetujui", [chPlain])
    await expect(mut.checkChannel(cardId, chLink, "https://x.id", K)).rejects.toThrow("Kanal tidak valid")
    await dbm.db.update(t.channel).set({ active: false }).where(orm.eq(t.channel.id, chPlain))
    expect(await mut.checkChannel(cardId, chPlain, null, K)).toEqual({ stage: "tayang" })
  })

  it("centang di luar tahap disetujui atau oleh direktur ditolak", async () => {
    const { cardId } = await card("review")
    await expect(mut.checkChannel(cardId, chPlain, null, K)).rejects.toThrow()
    const { cardId: ok } = await card("disetujui")
    await expect(mut.checkChannel(ok, chPlain, null, D)).rejects.toThrow()
  })

  it("batal centang di tayang → disetujui, alasan wajib, hanya manajer", async () => {
    const { cardId } = await card("disetujui")
    await mut.checkChannel(cardId, chPlain, null, K)
    await mut.checkChannel(cardId, chLink, "https://youtu.be/x", K)
    await expect(mut.uncheckChannel(cardId, chLink, "   ", M)).rejects.toThrow("Alasan wajib diisi")
    await expect(mut.uncheckChannel(cardId, chLink, "Link keliru", K)).rejects.toThrow()
    expect(await mut.uncheckChannel(cardId, chLink, "Link keliru", M)).toEqual({ stage: "disetujui" })
    const pubs = await dbm.db.select().from(t.contentCardPublication).where(orm.eq(t.contentCardPublication.cardId, cardId))
    expect(pubs.map((p) => p.channelId)).toEqual([chPlain])
    const ev = await events(cardId)
    expect(ev.slice(-2).map((e) => e.kind)).toEqual(["batal_centang", "otomatis"])
    expect(ev.at(-2)).toMatchObject({ note: "Link keliru", channelId: chLink })
    await expect(mut.uncheckChannel(cardId, chLink, "lagi", M)).rejects.toThrow("Kanal belum dicentang")
  })

  it("direktur tidak bisa mengembalikan disetujui→review bila ada centang", async () => {
    const { cardId } = await card("disetujui")
    await mut.checkChannel(cardId, chPlain, null, K)
    await expect(mut.moveCard(cardId, "disetujui", "review", D, "Ulang")).rejects.toThrow(
      "Anda tidak berwenang memindahkan kartu ini"
    )
  })

  it("komentar oleh direktur tersimpan; kosong ditolak", async () => {
    const { cardId } = await card("review")
    await mut.addComment(cardId, "  Bagus  ", D)
    await expect(mut.addComment(cardId, " ", D)).rejects.toThrow("Komentar wajib diisi")
    const rows = await dbm.db.select().from(t.contentCardComment)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ body: "Bagus", authorId: D.id })
  })

  describe("sinkron dari updateEntry Planner (§4.6)", () => {
    const entryInput = (patch: Record<string, unknown>) => ({
      name: "Video Profil",
      activityStart: null,
      activityEnd: null,
      publishDate: "2026-11-20",
      assignments: [{ personId: K.id, taskTypeId: tt, start: "2026-11-16", end: "2026-11-17" }],
      channelIds: [chLink, chPlain],
      ...patch,
    })

    it("buang kanal yang belum dicentang → sisa lengkap → tayang otomatis", async () => {
      const { cardId, entryId } = await card("disetujui")
      await mut.checkChannel(cardId, chPlain, null, K)
      await planner.updateEntry(entryId, M.id, entryInput({ channelIds: [chPlain] }))
      expect(await stageOf(cardId)).toBe("tayang")
      expect((await events(cardId)).at(-1)).toMatchObject({ kind: "otomatis", toStage: "tayang", actorId: M.id })
    })

    it("tambah kanal ke kartu tayang → kembali disetujui", async () => {
      const { cardId, entryId } = await card("disetujui", [chPlain])
      await mut.checkChannel(cardId, chPlain, null, K)
      expect(await stageOf(cardId)).toBe("tayang")
      await planner.updateEntry(entryId, M.id, entryInput({ channelIds: [chPlain, chLink] }))
      expect(await stageOf(cardId)).toBe("disetujui")
      expect((await events(cardId)).at(-1)).toMatchObject({ kind: "otomatis", fromStage: "tayang", toStage: "disetujui" })
    })

    it("ubah nama setelah disetujui mencatat catatan sistem; tahap tetap", async () => {
      const { cardId, entryId } = await card("disetujui")
      await planner.updateEntry(entryId, M.id, entryInput({ name: "Video Profil Baru" }))
      expect(await stageOf(cardId)).toBe("disetujui")
      const last = (await events(cardId)).at(-1)!
      expect(last.kind).toBe("catatan_sistem")
      expect(last.note).toContain("Diubah setelah disetujui")
      expect(last.note).toContain("Video Profil")
      expect(last.note).toContain("Video Profil Baru")
    })

    it("ubah nama di draft tidak mencatat apa pun", async () => {
      const { cardId, entryId } = await card("draft")
      await planner.updateEntry(entryId, M.id, entryInput({ name: "Lain" }))
      expect(await events(cardId)).toHaveLength(0)
    })

    it("kanal tercentang yang dibuang ikut menghapus publikasinya", async () => {
      const { cardId, entryId } = await card("disetujui")
      await mut.checkChannel(cardId, chPlain, null, K)
      await planner.updateEntry(entryId, M.id, entryInput({ channelIds: [chLink] }))
      const pubs = await dbm.db.select().from(t.contentCardPublication).where(orm.eq(t.contentCardPublication.cardId, cardId))
      expect(pubs).toHaveLength(0)
      expect(await stageOf(cardId)).toBe("disetujui")
    })

    it("kanal tercentang yang dibuang tercatat batal_centang dengan link lama", async () => {
      const { cardId, entryId } = await card("disetujui")
      await mut.checkChannel(cardId, chPlain, null, K)
      await mut.checkChannel(cardId, chLink, "https://youtu.be/x", K)
      await planner.updateEntry(entryId, M.id, entryInput({ channelIds: [chLink] }))
      const ev = (await events(cardId)).filter((e) => e.kind === "batal_centang" && e.channelId === chPlain)
      expect(ev).toHaveLength(1)
      expect(ev[0]!.note).toContain("Kanal dihapus di Planner")
      await planner.updateEntry(entryId, M.id, entryInput({ channelIds: [chPlain] }))
      const link = (await events(cardId)).find((e) => e.kind === "batal_centang" && e.channelId === chLink)
      expect(link!.note).toContain("https://youtu.be/x")
    })

    it("buang dan tambah kanal sekaligus pada kartu tayang → disetujui, publikasi terhapus + event", async () => {
      const { cardId, entryId } = await card("disetujui", [chPlain])
      await mut.checkChannel(cardId, chPlain, null, K)
      await planner.updateEntry(entryId, M.id, entryInput({ channelIds: [chLink] }))
      expect(await stageOf(cardId)).toBe("disetujui")
      const pubs = await dbm.db.select().from(t.contentCardPublication).where(orm.eq(t.contentCardPublication.cardId, cardId))
      expect(pubs).toHaveLength(0)
      expect((await events(cardId)).some((e) => e.kind === "batal_centang" && e.channelId === chPlain)).toBe(true)
    })

    it("kartu tayang: buang kanal tercentang, sisa lengkap → tetap tayang", async () => {
      const { cardId, entryId } = await card("disetujui")
      await mut.checkChannel(cardId, chPlain, null, K)
      await mut.checkChannel(cardId, chLink, "https://youtu.be/x", K)
      expect(await stageOf(cardId)).toBe("tayang")
      await planner.updateEntry(entryId, M.id, entryInput({ channelIds: [chLink] }))
      expect(await stageOf(cardId)).toBe("tayang")
    })

    it("kartu review: kanal berubah tidak mengubah tahap dan tanpa event otomatis", async () => {
      const { cardId, entryId } = await card("review")
      await planner.updateEntry(entryId, M.id, entryInput({ channelIds: [chPlain] }))
      expect(await stageOf(cardId)).toBe("review")
      expect(await events(cardId)).toHaveLength(0)
    })
  })

  describe("listBoard", () => {
    it("Telah Tayang > 30 hari disembunyikan kecuali allPublished; tahap lain tetap", async () => {
      const qry = await import("./queries")
      const old = new Date(Date.now() - 31 * 24 * 3600 * 1000)
      const { cardId: tayangLama } = await card("tayang")
      const { cardId: ideLama } = await card("ide")
      const { cardId: tayangBaru } = await card("disetujui", [chPlain])
      await mut.checkChannel(tayangBaru, chPlain, null, K)
      await dbm.db
        .update(t.contentCard)
        .set({ stageChangedAt: old })
        .where(orm.inArray(t.contentCard.id, [tayangLama, ideLama]))

      const ids = (cards: { id: number }[]) => cards.map((c) => c.id).sort()
      expect(ids(await qry.listBoard({ allPublished: false }))).toEqual([ideLama, tayangBaru].sort())
      expect(ids(await qry.listBoard({ allPublished: true }))).toEqual([tayangLama, ideLama, tayangBaru].sort())
    })

    it("membawa kanal, penugasan unik per orang, dan jumlah centang", async () => {
      const qry = await import("./queries")
      const { cardId } = await card("disetujui")
      await mut.checkChannel(cardId, chPlain, null, K)
      const [c] = await qry.listBoard({ allPublished: false })
      expect(c).toMatchObject({ id: cardId, stage: "disetujui", name: "Video Profil", publishedCount: 1 })
      expect(c!.channels.map((x) => x.id).sort()).toEqual([chLink, chPlain].sort())
      expect(c!.assignees).toEqual([{ id: K.id, name: "uji.khusus" }])
    })
  })

  describe("media di kartu", () => {
    const photo = (cardId: number, position: number, key: string) =>
      dbm.db
        .insert(t.contentCardMedia)
        .values({ cardId, createdBy: K.id, position, source: "file", objectKey: key, mediaKind: "image", mime: "image/jpeg", size: 10, originalName: key + ".jpg" })
        .returning()
        .then((r) => r[0]!.id)
    const yt = (cardId: number, position: number) =>
      dbm.db
        .insert(t.contentCardMedia)
        .values({ cardId, createdBy: K.id, position, source: "embed", url: "https://youtu.be/abcdefghijk", provider: "youtube", providerRef: "abcdefghijk" })
        .returning()
        .then((r) => r[0]!.id)

    it("getCard mengembalikan media terurut position", async () => {
      const qry = await import("./queries")
      const { cardId } = await card("ide")
      const b = await photo(cardId, 1, "b")
      const a = await photo(cardId, 0, "a")
      const c = (await qry.getCard(cardId))!
      expect(c.media.map((m) => m.id)).toEqual([a, b])
      expect(c.thumbnailMediaId).toBeNull()
    })

    it("listBoard: thumbnailUrl foto pilihan, ubin YouTube, atau null", async () => {
      const qry = await import("./queries")
      const { cardId: withPhoto } = await card("ide")
      await photo(withPhoto, 0, "a")
      const chosen = await photo(withPhoto, 1, "b")
      await dbm.db.update(t.contentCard).set({ thumbnailMediaId: chosen }).where(orm.eq(t.contentCard.id, withPhoto))
      const { cardId: onlyYt } = await card("ide")
      await yt(onlyYt, 0)
      const { cardId: empty } = await card("ide")

      const by = new Map((await qry.listBoard({ allPublished: false })).map((c) => [c.id, c.thumbnailUrl]))
      expect(by.get(withPhoto)).toBe(`/api/media/${chosen}`)
      expect(by.get(onlyYt)).toBe("https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg")
      expect(by.get(empty)).toBeNull()
    })
  })

  describe("getCard", () => {
    it("null untuk id tidak ada", async () => {
      const qry = await import("./queries")
      expect(await qry.getCard(999999)).toBeNull()
    })

    it("catatan revisi terakhir hanya saat kartu masih di tahap hasil pengembalian", async () => {
      const qry = await import("./queries")
      const { cardId } = await card("draft")
      await mut.moveCard(cardId, "draft", "review", M)
      await mut.moveCard(cardId, "review", "draft", M, "Perbaiki judul")
      const c = (await qry.getCard(cardId))!
      expect(c.lastReturnNote).toBe("Perbaiki judul")
      expect(c.events.map((e) => e.kind)).toEqual(["kembali", "maju"])
      expect(c.events[0]).toMatchObject({ actorName: "uji.manajer", toStage: "draft" })
      await mut.moveCard(cardId, "draft", "review", M)
      expect((await qry.getCard(cardId))!.lastReturnNote).toBeNull()
    })

    it("kanal membawa wajib link dan publikasi; komentar terlama dulu", async () => {
      const qry = await import("./queries")
      const { cardId } = await card("disetujui")
      await mut.checkChannel(cardId, chLink, "https://youtu.be/x", K)
      await mut.addComment(cardId, "Pertama", D)
      await mut.addComment(cardId, "Kedua", K)
      const c = (await qry.getCard(cardId))!
      const yt = c.channels.find((x) => x.id === chLink)!
      expect(yt).toMatchObject({ requiresLink: true, publication: { url: "https://youtu.be/x", checkedByName: "uji.khusus" } })
      expect(c.channels.find((x) => x.id === chPlain)!.publication).toBeNull()
      expect(c.comments.map((x) => x.body)).toEqual(["Pertama", "Kedua"])
      expect(c.assignments[0]).toMatchObject({ personName: "uji.khusus", taskTypeName: "Editing" })
      expect(c.events[0]).toMatchObject({ kind: "centang", channelName: "YouTube" })
    })
  })

  it("hapus entri ikut menghapus event, komentar, publikasi", async () => {
    const { cardId, entryId } = await card("disetujui")
    await mut.checkChannel(cardId, chPlain, null, K)
    await mut.addComment(cardId, "Catatan", K)
    await planner.deleteEntry(entryId, M.permissions, "Video Profil")
    for (const table of [t.contentCardEvent, t.contentCardComment, t.contentCardPublication])
      expect(await dbm.db.select().from(table)).toHaveLength(0)
  })
})
