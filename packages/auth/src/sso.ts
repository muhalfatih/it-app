// SSO Simtama ID: OAuth 2.0 Authorization Code + PKCE, token opaque.
// Panduan: https://demo-api-doc.simtama.net/docs/panduan
// Tanpa impor database agar bisa diuji dengan memoryAdapter (sso.test.ts).
import { APIError } from "better-auth/api"
import { genericOAuth, username } from "better-auth/plugins"

import { simtamaUserInfo, usernameSchema } from "./rules"

/** Plugin username dengan aturan yang sama seperti akun lokal (termasuk username berupa email). */
export const usernamePlugin = () =>
  username({
    minUsernameLength: 3,
    maxUsernameLength: 254,
    usernameValidator: (u) => usernameSchema.safeParse(u).success,
  })

export type SsoConfig = {
  issuer: string
  clientId: string
  clientSecret: string
}

export function simtamaOAuth(sso: SsoConfig) {
  return genericOAuth({
    config: [
      {
        providerId: "simtama",
        name: "Simtama ID",
        authorizationUrl: `${sso.issuer}/api/sso/authorize`,
        tokenUrl: `${sso.issuer}/api/sso/token`,
        clientId: sso.clientId,
        clientSecret: sso.clientSecret,
        authentication: "basic",
        pkce: true,
        scopes: ["openid", "profile", "email"],
        // Tanpa `prompt`: pengguna yang masih masuk di Simtama langsung kembali ke aplikasi.
        // Respons token sudah memuat `account`; /userinfo tidak perlu dipanggil.
        getUserInfo: async (tokens) => simtamaUserInfo(tokens.raw?.account),
        // Akun hanya dibuat Manajer (Setting → Akun); pegawai yang belum didaftarkan ditolak.
        disableImplicitSignUp: true,
      },
    ],
  })
}

/**
 * Simtama ID satu-satunya cara masuk: login/ganti kata sandi Better Auth ditutup di server,
 * bukan hanya disembunyikan dari UI. Plugin `username` tetap dipasang untuk kolom username.
 */
export const ssoOnly = {
  emailAndPassword: { enabled: false },
  disabledPaths: [
    "/sign-in/username",
    "/sign-in/email",
    "/sign-up/email",
    "/change-password",
    "/set-password",
    "/request-password-reset",
    "/reset-password",
  ],
}

/**
 * Penolakan akun nonaktif dari hook sesi. Di callback SSO, galat biasa tampil sebagai JSON 403
 * di browser, jadi pengguna diarahkan balik ke /masuk dengan kode galat.
 */
export function accountDisabledError(ctx: { path?: string } | null | undefined) {
  return ctx?.path?.includes("/callback")
    ? new APIError("FOUND", undefined, {
        Location: "/masuk?error=account_disabled",
      })
    : new APIError("FORBIDDEN", { message: "Akun dinonaktifkan" })
}

/** Galat jaringan, timeout, atau 5xx = Simtama ID dianggap gangguan; status lain berarti server hidup. */
export async function simtamaReachable(issuer: string): Promise<boolean> {
  try {
    const res = await fetch(issuer, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    })
    return res.status < 500
  } catch {
    return false
  }
}

/** Login SSO pertama ditautkan ke akun lokal ber-username sama lewat email sintetis; bila tidak ada, akun dibuat. */
export const simtamaAccountLinking = {
  trustedProviders: ["simtama"],
  requireLocalEmailVerified: false,
}
