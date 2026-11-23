import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

// Pemindai statis penjaga akses (audit hak akses, PRD §10): setiap halaman dan aksi server
// harus punya penjaga, supaya halaman/aksi baru tanpa penjaga tertangkap di CI.
const ADMIN = fileURLToPath(new URL("..", import.meta.url))

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
  )
}
const rel = (f: string) => relative(ADMIN, f).split(sep).join("/")
const files = [...walk(join(ADMIN, "app")), ...walk(join(ADMIN, "lib"))]
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))
  .map((f) => ({ path: rel(f), text: readFileSync(f, "utf8") }))

// Pengecualian eksplisit: masuk memang publik, /layanan hanya redirect ke /layanan/sdm.
const PAGES_WITHOUT_GUARD = new Set(["app/masuk/page.tsx", "app/(app)/layanan/page.tsx"])
// Aksi tanpa withPermission: signOut berlaku untuk siapa pun yang punya sesi; push memakai requireUser.
const ACTIONS_WITHOUT_WRAPPER = new Set([
  "lib/auth-actions.ts:signOutAction",
  "lib/push/actions.ts:subscribe",
  "lib/push/actions.ts:unsubscribe",
])

describe("penjaga akses halaman dan aksi", () => {
  it("setiap page.tsx memanggil requirePermission atau requireUser", () => {
    const pages = files.filter((f) => f.path.endsWith("/page.tsx"))
    expect(pages.length).toBeGreaterThan(30) // jaga agar pemindaian tidak kosong
    const unguarded = pages
      .filter((f) => !/\brequire(Permission|User)\(/.test(f.text))
      .map((f) => f.path)
      .filter((p) => !PAGES_WITHOUT_GUARD.has(p))
    expect(unguarded).toEqual([])
  })

  it("layout (app) menuntut sesi", () => {
    const layout = files.find((f) => f.path === "app/(app)/layout.tsx")
    expect(layout?.text).toMatch(/\brequireUser\(/)
  })

  it("setiap ekspor file 'use server' dibungkus withPermission/action", () => {
    const actionFiles = files.filter((f) => /^\s*["']use server["']/.test(f.text))
    expect(actionFiles.length).toBeGreaterThan(15)
    const bare: string[] = []
    for (const f of actionFiles) {
      for (const m of f.text.matchAll(
        /^export (?:async )?(?:const|function)\s+(\w+)\s*(?:=\s*(\w+)\()?/gm
      )) {
        const [, name, wrapper] = m
        const key = `${f.path}:${name}`
        if (wrapper !== "withPermission" && wrapper !== "action" && !ACTIONS_WITHOUT_WRAPPER.has(key)) {
          bare.push(key)
        }
      }
    }
    expect(bare).toEqual([])
  })

  it("pembungkus action di konten memakai withPermission", () => {
    const f = files.find((x) => x.path === "app/(app)/konten/actions.ts")
    expect(f?.text).toMatch(/const action\b[^]*?withPermission\(/)
  })
})
