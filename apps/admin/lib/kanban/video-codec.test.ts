import { describe, expect, it } from "vitest"

import { codecError, videoCodecOf } from "./video-codec"

const enc = (s: string) => new TextEncoder().encode(s)
const cat = (...p: Uint8Array[]) => {
  const out = new Uint8Array(p.reduce((n, x) => n + x.length, 0))
  let o = 0
  for (const x of p) (out.set(x, o), (o += x.length))
  return out
}
const u32 = (n: number) => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255])
const box = (type: string, ...kids: Uint8Array[]) => {
  const body = cat(...kids)
  return cat(u32(8 + body.length), enc(type), body)
}
const hdlr = (h: string) => box("hdlr", u32(0), u32(0), enc(h), new Uint8Array(12))
const stsd = (entry: string) => box("stsd", u32(0), u32(1), box(entry, new Uint8Array(20)))
const trak = (h: string, entry: string) =>
  box("trak", box("mdia", hdlr(h), box("minf", box("stbl", stsd(entry)))))
const moov = (...t: Uint8Array[]) => box("moov", ...t)
const ftyp = box("ftyp", enc("isom"), u32(0))

function reader(data: Uint8Array) {
  const st = { calls: 0, bytes: 0 }
  const read = async (offset: number, length: number) => {
    const s = data.slice(offset, offset + length)
    st.calls++
    st.bytes += s.length
    return s
  }
  return { read, st, size: data.length }
}
const run = (data: Uint8Array) => {
  const r = reader(data)
  return videoCodecOf(r.read, r.size)
}

describe("videoCodecOf", () => {
  it.each([
    ["avc1", "h264"],
    ["avc3", "h264"],
    ["hvc1", "hevc"],
    ["hev1", "hevc"],
    ["vp09", "lain"],
  ])("%s -> %s", async (entry, want) => {
    const f = cat(ftyp, moov(trak("vide", entry)), box("mdat", new Uint8Array(100)))
    expect(await run(f)).toBe(want)
  })

  it("moov setelah mdat 10 MB (size==1, 64-bit) tidak membaca mdat", async () => {
    const n = 10 * 1024 * 1024
    const mdat = cat(u32(1), enc("mdat"), u32(0), u32(16 + n), new Uint8Array(n))
    const r = reader(cat(ftyp, mdat, moov(trak("vide", "avc1"))))
    expect(await videoCodecOf(r.read, r.size)).toBe("h264")
    expect(r.st.bytes).toBeLessThan(1024 * 1024)
  })

  it("trek audio saja -> null", async () => {
    expect(await run(cat(ftyp, moov(trak("soun", "mp4a"))))).toBeNull()
  })

  it("audio lalu video -> kodek trek video", async () => {
    expect(await run(cat(ftyp, moov(trak("soun", "mp4a"), trak("vide", "hvc1"))))).toBe("hevc")
  })

  it("data terpotong -> null", async () => {
    const f = cat(ftyp, moov(trak("vide", "avc1")))
    expect(await run(f.slice(0, f.length - 20))).toBeNull()
    expect(await run(f.slice(0, 5))).toBeNull()
  })

  it("ukuran kotak 0 di tengah / < 8 -> null tanpa hang", async () => {
    expect(await run(cat(ftyp, box("free"), u32(0), enc("mdat"), new Uint8Array(50)))).toBeNull()
    expect(await run(cat(ftyp, u32(4), enc("free"), new Uint8Array(50)))).toBeNull()
    expect(await run(cat(ftyp, moov(u32(4), enc("trak"), new Uint8Array(30))))).toBeNull()
  })

  it("kotak melewati akhir file -> null", async () => {
    expect(await run(cat(ftyp, u32(99999), enc("free"), new Uint8Array(10)))).toBeNull()
  })

  it("moov > 50 MB -> null", async () => {
    expect(await run(cat(ftyp, u32(60 * 1024 * 1024), enc("moov"), new Uint8Array(10)))).toBeNull()
  })

  it("read yang melempar -> null", async () => {
    const r = await videoCodecOf(async () => {
      throw new Error("x")
    }, 100)
    expect(r).toBeNull()
  })
})

describe("codecError", () => {
  it("pesan persis", () => {
    expect(codecError("a.mp4", "h264")).toBeNull()
    expect(codecError("a.mov", "hevc")).toBe(
      "a.mov: kodek HEVC tidak bisa diputar di semua browser. Ekspor ulang ke MP4 (H.264), atau di iPhone pilih Pengaturan › Kamera › Format › Paling Kompatibel.",
    )
    expect(codecError("a.mp4", "lain")).toBe("a.mp4: kodek video tidak didukung. Ekspor ulang ke MP4 (H.264).")
    expect(codecError("a.mp4", null)).toBe("a.mp4: file video rusak atau tidak terbaca.")
  })
})
