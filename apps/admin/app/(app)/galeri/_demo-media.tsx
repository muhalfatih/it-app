"use client"

import * as React from "react"

import {
  MediaGallery,
  type MediaItem,
} from "@workspace/ui/components/domain/media-gallery"
import { Skeleton } from "@workspace/ui/components/skeleton"

const PHOTOS: MediaItem[] = [
  {
    id: "f1",
    kind: "image",
    src: "/galeri/foto-1.svg",
    name: "upacara-hari-pahlawan-01.jpg",
    alt: "Lapangan upacara dari tribun",
  },
  {
    id: "f2",
    kind: "image",
    src: "/galeri/foto-2.svg",
    name: "potret-kepala-sekolah.jpg",
    alt: "Potret kepala sekolah",
  },
  {
    id: "f3",
    kind: "image",
    src: "/galeri/foto-3.svg",
    name: "barisan-peserta-upacara.jpg",
    alt: "Barisan peserta upacara",
  },
  {
    id: "f4",
    kind: "image",
    src: "/galeri/foto-4.svg",
    name: "detail-dekorasi-panggung.jpg",
    alt: "Detail dekorasi panggung",
  },
]

/**
 * Contoh video untuk galeri saja: direkam dari animasi canvas di browser (tanpa file eksternal).
 * shortcut: video asli nanti datang dari server unit lewat endpoint ber-otorisasi dengan range request.
 */
async function recordSampleVideo(seconds = 5): Promise<string | null> {
  if (typeof MediaRecorder === "undefined") return null
  const canvas = document.createElement("canvas")
  canvas.width = 960
  canvas.height = 540
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  const stream = canvas.captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm" })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => chunks.push(e.data)
  const done = new Promise<void>((r) => (recorder.onstop = () => r()))
  const start = performance.now()
  recorder.start()
  await new Promise<void>((resolve) => {
    const frame = (now: number) => {
      const t = (now - start) / 1000
      ctx.fillStyle = "#3f5961"
      ctx.fillRect(0, 0, 960, 540)
      for (let i = 0; i < 8; i++) {
        const h = 120 + 100 * Math.sin(t * 2 + i)
        ctx.fillStyle = i % 2 ? "#a9bcc2" : "#e3eaec"
        ctx.fillRect(140 + i * 90, 400 - h, 60, h)
      }
      ctx.fillStyle = "#e3eaec"
      ctx.font = "600 40px sans-serif"
      ctx.fillText(`Contoh video · ${t.toFixed(1)} dtk`, 140, 470)
      if (t < seconds) requestAnimationFrame(frame)
      else resolve()
    }
    requestAnimationFrame(frame)
  })
  recorder.stop()
  await done
  return URL.createObjectURL(new Blob(chunks, { type: "video/webm" }))
}

export function MediaDemo() {
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    let url: string | null = null
    recordSampleVideo().then((u) => {
      url = u
      if (u) setVideoUrl(u)
      else setFailed(true)
    })
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [])

  const embeds: MediaItem[] = [
    {
      id: "e1",
      kind: "embed",
      src: "",
      poster: "/galeri/video-poster.svg",
      embedSrc: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
      name: "Teaser Hari Pahlawan (YouTube)",
      alt: "Video YouTube Teaser Hari Pahlawan",
    },
    {
      id: "e2",
      kind: "embed",
      src: "",
      href: "https://www.example.com/berita/upacara",
      name: "Berita upacara (tautan)",
      alt: "Tautan berita upacara",
    },
  ]
  const base: MediaItem[] = videoUrl
    ? [
        PHOTOS[0]!,
        {
          id: "v1",
          kind: "video",
          src: videoUrl,
          poster: "/galeri/video-poster.svg",
          name: "teaser-hari-pahlawan.webm",
          alt: "Video teaser Hari Pahlawan",
          duration: "0:05",
        },
        ...PHOTOS.slice(1),
      ]
    : PHOTOS
  const items = [...base, ...embeds]

  return (
    <div className="flex flex-col gap-2">
      <MediaGallery items={items} />
      {!videoUrl && !failed ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Skeleton className="size-3 rounded-full" />
          Menyiapkan contoh video…
        </div>
      ) : null}
    </div>
  )
}
