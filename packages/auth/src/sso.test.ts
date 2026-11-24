// Alur SSO ujung ke ujung dengan konfigurasi asli (sso.ts), memoryAdapter, dan IdP tiruan.
import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  accountDisabledError,
  simtamaAccountLinking,
  simtamaOAuth,
  ssoOnly,
  usernamePlugin,
} from "./sso"

const ISSUER = "https://idp.test"
const BASE = "http://localhost:3000"
type Row = Record<string, unknown>
const db: Record<string, Row[]> = {}

const auth = betterAuth({
  baseURL: BASE,
  secret: "x".repeat(40),
  database: memoryAdapter(db),
  ...ssoOnly,
  account: { accountLinking: simtamaAccountLinking },
  databaseHooks: {
    // Tiruan hook akun nonaktif di server.ts (yang membaca database asli).
    session: {
      create: {
        before: async (session, ctx) => {
          const u = db.user!.find((r) => r.id === session.userId)
          if (u?.username === "nonaktif") throw accountDisabledError(ctx)
          return { data: session }
        },
      },
    },
  },
  plugins: [
    usernamePlugin(),
    simtamaOAuth({ issuer: ISSUER, clientId: "itapp", clientSecret: "s3cret" }),
  ],
})

let idpAccount: Row = {}
let tokenRequest: { auth: string | null; body: string } | undefined
const realFetch = globalThis.fetch
vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
  if (String(input) !== `${ISSUER}/api/sso/token`) return realFetch(input, init)
  tokenRequest = {
    auth: new Headers(init?.headers).get("authorization"),
    body: String(init?.body),
  }
  return Response.json({
    access_token: "opaque",
    token_type: "Bearer",
    expires_in: 3600,
    account: idpAccount,
  })
})

/** Mulai login SSO, lalu panggil callback seolah IdP mengarahkan balik. */
async function login(account: Row) {
  idpAccount = account
  const start = await auth.handler(
    new Request(`${BASE}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE },
      body: JSON.stringify({
        provider: "simtama",
        callbackURL: "/",
        errorCallbackURL: "/masuk",
      }),
    })
  )
  const authorize = new URL(((await start.json()) as { url: string }).url)
  const cookie = start.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ")
  const state = authorize.searchParams.get("state")
  const callback = await auth.handler(
    new Request(`${BASE}/api/auth/callback/simtama?code=c&state=${state}`, {
      headers: { cookie },
    })
  )
  return { authorize, location: callback.headers.get("location") }
}

/** Akun yang didaftarkan Manajer (accounts.ts): username + email sintetis, belum tertaut. */
async function register(username: string) {
  return (await auth.$context).internalAdapter.createUser(
    {
      email: `${username}@akun.lokal`,
      name: username,
      username,
      emailVerified: false,
    },
    { method: "admin" }
  )
}

describe("SSO Simtama", () => {
  beforeEach(() => {
    for (const t of ["user", "session", "account", "verification"]) db[t] = []
  })

  it("mengirim authorize dan token sesuai panduan", async () => {
    const { authorize } = await login({ sub: "1", username: "budi" })
    const p = authorize.searchParams
    expect(`${authorize.origin}${authorize.pathname}`).toBe(
      `${ISSUER}/api/sso/authorize`
    )
    expect(p.get("client_id")).toBe("itapp")
    expect(p.get("redirect_uri")).toBe(`${BASE}/api/auth/callback/simtama`)
    expect(p.get("scope")).toBe("openid profile email")
    expect(p.get("code_challenge_method")).toBe("S256")
    // Tanpa pemilih akun: sesi Simtama yang masih aktif langsung dipakai.
    expect(p.has("prompt")).toBe(false)
    expect(tokenRequest!.auth).toBe(`Basic ${btoa("itapp:s3cret")}`)
    expect(tokenRequest!.body).toContain("code_verifier=")
  })

  it("menautkan akun lokal ber-username sama, lalu mengenali lewat sub", async () => {
    const local = await register("budi")
    expect((await login({ sub: "1", username: "Budi" })).location).toBe("/")
    // Username Simtama berganti: tetap akun yang sama.
    expect((await login({ sub: "1", username: "budi.baru" })).location).toBe(
      "/"
    )
    expect(db.user).toHaveLength(1)
    expect(db.account!.find((a) => a.providerId === "simtama")).toMatchObject({
      userId: local.id,
      accountId: "1",
    })
  })

  it("menautkan akun lokal yang username-nya berupa email", async () => {
    const local = await (await auth.$context).internalAdapter.createUser(
      {
        email: "budi@sekolah.id",
        name: "Budi",
        username: "budi@sekolah.id",
        emailVerified: false,
      },
      { method: "admin" }
    )
    const { location } = await login({ sub: "8", username: "Budi@Sekolah.id" })
    expect(location).toBe("/")
    expect(db.account!.find((a) => a.providerId === "simtama")).toMatchObject({
      userId: local.id,
      accountId: "8",
    })
  })

  it("username email ber-domain sintetis tidak menyamar sebagai akun lokal", async () => {
    await register("budi")
    const { location } = await login({ sub: "9", username: "budi@akun.lokal" })
    expect(location).toContain("/masuk?error=")
    expect(db.account!.some((a) => a.providerId === "simtama")).toBe(false)
  })

  it("menolak pegawai yang belum didaftarkan Manajer", async () => {
    const { location } = await login({ sub: "2", username: "siti.r" })
    expect(location).toBe("/masuk?error=signup_disabled")
    expect(db.user).toHaveLength(0)
    expect(db.session).toHaveLength(0)
  })

  it("mengenali akun dari direktori yang sudah tertaut lewat uid", async () => {
    // Seperti createSimtamaAccount: akun + baris account simtama, username boleh berbeda.
    const local = await register("siti")
    db.account!.push({
      id: "acc-siti",
      accountId: "7",
      providerId: "simtama",
      userId: local.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect((await login({ sub: "7", username: "siti.r" })).location).toBe("/")
    expect(db.user).toHaveLength(1)
    expect(db.session).toHaveLength(1)
  })

  it("akun nonaktif kembali ke /masuk dengan kode galat", async () => {
    await register("nonaktif")
    const { location } = await login({ sub: "5", username: "nonaktif" })
    expect(location).toBe("/masuk?error=account_disabled")
    expect(db.session).toHaveLength(0)
  })

  it("di luar callback SSO, penolakan akun nonaktif tetap galat 403 biasa", () => {
    expect(accountDisabledError(null)).toMatchObject({
      message: "Akun dinonaktifkan",
    })
  })

  it.each([
    ["/sign-in/username", { username: "budi", password: "rahasia-123" }],
    ["/sign-in/email", { email: "budi@akun.lokal", password: "rahasia-123" }],
    ["/sign-up/email", { email: "x@akun.lokal", password: "rahasia-123", name: "x" }],
    ["/change-password", { currentPassword: "a", newPassword: "rahasia-123" }],
  ])("menutup login kata sandi: %s", async (path, body) => {
    const res = await auth.handler(
      new Request(`${BASE}/api/auth${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: BASE },
        body: JSON.stringify(body),
      })
    )
    expect(res.status).toBe(404)
  })

  it("menolak username yang tidak lolos aturan akun lokal", async () => {
    const { location } = await login({ sub: "4", username: "bad-name" })
    expect(location).toContain("/masuk?error=")
    expect(db.user).toHaveLength(0)
  })
})
