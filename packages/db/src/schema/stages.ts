// Sengaja tanpa impor: dipakai modul murni (aturan hapus Planner) dan tes.
export const CONTENT_STAGES = [
  "ide",
  "draft",
  "review",
  "disetujui",
  "tayang",
] as const
export type ContentStage = (typeof CONTENT_STAGES)[number]

/** Jenis kejadian di riwayat kartu (spesifikasi §6.6). */
export const CARD_EVENT_KINDS = [
  "maju",
  "kembali",
  "centang",
  "batal_centang",
  "otomatis",
  "catatan_sistem",
] as const
export type CardEventKind = (typeof CARD_EVENT_KINDS)[number]

/** Tahap terkunci: hapus butuh izin khusus dan konfirmasi nama (spesifikasi §4.5). */
export const LOCKED_STAGES: readonly ContentStage[] = [
  "review",
  "disetujui",
  "tayang",
]
