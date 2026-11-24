import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  // tsconfig Next memakai jsx: preserve; tes yang mengimpor .tsx (mis. lib/menu.tsx) butuh JSX ditransformasi.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // Beberapa file tes mengosongkan database uji yang sama; jangan jalan bersamaan.
    fileParallelism: false,
  },
})
