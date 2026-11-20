// Normalisasi nomor WhatsApp bersama (Layanan, Inventaris).

/** Hapus spasi/strip/kurung; `+` opsional di depan; 9–16 digit. */
export function normalizeWa(raw: string): string | null {
  const s = raw.replace(/[\s\-()]/g, "")
  return /^\+?\d{9,16}$/.test(s) ? s : null
}
