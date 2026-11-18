"use client"

import * as React from "react"

import {
  MediaUpload,
  type MediaUploadItem,
} from "@workspace/ui/components/domain/media-upload"

const SEED: MediaUploadItem[] = [
  {
    id: "u1",
    name: "upacara-hari-pahlawan-01.jpg",
    size: 2_400_000,
    kind: "image",
    src: "/galeri/foto-1.svg",
    status: "done",
  },
  {
    id: "u2",
    name: "potret-kepala-sekolah.jpg",
    size: 1_800_000,
    kind: "image",
    src: "/galeri/foto-2.svg",
    status: "done",
  },
  {
    id: "u3",
    name: "barisan-peserta-upacara.jpg",
    size: 3_100_000,
    kind: "image",
    src: "/galeri/foto-3.svg",
    status: "done",
    thumbnail: true,
  },
  {
    id: "e1",
    name: "Teaser Hari Pahlawan",
    size: 0,
    kind: "video",
    src: "/galeri/video-poster.svg",
    status: "done",
    source: "embed",
    provider: "youtube",
    href: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  },
  {
    id: "e2",
    name: "Naskah sambutan",
    size: 0,
    kind: "image",
    src: "",
    status: "done",
    source: "embed",
    provider: "drive",
    href: "https://drive.google.com/file/d/abc/view",
  },
  {
    id: "e3",
    name: "Berita upacara",
    size: 0,
    kind: "image",
    src: "",
    status: "done",
    source: "embed",
    provider: "tautan",
    href: "https://www.example.com/berita/upacara",
  },
]

/**
 * Contoh untuk galeri: unggahan disimulasikan di browser (progres acak, file tidak dikirim ke mana pun).
 * shortcut: penyimpanan nyata (MinIO) dikerjakan di putaran 2 Kanban; ganti `simulate` dengan unggahan sungguhan.
 */
export function UploadDemo() {
  const [items, setItems] = React.useState(SEED)
  const timers = React.useRef(new Map<string, ReturnType<typeof setInterval>>())
  const urls = React.useRef(new Set<string>())

  React.useEffect(() => {
    const t = timers.current
    const u = urls.current
    return () => {
      t.forEach(clearInterval)
      u.forEach(URL.revokeObjectURL)
    }
  }, [])

  function simulate(id: string) {
    const timer = setInterval(() => {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== id) return it
          const progress = Math.min(
            100,
            (it.progress ?? 0) + 8 + Math.random() * 14
          )
          return progress >= 100
            ? { ...it, progress: 100, status: "done" }
            : { ...it, progress }
        })
      )
    }, 250)
    timers.current.set(id, timer)
    setTimeout(() => {
      clearInterval(timer)
      timers.current.delete(id)
    }, 6000)
  }

  return (
    <div className="flex flex-col gap-6">
      <MediaUpload
        items={items}
        onEmbed={async (url) => {
          let host = ""
          try {
            host = new URL(url).hostname.replace(/^www\./, "")
          } catch {
            return "Tautan tidak valid. Mulai dengan https://."
          }
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
          setItems((prev) => [
            ...prev,
            {
              id,
              name: host,
              size: 0,
              kind: "image",
              src: "",
              status: "done",
              source: "embed",
              provider: "tautan",
              href: url,
            },
          ])
          return null
        }}
        onSetThumbnail={(id) =>
          setItems((prev) =>
            prev.map((it) => ({ ...it, thumbnail: it.id === id }))
          )
        }
        onAdd={(files) => {
          const added = files.map(({ file, kind }) => {
            const src = URL.createObjectURL(file)
            urls.current.add(src)
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            return {
              id,
              name: file.name,
              size: file.size,
              kind,
              src,
              status: "uploading",
              progress: 0,
            } satisfies MediaUploadItem
          })
          setItems((prev) => [...prev, ...added])
          added.forEach((it) => simulate(it.id))
        }}
        onReorder={(ids) =>
          setItems((prev) =>
            ids.flatMap((id) => prev.find((it) => it.id === id) ?? [])
          )
        }
        onRemove={(id) => {
          clearInterval(timers.current.get(id))
          timers.current.delete(id)
          setItems((prev) => prev.filter((it) => it.id !== id))
        }}
      />
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Terkunci (<code>disabled</code>): hanya lihat.
        </p>
        <MediaUpload
          disabled
          items={SEED}
          onAdd={() => {}}
          onReorder={() => {}}
          onRemove={() => {}}
        />
      </div>
    </div>
  )
}
