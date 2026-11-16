// Seed idempoten: akun Manajer awal + contoh data Setting (hanya bila tabelnya kosong).
// Jalankan: pnpm --filter @workspace/auth db:seed  (membaca .env di root repo)
import { db } from "@workspace/db/client"
import { count, eq } from "@workspace/db/orm"
import { building, channel, taskType, unit, user } from "@workspace/db/schema"

import { createAccount } from "./accounts"
import { usernameSchema } from "./rules"

async function seedManager() {
  const rawUsername = process.env.SEED_MANAGER_USERNAME
  const password = process.env.SEED_MANAGER_PASSWORD
  if (!rawUsername || !password) {
    console.log(
      "Lewati akun Manajer: SEED_MANAGER_USERNAME/SEED_MANAGER_PASSWORD belum diisi di .env"
    )
    return
  }
  const username = usernameSchema.parse(rawUsername)
  const [exists] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.username, username))
  if (exists) {
    console.log(`Akun Manajer "${username}" sudah ada, dilewati.`)
    return
  }
  await createAccount({
    username,
    password,
    name: "Manajer",
    roles: ["manajer"],
    bidang: ["it", "media"],
    unitId: null,
    mustChangePassword: true,
  })
  console.log(
    `Akun Manajer "${username}" dibuat (wajib ganti kata sandi saat login pertama).`
  )
}

async function seedIfEmpty<T extends { name: string }>(
  label: string,
  table: typeof unit | typeof building | typeof taskType | typeof channel,
  rows: T[]
) {
  const [{ n }] = await db.select({ n: count() }).from(table)
  if (n > 0) return console.log(`${label}: sudah berisi ${n}, dilewati.`)
  await db.insert(table).values(rows)
  console.log(`${label}: ${rows.length} contoh ditambahkan.`)
}

async function main() {
  await seedManager()
  await seedIfEmpty(
    "Daftar penugasan",
    taskType,
    ["Take footage", "Editing", "Caption", "Dokumentasi", "Desain"].map(
      (name) => ({ name })
    )
  )
  await seedIfEmpty("Kanal", channel, [
    { name: "YouTube", requiresLink: true },
    { name: "Instagram", requiresLink: true },
    { name: "Facebook", requiresLink: false },
    { name: "WA Grup", requiresLink: false },
    { name: "TV Display", requiresLink: false },
  ])
  await seedIfEmpty(
    "Gedung",
    building,
    ["Gedung A", "Gedung B", "Gedung C", "Aula"].map((name) => ({ name }))
  )
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
