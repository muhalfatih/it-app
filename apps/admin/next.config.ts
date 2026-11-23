import path from "node:path"
import type { NextConfig } from "next"

// Satu .env di root repo (lihat env.example); Next sendiri hanya membaca .env di apps/admin.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, "../../.env"))
} catch {
  // Boleh tidak ada bila variabel sudah diset di lingkungan (mis. produksi/Docker).
}

const nextConfig: NextConfig = {
  // Image Docker (apps/admin/Dockerfile); root pelacakan = root monorepo agar packages/* ikut.
  output: "standalone",
  outputFileTracingRoot: path.resolve(import.meta.dirname, "../.."),
  transpilePackages: ["@workspace/ui", "@workspace/db", "@workspace/auth"],
}

export default nextConfig
