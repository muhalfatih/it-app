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

// Izin yang diharapkan di `withPermission` tiap aksi server, diturunkan dari matriks §3.3.
// Kunci: "<file>:<nama ekspor>". Penegakannya sendiri sudah dibuktikan di
// packages/auth/src/authorize.test.ts (pembungkusnya dipakai bersama semua aksi), jadi yang
// dikunci di sini adalah pemilihan izinnya, yang sebelumnya tidak diuji apa pun.
const IZIN_AKSI: Record<string, Permission> = {
  "app/(app)/absensi/actions.ts:saveAttendance": "absensi.isi",
  // Hari libur diatur di menu Absensi (spesifikasi §7.2), jadi izinnya sama.
  "app/(app)/absensi/libur/actions.ts:addHolidayAction": "absensi.isi",
  "app/(app)/absensi/libur/actions.ts:removeHolidayAction": "absensi.isi",
  "app/(app)/inventaris/actions.ts:createEquipmentAction": "inventaris.kelola",
  "app/(app)/inventaris/actions.ts:updateEquipmentAction": "inventaris.kelola",
  "app/(app)/inventaris/actions.ts:setEquipmentActiveAction": "inventaris.kelola",
  "app/(app)/inventaris/actions.ts:deleteEquipmentAction": "inventaris.kelola",
  "app/(app)/inventaris/actions.ts:resolveProblemAction": "inventaris.kelola",
  "app/(app)/inventaris/peminjaman/baru/actions.ts:createLoanAction": "peminjaman.catat",
  "app/(app)/inventaris/peminjaman/[id]/actions.ts:returnLoanAction": "peminjaman.catat",
  "app/(app)/laporan/actions.ts:answerTask": "laporan.isi",
  "app/(app)/laporan/actions.ts:saveReportNotes": "laporan.isi",
  "app/(app)/laporan/actions.ts:addOwnTask": "laporan.isi",
  "app/(app)/laporan/actions.ts:renameOwnTask": "laporan.isi",
  "app/(app)/laporan/actions.ts:removeOwnTask": "laporan.isi",
  "app/(app)/laporan/actions.ts:sendReport": "laporan.isi",
  "app/(app)/laporan/tim/actions.ts:unlock": "laporan.buka_kunci",
  "app/(app)/layanan/internet/actions.ts:submitComplaintAction": "layanan.ajukan",
  "app/(app)/layanan/sdm/actions.ts:submitRequestAction": "layanan.ajukan",
  "app/(app)/layanan/sdm/actions.ts:startRundownUploadAction": "layanan.ajukan",
  // Pemiliknya sendiri yang menarik pengajuan; kepemilikan diperiksa withdrawRequest.
  "app/(app)/layanan/sdm/[id]/actions.ts:withdrawAction": "layanan.ajukan",
  "app/(app)/layanan/sdm/[id]/actions.ts:rejectAction": "layanan.setujui_sdm",
  "app/(app)/layanan/sdm/[id]/actions.ts:approveTasksAction": "layanan.setujui_sdm",
  "app/(app)/layanan/sdm/[id]/actions.ts:cancelAction": "layanan.setujui_sdm",
  // Jalur `?pengajuan=` memeriksa layanan.setujui_sdm di dalam createEntry, dan
  // penghapusan tahap Review ke atas memeriksa planner.hapus_terkunci di deleteEntry.
  "app/(app)/planner/actions.ts:saveEntry": "planner.ubah",
  "app/(app)/planner/actions.ts:removeEntry": "planner.ubah",
  "app/(app)/setting/akun/actions.ts:createAccountAction": "setting.kelola",
  "app/(app)/setting/akun/actions.ts:updateAccountAction": "setting.kelola",
  "app/(app)/setting/akun/actions.ts:transferManagerAction": "setting.kelola",
  "app/(app)/setting/akun/actions.ts:setDisabledAction": "setting.kelola",
  "app/(app)/setting/akun/actions.ts:searchSimtamaAction": "setting.kelola",
  "app/(app)/setting/akun/actions.ts:createFromSimtamaAction": "setting.kelola",
  "app/(app)/setting/kanal/actions.ts:addChannel": "setting.kelola",
  "app/(app)/setting/kanal/actions.ts:updateChannel": "setting.kelola",
  "app/(app)/setting/penugasan/actions.ts:addTaskType": "setting.kelola",
  "app/(app)/setting/penugasan/actions.ts:updateTaskType": "setting.kelola",
  "app/(app)/setting/tugas-rutin/actions.ts:addRoutineTask": "setting.kelola",
  "app/(app)/setting/tugas-rutin/actions.ts:updateRoutineTask": "setting.kelola",
  "app/(app)/setting/unit-gedung/actions.ts:addUnit": "setting.kelola",
  "app/(app)/setting/unit-gedung/actions.ts:updateUnit": "setting.kelola",
  "app/(app)/setting/unit-gedung/actions.ts:addBuilding": "setting.kelola",
  "app/(app)/setting/unit-gedung/actions.ts:updateBuilding": "setting.kelola",
  "app/(app)/tugas/actions.ts:saveTask": "tugas_manajer.kelola",
  "app/(app)/tugas/actions.ts:removeTask": "tugas_manajer.kelola",
}

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

describe("izin per aksi server cocok matriks §3.3", () => {
  const ditemukan = new Map<string, string>()
  for (const f of files.filter((x) => /^\s*["']use server["']/.test(x.text)))
    for (const m of f.text.matchAll(
      /export const (\w+) = withPermission\(\s*"([a-z_.]+)"/g
    ))
      ditemukan.set(`${f.path}:${m[1]}`, m[2])

  it("tabel dan isi file aksi sinkron", () => {
    // Aksi withPermission baru wajib ditambahkan ke tabel.
    expect([...ditemukan.keys()].filter((k) => !(k in IZIN_AKSI)).sort()).toEqual(
      []
    )
    // Tabel tidak boleh memuat aksi yang sudah dihapus, dipindah, atau diganti namanya.
    expect(
      Object.keys(IZIN_AKSI)
        .filter((k) => !ditemukan.has(k))
        .sort()
    ).toEqual([])
  })

  it.each(Object.entries(IZIN_AKSI))("%s -> %s", (kunci, izin) => {
    expect(ditemukan.get(kunci)).toBe(izin)
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
