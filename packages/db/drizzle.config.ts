import { defineConfig } from "drizzle-kit"

// Satu .env di root repo (lihat .env.example).
try {
  process.loadEnvFile("../../.env")
} catch {
  // Boleh tidak ada bila variabel sudah diset di lingkungan.
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
})
