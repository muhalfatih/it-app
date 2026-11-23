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
  async function activeManagers() {
    const rows = await db
      .select({ id: user.id })
      .from(user)
      .innerJoin(userRole, eq(userRole.userId, user.id))
      .where(sql`${userRole.role} = 'manajer' and ${user.disabledAt} is null`)
    return rows.length
  }

  beforeEach(async () => {
    await db.execute(sql`truncate table "user" cascade`)
  })

  it("menonaktifkan akun mencabut sesinya dan menolak login baru", async () => {
    await make("uji.boss", ["manajer"])
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
    await make("uji.boss", ["manajer"])
    const [row] = await accounts.listAccounts()
    expect(row).toMatchObject({ username: "uji.boss", sso: false })
  })

  it("menolak mencabut peran Manajer aktif terakhir", async () => {
    const { id } = await make("uji.boss", ["manajer"])
    await expect(
      accounts.updateAccount(id, { ...base, name: "Boss", roles: [] })
    ).rejects.toThrow("Harus ada minimal satu Manajer aktif")
    await expect(accounts.setDisabled(id, true)).rejects.toThrow(
      "Harus ada minimal satu Manajer aktif"
    )
    expect(await activeManagers()).toBe(1)
  })

  it("dua perubahan serentak tidak bisa menghabiskan Manajer aktif", async () => {
    const a = await make("uji.a", ["manajer"])
    const b = await make("uji.b", ["manajer"])

    const results = await Promise.allSettled([
      accounts.setDisabled(b.id, true),
      accounts.updateAccount(a.id, { ...base, name: "A", roles: [] }),
    ])

    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1)
    expect(await activeManagers()).toBe(1)
  })
})
