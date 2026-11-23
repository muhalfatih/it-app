import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { username } from "better-auth/plugins"
import { db } from "@workspace/db/client"
import { eq } from "@workspace/db/orm"
import * as schema from "@workspace/db/schema"

import { isUnitStaff } from "./simtama-api"
import {
  accountDisabledError,
  simtamaAccountLinking,
  simtamaOAuth,
  simtamaReachable,
  ssoOnly,
  type SsoConfig,
} from "./sso"

/** Satu-satunya cara masuk; tanpa kredensial klien, halaman masuk menampilkan galat konfigurasi. */
const sso: SsoConfig | undefined =
  process.env.SIMTAMA_ISSUER &&
  process.env.SSO_CLIENT_ID &&
  process.env.SSO_CLIENT_SECRET
    ? {
        issuer: process.env.SIMTAMA_ISSUER,
        clientId: process.env.SSO_CLIENT_ID,
        clientSecret: process.env.SSO_CLIENT_SECRET,
      }
    : undefined
export const ssoEnabled = Boolean(sso)
if (!sso)
  console.error(
    JSON.stringify({
      evt: "sso.not_configured",
      message: "SIMTAMA_ISSUER/SSO_CLIENT_ID/SSO_CLIENT_SECRET kosong: tidak ada yang bisa masuk",
    })
  )

/** Untuk halaman masuk: false bila Simtama ID tidak terjangkau (pesan gangguan, tanpa redirect otomatis). */
export const ssoReachable = () =>
  sso ? simtamaReachable(sso.issuer) : Promise.resolve(false)

/**
 * Akun yang dibuat otomatis saat login SSO pertama: pegawai unit IT & Media di Simtama
 * mendapat peran dasar SDM Khusus; selebihnya tetap Staf Unit Lain. Login berikutnya tidak
 * mengubah peran (diatur Manajer). Galat Simtama tidak boleh menggagalkan login.
 */
async function roleFromSimtamaUnit(u: {
  id: string
  username?: string | null
}) {
  if (!u.username) return
  try {
    if (!(await isUnitStaff(u.username))) return
    await db
      .insert(schema.userRole)
      .values({ userId: u.id, role: "sdm_khusus" })
      .onConflictDoNothing()
  } catch (e) {
    console.warn(
      JSON.stringify({ evt: "simtama.unit_role_failed", message: String(e) })
    )
  }
}

/**
 * Masuk hanya lewat SSO Simtama ID (sso.ts). Inilah satu-satunya tempat yang tahu "dari mana login berasal".
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Profil & username hanya diubah Manajer lewat accounts.ts; endpoint bawaan ini ditutup.
  disabledPaths: [
    "/update-user",
    "/is-username-available",
    ...ssoOnly.disabledPaths,
  ],
  emailAndPassword: ssoOnly.emailAndPassword,
  // Sesi panjang: saat Simtama gangguan, pengguna yang sudah masuk tetap bekerja (sesi hanya dicek di database ini).
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 hari
    updateAge: 60 * 60 * 24, // diperpanjang bila dipakai, paling sering sehari sekali
  },
  user: {
    additionalFields: {
      unitId: { type: "number", required: false, input: false },
      /** "it", "media", atau "it,media"; kosong untuk Staf Unit Lain. */
      bidang: { type: "string", required: false, input: false },
      disabledAt: { type: "date", required: false, input: false },
    },
  },
  account: { accountLinking: simtamaAccountLinking },
  databaseHooks: {
    // Hanya Better Auth yang memicu hook ini, yaitu pembuatan akun saat login SSO pertama;
    // akun buatan Manajer (accounts.ts) dan seed ditulis langsung lewat Drizzle.    // Berjalan setelah transaksi pembuatan akun selesai, sebelum sesi dibuat.
    user: { create: { after: roleFromSimtamaUnit } },
    session: {
      create: {
        // Akun yang dinonaktifkan Manajer tidak bisa login lagi.
        before: async (session, ctx) => {
          const [u] = await db
            .select({ disabledAt: schema.user.disabledAt })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId))
          if (u?.disabledAt) throw accountDisabledError(ctx)
          return { data: session }
        },
      },
    },
  },
  // nextCookies harus paling akhir agar cookie dari server action ikut terpasang.
  plugins: [
    username({ minUsernameLength: 3, maxUsernameLength: 30 }),
    ...(sso ? [simtamaOAuth(sso)] : []),
    nextCookies(),
  ],
})

export type Auth = typeof auth
