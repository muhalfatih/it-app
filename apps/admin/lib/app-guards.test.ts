import { readdirSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import type { Permission } from "@workspace/auth/permissions"

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

// Izin yang diharapkan di `requirePermission` tiap halaman, diturunkan dari matriks §3.3
// (lihat docs/audit-akses.md). Tabel ini memang menduplikasi apa yang tertulis di halaman:
// gunanya agar penggantian izin harus disengaja, bukan lolos tanpa terlihat. Pemindai di
// bawah hanya membuktikan penjaga ada; tabel inilah yang membuktikan izinnya benar.
const IZIN_HALAMAN: Record<string, Permission[]> = {
  "app/(app)/absensi/page.tsx": ["absensi.isi"],
  "app/(app)/absensi/libur/page.tsx": ["absensi.isi"],
  "app/(app)/absensi/rekap/[userId]/page.tsx": ["absensi.rekap.semua"],
  "app/(app)/inventaris/page.tsx": ["inventaris.kelola"],
  "app/(app)/inventaris/peminjaman/page.tsx": ["peminjaman.catat"],
  "app/(app)/inventaris/peminjaman/baru/page.tsx": ["peminjaman.catat"],
  "app/(app)/inventaris/peminjaman/[id]/page.tsx": ["peminjaman.catat"],
  "app/(app)/konten/page.tsx": ["kanban.lihat"],
  "app/(app)/konten/[id]/page.tsx": ["kanban.lihat"],
  "app/(app)/laporan/page.tsx": ["laporan.isi"],
  "app/(app)/laporan/rekap/[userId]/page.tsx": ["laporan.rekap.semua"],
  "app/(app)/laporan/tim/page.tsx": ["laporan.rekap.semua"],
  "app/(app)/laporan/tim/[userId]/page.tsx": ["laporan.rekap.semua"],
  "app/(app)/layanan/internet/page.tsx": ["layanan.ajukan"],
  "app/(app)/layanan/internet/rekap/page.tsx": ["pengaduan.lihat"],
  "app/(app)/layanan/sdm/page.tsx": ["layanan.ajukan"],
  "app/(app)/layanan/sdm/saya/page.tsx": ["layanan.ajukan"],
  "app/(app)/layanan/sdm/[id]/page.tsx": ["layanan.ajukan"],
  "app/(app)/layanan/sdm/[id]/tugas/page.tsx": ["layanan.setujui_sdm"],
  "app/(app)/layanan/sdm/persetujuan/page.tsx": ["layanan.setujui_sdm"],
  "app/(app)/planner/page.tsx": ["planner.lihat"],
  "app/(app)/planner/[id]/page.tsx": ["planner.lihat"],
  // Entri dari `?pengajuan=` sekaligus menyetujui pengajuan SDM, jadi dua izin.
  "app/(app)/planner/baru/page.tsx": ["layanan.setujui_sdm", "planner.ubah"],
  "app/(app)/setting/akun/page.tsx": ["setting.kelola"],
  "app/(app)/setting/kanal/page.tsx": ["setting.kelola"],
  "app/(app)/setting/penugasan/page.tsx": ["setting.kelola"],
  "app/(app)/setting/tugas-rutin/page.tsx": ["setting.kelola"],
  "app/(app)/setting/unit-gedung/page.tsx": ["setting.kelola"],
  "app/(app)/tugas/page.tsx": ["tugas_manajer.kelola"],
  "app/(app)/tugas/baru/page.tsx": ["tugas_manajer.kelola"],
  "app/(app)/tugas/[id]/page.tsx": ["tugas_manajer.kelola"],
}

// Satu halaman melayani dua baris matriks (Semua lawan Diri sendiri), jadi izinnya diperiksa
// di dalam body, bukan lewat requirePermission. Keduanya wajib muncul di sumbernya.
const IZIN_INLINE: Record<string, Permission[]> = {
  "app/(app)/laporan/rekap/page.tsx": [
    "laporan.rekap.semua",
    "laporan.rekap.sendiri",
  ],
  "app/(app)/absensi/rekap/page.tsx": [
    "absensi.rekap.semua",
    "absensi.rekap.sendiri",
  ],
}

// Halaman tanpa izin sama sekali, masing-masing dengan alasannya.
const SESI_SAJA = new Set([
  "app/(app)/page.tsx", // beranda: cukup punya sesi
  "app/(app)/notifikasi/page.tsx", // notifikasi milik sendiri
  "app/(app)/galeri/page.tsx", // galeri komponen: tanpa peran ditolak (diuji terpisah)
  "app/(app)/layanan/page.tsx", // hanya redirect ke /layanan/sdm
  "app/masuk/page.tsx", // publik
])

const AKSES_DITOLAK = /redirect\("\/\?akses=ditolak"\)/
const izinDi = (text: string) =>
  [
    ...new Set(
      [...text.matchAll(/requirePermission\("([a-z_.]+)"\)/g)].map((m) => m[1])
    ),
  ].sort()

describe("izin per halaman cocok matriks §3.3", () => {
  const pages = files.filter((f) => f.path.endsWith("/page.tsx"))
  const tercatat = new Set([
    ...Object.keys(IZIN_HALAMAN),
    ...Object.keys(IZIN_INLINE),
    ...SESI_SAJA,
  ])

  it("tabel dan isi direktori sinkron", () => {
    const ada = new Set(pages.map((f) => f.path))
    // Halaman baru wajib ditambahkan ke salah satu tabel di atas.
    expect(pages.map((f) => f.path).filter((p) => !tercatat.has(p))).toEqual([])
    // Tabel tidak boleh memuat halaman yang sudah dihapus atau dipindah.
    expect([...tercatat].filter((p) => !ada.has(p))).toEqual([])
  })

  it.each(Object.entries(IZIN_HALAMAN))("%s -> %j", (path, expected) => {
    const f = pages.find((x) => x.path === path)
    expect(f).toBeDefined()
    expect(izinDi(f!.text)).toEqual([...expected].sort())
  })

  it.each(Object.entries(IZIN_INLINE))(
    "%s memeriksa izin di body dan menolak",
    (path, expected) => {
      const f = pages.find((x) => x.path === path)
      expect(f?.text).toMatch(/\brequireUser\(/)
      for (const izin of expected) expect(f?.text).toContain(izin)
      expect(f?.text).toMatch(AKSES_DITOLAK)
    }
  )

  it.each([...SESI_SAJA])("%s tanpa requirePermission", (path) => {
    const f = pages.find((x) => x.path === path)
    expect(f).toBeDefined()
    expect(izinDi(f!.text)).toEqual([])
  })

  it("galeri menolak akun tanpa peran", () => {
    const f = pages.find((x) => x.path === "app/(app)/galeri/page.tsx")
    expect(f?.text).toMatch(/roles\.length === 0/)
    expect(f?.text).toMatch(AKSES_DITOLAK)
  })
})

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
