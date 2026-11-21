// Alur SSO ujung ke ujung dengan konfigurasi asli (sso.ts), memoryAdapter, dan IdP tiruan.
import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"
import { username } from "better-auth/plugins"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { simtamaAccountLinking, simtamaOAuth } from "./sso"

const ISSUER = "https://idp.test"
const BASE = "http://localhost:3000"
type Row = Record<string, unknown>
const db: Record<string, Row[]> = {}

const auth = betterAuth({
  baseURL: BASE,
  secret: "x".repeat(40),
  database: memoryAdapter(db),
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: {
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  account: { accountLinking: simtamaAccountLinking },
  plugins: [
    username(),
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

const userBy = (field: string, value: unknown) =>
  db.user!.find((u) => u[field] === value)

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
    expect(p.get("prompt")).toBe("select_account")
    expect(tokenRequest!.auth).toBe(`Basic ${btoa("itapp:s3cret")}`)
    expect(tokenRequest!.body).toContain("code_verifier=")
  })

  it("menautkan akun lokal ber-username sama, lalu mengenali lewat sub", async () => {
    const ctx = await auth.$context
    // Seperti akun yang dibuat Manajer (accounts.ts).
    const local = await ctx.internalAdapter.createUser(
      {
        email: "budi@akun.lokal",
        name: "budi",
        username: "budi",
        emailVerified: false,
      },
      { method: "admin" }
    )
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

  it("membuat akun tanpa peran untuk pegawai baru", async () => {
    expect(
      (await login({ sub: "2", username: "Siti.R", name: "Siti R" })).location
    ).toBe("/")
    expect(await login({ sub: "2", username: "siti.r" })).toMatchObject({
      location: "/",
    })
    expect(db.user).toHaveLength(1)
    expect(userBy("username", "siti.r")).toMatchObject({
      email: "siti.r@akun.lokal",
      displayUsername: "siti.r",
      name: "Siti R",
      mustChangePassword: false,
    })
  })

  it("menolak username yang tidak lolos aturan akun lokal", async () => {
    const { location } = await login({ sub: "4", username: "bad-name" })
    expect(location).toContain("/masuk?error=")
    expect(db.user).toHaveLength(0)
  })
})
