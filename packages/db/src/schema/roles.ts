// Sengaja tanpa impor: dipakai modul murni (izin) di packages/auth dan di tes.
export const ROLES = ["direktur", "manajer", "sdm_strategi", "sdm_khusus"] as const
export type Role = (typeof ROLES)[number]

export const BIDANG = ["it", "media"] as const
export type Bidang = (typeof BIDANG)[number]
