import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { nextCookies } from "better-auth/next-js"
import { username } from "better-auth/plugins"
import { db } from "@workspace/db/client"
import { eq } from "@workspace/db/orm"
import * as schema from "@workspace/db/schema"

/**
 * Login akun lokal (username + kata sandi). Inilah satu-satunya tempat yang tahu "dari mana login berasal";
 * adapter sistem informasi sekolah nanti menggantikan bagian ini (PRD risiko #1).
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // Akun hanya dibuat oleh Manajer (lihat accounts.ts), tidak ada pendaftaran mandiri.
    disableSignUp: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 hari
    updateAge: 60 * 60 * 24, // diperpanjang bila dipakai, paling sering sehari sekali
  },
  user: {
    additionalFields: {
      unitId: { type: "number", required: false, input: false },
      /** "it", "media", atau "it,media"; kosong untuk Staf Unit Lain. */
      bidang: { type: "string", required: false, input: false },
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      disabledAt: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Akun yang dinonaktifkan Manajer tidak bisa login lagi.
        before: async (session) => {
          const [u] = await db
            .select({ disabledAt: schema.user.disabledAt })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId))
          if (u?.disabledAt) {
            throw new APIError("FORBIDDEN", { message: "Akun dinonaktifkan" })
          }
          return { data: session }
        },
      },
    },
  },
  // nextCookies harus paling akhir agar cookie dari server action ikut terpasang.
  plugins: [
    username({ minUsernameLength: 3, maxUsernameLength: 30 }),
    nextCookies(),
  ],
})

export type Auth = typeof auth
