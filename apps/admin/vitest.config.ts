import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
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
