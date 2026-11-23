// Tes integrasi jalur akun nyata (Drizzle + Better Auth) terhadap database KHUSUS uji.
// Jalankan: DATABASE_URL=postgres://.../itapp_test pnpm --filter @workspace/auth test
// (buat dulu: create database itapp_test; lalu db:migrate dengan URL yang sama).
// Dilewati bila nama database tidak berakhiran _test, karena tes mengosongkan tabel akun.
import { beforeAll, beforeEach, describe, expect, it } from "vitest"

const TEST_DB = /\/[^/?]+_test(\?|$)/.test(process.env.DATABASE_URL ?? "")

describe.skipIf(!TEST_DB)("akun (database uji)", () => {
  // Impor malas: client db melempar bila DATABASE_URL kosong, padahal tes ini dilewati.
  let db: typeof import("@workspace/db/client").db
  let count: typeof import("@workspace/db/orm").count
  let eq: typeof import("@workspace/db/orm").eq
  let sql: typeof import("@workspace/db/orm").sql
  let session: typeof import("@workspace/db/schema").session
  let user: typeof import("@workspace/db/schema").user
  let userRole: typeof import("@workspace/db/schema").userRole
  let auth: typeof import("./server").auth
  let accounts: typeof import("./accounts")

  beforeAll(async () => {
    ;({ db } = await import("@workspace/db/client"))
    ;({ count, eq, sql } = await import("@workspace/db/orm"))
    ;({ session, user, userRole } = await import("@workspace/db/schema"))
    ;({ auth } = await import("./server"))
    accounts = await import("./accounts")
  })

  const base: { bidang: never[]; unitId: null } = { bidang: [], unitId: null }

  async function make(username: string, roles: ("manajer" | "sdm_khusus")[]) {
    return accounts.createAccount({ ...base, username, name: username, roles })
  }
  /** Akun Manajer (lewat transfer, satu-satunya jalan menjadi Manajer). */
  async function boss(username = "uji.boss") {
    const made = await make(username, [])
    await accounts.transferManager(made.id, { allowUnlinked: true })
    return made
  }
  /** Seperti setelah login SSO pertama: akun tertaut ke Simtama. */
  async function link(id: string) {
    await db.execute(
      sql`insert into account (id, account_id, provider_id, user_id, created_at, updated_at)
          values (${`acc-${id}`}, ${`uid-${id}`}, 'simtama', ${id}, now(), now())`
    )
  }
  async function managers() {
    const rows = await db
      .select({ username: user.username })
      .from(user)
      .innerJoin(userRole, eq(userRole.userId, user.id))
      .where(sql`${userRole.role} = 'manajer'`)
    return rows.map((r) => r.username).sort()
  }
  // Sesi dibuat lewat adapter Better Auth (hook sesi ikut jalan), seperti di akhir login SSO.
  const signIn = async (userId: string) =>
    (await auth.$context).internalAdapter.createSession(userId)
  const sessionsOf = async (id: string) =>
    (
      await db
        .select({ n: count() })
        .from(session)
        .where(eq(session.userId, id))
    )[0]!.n

  beforeEach(async () => {
    await db.execute(sql`truncate table "user" cascade`)
  })

  it("menonaktifkan akun mencabut sesinya dan menolak login baru", async () => {
    await boss()
    const { id } = await make("uji.staf", ["sdm_khusus"])
    await signIn(id)
    expect(await sessionsOf(id)).toBe(1)

    await accounts.setDisabled(id, true)

    expect(await sessionsOf(id)).toBe(0)
    await expect(signIn(id)).rejects.toMatchObject({
      message: "Akun dinonaktifkan",
    })
  })

  it("akun manual tanpa kata sandi dan belum tertaut", async () => {
    await make("uji.staf", [])
    const [row] = await accounts.listAccounts()
    expect(row).toMatchObject({ username: "uji.staf", sso: false })
  })

  it("peran Manajer tidak bisa diberikan atau dicabut lewat isian akun", async () => {
    const { id } = await boss()
    const staf = await make("uji.staf", ["manajer", "sdm_khusus"])
    await accounts.updateAccount(id, { ...base, name: "Boss", roles: [] })
    await accounts.updateAccount(staf.id, {
      ...base,
      name: "Staf",
      roles: ["manajer", "sdm_khusus"],
    })
    expect(await managers()).toEqual(["uji.boss"])
  })

  it("Manajer tidak bisa dinonaktifkan", async () => {
    const { id } = await boss()
    await expect(accounts.setDisabled(id, true)).rejects.toThrow(
      "Manajer tidak bisa dinonaktifkan"
    )
  })

  it("transfer memindahkan Manajer, peran lain akun lama tetap", async () => {
    const lama = await make("uji.lama", ["sdm_khusus"])
    await accounts.transferManager(lama.id, { allowUnlinked: true })
    const baru = await make("uji.baru", [])
    await link(baru.id)

    await accounts.transferManager(baru.id)

    expect(await managers()).toEqual(["uji.baru"])
    const rows = await accounts.listAccounts()
    expect(rows.find((r) => r.username === "uji.lama")!.roles).toEqual([
      "sdm_khusus",
    ])
  })

  it("transfer menolak akun nonaktif atau belum pernah masuk", async () => {
    await boss()
    const belum = await make("uji.belum", [])
    await expect(accounts.transferManager(belum.id)).rejects.toThrow(
      "belum pernah masuk"
    )
    const mati = await make("uji.mati", [])
    await link(mati.id)
    await accounts.setDisabled(mati.id, true)
    await expect(accounts.transferManager(mati.id)).rejects.toThrow(
      "Akun nonaktif"
    )
    expect(await managers()).toEqual(["uji.boss"])
  })

  it("dua transfer serentak tetap menyisakan tepat satu Manajer", async () => {
    await boss()
    const a = await make("uji.a", [])
    const b = await make("uji.b", [])
    await link(a.id)
    await link(b.id)

    await Promise.all([
      accounts.transferManager(a.id),
      accounts.transferManager(b.id),
      accounts.updateAccount(a.id, { ...base, name: "A", roles: [] }),
    ])

    expect(await managers()).toHaveLength(1)
  })
})
