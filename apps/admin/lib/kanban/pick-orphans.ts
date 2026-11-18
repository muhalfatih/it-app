// Pemilihan objek yatim murni (tanpa DB/storage) agar bisa dites tanpa database uji.
export const DAY_MS = 86_400_000

/** Objek tanpa baris DB dan lebih tua dari `olderThanMs`. */
export function pickOrphans(
  objects: { key: string; lastModified: Date }[],
  knownKeys: ReadonlySet<string>,
  now: Date,
  olderThanMs = DAY_MS
): string[] {
  return objects
    .filter(
      (o) =>
        !knownKeys.has(o.key) &&
        now.getTime() - o.lastModified.getTime() > olderThanMs
    )
    .map((o) => o.key)
}
