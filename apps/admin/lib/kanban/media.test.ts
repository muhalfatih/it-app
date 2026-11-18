import { describe, expect, it } from "vitest"

import { canBeThumbnail, effectiveThumbnail, embedSrc, embedThumb, mediaSrc, parseEmbed } from "./media"
import type { CardMedia } from "./types"

const ID = "dQw4w9WgXcQ"

describe("parseEmbed", () => {
  it.each([
    `https://youtu.be/${ID}?t=3`,
    `https://www.youtube.com/watch?v=${ID}&list=x`,
    `https://m.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `https://youtube.com/embed/${ID}`,
  ])("youtube: %s", (u) => {
    expect(parseEmbed(u)).toMatchObject({ provider: "youtube", ref: ID })
  })

  it.each([
    "https://drive.google.com/file/d/1AbC_d-9/view?usp=sharing",
    "https://drive.google.com/open?id=1AbC_d-9",
  ])("drive: %s", (u) => {
    expect(parseEmbed(u)).toMatchObject({ provider: "drive", ref: "1AbC_d-9" })
  })

  it.each(["https://vimeo.com/123", "https://drive.google.com.evil.com/file/d/x/view"])(
    "tautan: %s",
    (u) => {
      expect(parseEmbed(u)).toMatchObject({ provider: "tautan", ref: null, url: u })
    },
  )

  it.each(["javascript:alert(1)", "data:text/html,x", "bukan url"])("tolak: %s", (u) => {
    expect(() => parseEmbed(u)).toThrow("Tautan tidak valid")
  })
})

describe("embedSrc / embedThumb / mediaSrc", () => {
  it("membangun URL", () => {
    expect(embedSrc({ provider: "youtube", ref: ID })).toBe(`https://www.youtube-nocookie.com/embed/${ID}`)
    expect(embedSrc({ provider: "drive", ref: "abc" })).toBe("https://drive.google.com/file/d/abc/preview")
    expect(embedSrc({ provider: "tautan", ref: null })).toBeNull()
    expect(embedThumb({ provider: "youtube", ref: ID })).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`)
    expect(embedThumb({ provider: "drive", ref: "abc" })).toBeNull()
    expect(mediaSrc(7)).toBe("/api/media/7")
  })
})

const img = (id: number, position: number): CardMedia => ({
  id, position, source: "file", mediaKind: "image", mime: "image/png", size: 1, originalName: "a.png",
})
const vid = (id: number, position: number): CardMedia => ({
  id, position, source: "file", mediaKind: "video", mime: "video/mp4", size: 1, originalName: "a.mp4",
})
const yt = (id: number, position: number): CardMedia => ({
  id, position, source: "embed", url: `https://youtu.be/${ID}`, provider: "youtube", ref: ID,
})
const link = (id: number, position: number): CardMedia => ({
  id, position, source: "embed", url: "https://vimeo.com/1", provider: "tautan", ref: null,
})

describe("effectiveThumbnail", () => {
  it("memakai pilihan yang valid", () => {
    expect(effectiveThumbnail([img(1, 0), img(2, 1)], 2)).toBe(mediaSrc(2))
  })
  it("pilihan hilang -> foto pertama menurut position", () => {
    expect(effectiveThumbnail([img(1, 5), img(2, 1)], 99)).toBe(mediaSrc(2))
  })
  it("tanpa foto -> sampul YouTube", () => {
    expect(effectiveThumbnail([vid(1, 0), yt(2, 1)], null)).toBe(embedThumb({ provider: "youtube", ref: ID }))
  })
  it("hanya video/tautan -> null", () => {
    expect(effectiveThumbnail([vid(1, 0), link(2, 1)], null)).toBeNull()
  })
})

describe("canBeThumbnail", () => {
  it("foto atau YouTube", () => {
    expect(canBeThumbnail(img(1, 0))).toBe(true)
    expect(canBeThumbnail(yt(1, 0))).toBe(true)
    expect(canBeThumbnail(vid(1, 0))).toBe(false)
    expect(canBeThumbnail(link(1, 0))).toBe(false)
  })
})
