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

/** Status absensi (spesifikasi §7.1); tanpa baris = Hadir. */
export const ATTENDANCE_STATUSES = [
  "hadir",
  "izin",
  "izin_kegiatan",
  "sakit",
  "tanpa_keterangan",
] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

/** Jawaban tugas di laporan harian: Tuntas / Tindak Lanjut. */
export const ANSWER_STATUSES = ["T", "TL"] as const
export type AnswerStatus = (typeof ANSWER_STATUSES)[number]

export const TASK_SOURCES = ["rutin", "planner", "manajer", "sendiri"] as const
export type TaskSource = (typeof TASK_SOURCES)[number]

/** Salinan beku laporan harian yang sudah lewat batas kunci. */
export type FrozenReport = {
  tasks: {
    key: string
    source: TaskSource
    title: string
    status: AnswerStatus | null
    overdueDays: number
  }[]
  obstacles: string
  priorities: string
}
