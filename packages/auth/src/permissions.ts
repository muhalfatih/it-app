// Modul murni (tanpa db/auth/next): daftar izin dan matriks akses spesifikasi §3.3.
import type { Role } from "@workspace/db/schema/roles"

export const PERMISSIONS = [
  "planner.lihat",
  "planner.ubah",
  "planner.hapus_terkunci",
  "planner.pdf",
  "laporan.isi",
  "laporan.rekap.semua",
  "laporan.rekap.sendiri",
  "laporan.buka_kunci",
  "tugas_manajer.kelola",
  "kanban.lihat",
  "kanban.isi",
  "kanban.ide_ke_draft",
  "kanban.draft_ke_review",
  "kanban.review_ke_disetujui",
  "kanban.tayang",
  "kanban.batal_tayang",
  "absensi.isi",
  "absensi.rekap.semua",
  "absensi.rekap.sendiri",
  "layanan.ajukan",
  "layanan.setujui_sdm",
  "pengaduan.lihat",
  "inventaris.kelola",
  "peminjaman.catat",
  "setting.kelola",
] as const
export type Permission = (typeof PERMISSIONS)[number]

/** Izin tiap peran, persis matriks §3.3. Staf Unit Lain (tanpa peran) lihat NO_ROLE_PERMISSIONS. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  direktur: [
    "planner.lihat",
    "planner.pdf",
    "laporan.rekap.semua",
    "kanban.lihat",
    "kanban.review_ke_disetujui",
    "absensi.rekap.semua",
    "layanan.ajukan",
    "pengaduan.lihat",
  ],
  manajer: [
    "planner.lihat",
    "planner.ubah",
    "planner.hapus_terkunci",
    "planner.pdf",
    "laporan.isi",
    "laporan.rekap.semua",
    "laporan.buka_kunci",
    "tugas_manajer.kelola",
    "kanban.lihat",
    "kanban.isi",
    // PRD §9 butir 3 dan 4: hak cadangan Manajer, disetujui 24 Nov 2026 (docs/audit-akses.md).
    "kanban.ide_ke_draft",
    "kanban.draft_ke_review",
    "kanban.tayang",
    "kanban.batal_tayang",
    "absensi.isi",
    "absensi.rekap.semua",
    "layanan.ajukan",
    "layanan.setujui_sdm",
    "pengaduan.lihat",
    "inventaris.kelola",
    "peminjaman.catat",
    "setting.kelola",
  ],
  sdm_strategi: [
    "planner.lihat",
    "planner.ubah",
    "planner.pdf",
    "laporan.isi",
    "laporan.rekap.sendiri",
    "kanban.lihat",
    "kanban.isi",
    "kanban.ide_ke_draft",
    "kanban.tayang",
    "absensi.rekap.sendiri",
    "layanan.ajukan",
    "pengaduan.lihat",
    "peminjaman.catat",
  ],
  sdm_khusus: [
    "planner.lihat",
    "planner.pdf",
    "laporan.isi",
    "laporan.rekap.sendiri",
    "kanban.lihat",
    "kanban.isi",
    "kanban.tayang",
    "absensi.rekap.sendiri",
    "layanan.ajukan",
    "pengaduan.lihat",
    "peminjaman.catat",
  ],
}

const NO_ROLE_PERMISSIONS: readonly Permission[] = ["layanan.ajukan"]

export const ROLE_LABEL: Record<Role, string> = {
  direktur: "Direktur",
  manajer: "Manajer",
  sdm_strategi: "SDM Bidang Strategi",
  sdm_khusus: "SDM Bidang Khusus",
}

/** Gabungan izin semua peran akun; tanpa peran = Staf Unit Lain. */
export function permissionsFor(roles: readonly Role[]): Set<Permission> {
  if (roles.length === 0) return new Set(NO_ROLE_PERMISSIONS)
  return new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role]))
}

export function can(roles: readonly Role[], permission: Permission): boolean {
  return permissionsFor(roles).has(permission)
}

/** Filter "Pekerjaan saya saja" aktif di awal hanya untuk SDM Khusus murni (spesifikasi §4.3). */
export function defaultMyWorkOnly(roles: readonly Role[]): boolean {
  return (
    roles.includes("sdm_khusus") &&
    !roles.some(
      (r) => r === "manajer" || r === "sdm_strategi" || r === "direktur"
    )
  )
}
