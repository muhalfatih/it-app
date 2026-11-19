// Tanpa impor Node/DOM/DB: dipakai di browser (File.slice) dan server (readRange).
export type VideoCodec = "h264" | "hevc" | "lain"

type Read = (offset: number, length: number) => Promise<Uint8Array>
type Box = { type: string; body: number; end: number }

const MAX_MOOV = 50 * 1024 * 1024
const MAX_ITER = 10_000

const ascii = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3])
const u32 = (b: Uint8Array, o: number) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(o)

// Header satu kotak di `o`; `limit` = akhir area induk. null bila rusak.
function header(b: Uint8Array, o: number, limit: number): Box | null {
  if (o + 8 > b.length) return null
  let size = u32(b, o)
  let hdr = 8
  if (size === 1) {
    if (o + 16 > b.length) return null
    size = u32(b, o + 8) * 2 ** 32 + u32(b, o + 12) // shortcut: presisi 53-bit, cukup untuk ukuran file
    hdr = 16
  } else if (size === 0) size = limit - o
  if (size < hdr || o + size > limit) return null
  return { type: ascii(b, o + 4), body: o + hdr, end: o + size }
}

function children(b: Uint8Array, start: number, end: number): Box[] {
  const out: Box[] = []
  for (let o = start, i = 0; o < end && i < MAX_ITER; i++) {
    const x = header(b, o, end)
    if (!x) break
    out.push(x)
    o = x.end
  }
  return out
}

const find = (b: Uint8Array, p: Box, type: string) => children(b, p.body, p.end).find((x) => x.type === type)

function codecOfMoov(b: Uint8Array, moov: Box): VideoCodec | null {
  for (const trak of children(b, moov.body, moov.end).filter((x) => x.type === "trak")) {
    const mdia = find(b, trak, "mdia")
    const hdlr = mdia && find(b, mdia, "hdlr")
    // hdlr: versi/flags 4 + pre_defined 4, lalu handler_type
    if (!mdia || !hdlr || hdlr.body + 12 > hdlr.end || ascii(b, hdlr.body + 8) !== "vide") continue
    const minf = find(b, mdia, "minf")
    const stbl = minf && find(b, minf, "stbl")
    const stsd = stbl && find(b, stbl, "stsd")
    // stsd: versi/flags 4 + jumlah entri 4, lalu entri (ukuran 4 + tipe 4)
    if (!stsd || stsd.body + 16 > stsd.end) continue
    const t = ascii(b, stsd.body + 12)
    return t === "avc1" || t === "avc3" ? "h264" : t === "hvc1" || t === "hev1" ? "hevc" : "lain"
  }
  return null
}

export async function videoCodecOf(readRaw: Read, size: number): Promise<VideoCodec | null> {
  // Galat baca (storage/File) diteruskan; hanya struktur kotak rusak yang jadi null.
  let readErr: { e: unknown } | null = null
  const read: Read = (o, l) =>
    readRaw(o, l).catch((e) => {
      readErr = { e }
      throw e
    })
  try {
    let o = 0
    for (let i = 0; i < MAX_ITER && o + 8 <= size; i++) {
      const h = await read(o, Math.min(16, size - o))
      const x = header(h, 0, Infinity)
      if (!x) return null
      let len = x.end // dari header(): ukuran kotak
      if (u32(h, 0) === 0) len = size - o // size 0 = sampai akhir file
      if (len < x.body || o + len > size) return null
      if (x.type === "moov") {
        if (len > MAX_MOOV) return null
        const b = await read(o, len)
        const m = header(b, 0, b.length)
        return b.length === len && m ? codecOfMoov(b, m) : null
      }
      o += len
    }
    return null
  } catch (e) {
    if (readErr) throw (readErr as { e: unknown }).e
    return null
  }
}

export function codecError(name: string, codec: VideoCodec | null): string | null {
  if (codec === "h264") return null
  if (codec === "hevc")
    return `${name}: kodek HEVC tidak bisa diputar di semua browser. Ekspor ulang ke MP4 (H.264), atau di iPhone pilih Pengaturan › Kamera › Format › Paling Kompatibel.`
  if (codec === "lain") return `${name}: kodek video tidak didukung. Ekspor ulang ke MP4 (H.264).`
  return `${name}: file video rusak atau tidak terbaca.`
}
