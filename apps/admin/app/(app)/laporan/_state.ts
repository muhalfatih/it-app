import type { ReportState } from "@/lib/report/rules"

export type StateBadge = {
  label: string
  variant: "outline" | "success-light" | "warning-light" | "secondary"
}

/** Label dan varian Badge per status laporan; dipakai halaman isi dan rekap tim. */
export const STATE_BADGE: Record<ReportState, StateBadge> = {
  terbuka: { label: "Belum dikirim", variant: "outline" },
  dikirim: { label: "Dikirim", variant: "success-light" },
  perlu_diperbarui: { label: "Perlu diperbarui", variant: "warning-light" },
  terkunci: { label: "Terkunci", variant: "secondary" },
  disembunyikan: { label: "Tidak hadir", variant: "outline" },
  libur: { label: "Libur", variant: "outline" },
  bukan_hari_laporan: { label: "Belum berlaku", variant: "outline" },
}
