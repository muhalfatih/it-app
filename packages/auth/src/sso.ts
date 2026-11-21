// SSO Simtama ID: OAuth 2.0 Authorization Code + PKCE, token opaque.
// Panduan: https://demo-api-doc.simtama.net/docs/panduan
// Tanpa impor database agar bisa diuji dengan memoryAdapter (sso.test.ts).
import { genericOAuth } from "better-auth/plugins"

import { simtamaUserInfo } from "./rules"

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
        prompt: "select_account",
        // Respons token sudah memuat `account`; /userinfo tidak perlu dipanggil.
        getUserInfo: async (tokens) => simtamaUserInfo(tokens.raw?.account),
        // Pegawai yang belum punya akun dibuat otomatis saat login pertama, tanpa peran
        // (= Staf Unit Lain, spesifikasi §3.1). Hanya berlaku saat akun dibuat.
        mapProfileToUser: (profile) => ({
          username: profile.username as string,
          displayUsername: profile.username as string,
        }),
      },
    ],
  })
}

/** Login SSO pertama ditautkan ke akun lokal ber-username sama lewat email sintetis; bila tidak ada, akun dibuat. */
export const simtamaAccountLinking = {
  trustedProviders: ["simtama"],
  requireLocalEmailVerified: false,
}
