"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  MediaLightbox,
  type MediaItem,
} from "@workspace/ui/components/domain/media-gallery"
import {
  MediaUpload,
  type MediaKind,
  type MediaUploadItem,
} from "@workspace/ui/components/domain/media-upload"

import {
  canBeThumbnail,
  effectiveThumbnail,
  embedSrc,
  embedThumb,
  mediaSrc,
} from "@/lib/kanban/media"
import { MAX_MEDIA_ITEMS } from "@/lib/kanban/media-rules"
import type { CardMedia } from "@/lib/kanban/types"
import { uploadToStorage } from "@/lib/kanban/upload-client"
import { codecError, videoCodecOf } from "@/lib/kanban/video-codec"

import {
  addEmbedAction,
  finishUploadAction,
  removeMediaAction,
  reorderMediaAction,
  setThumbnailAction,
  startUploadAction,
} from "../actions"

const MAX_PARALLEL = 2
const LOCAL = "u-"

type Local = MediaUploadItem & { file: File }

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function embedName(m: Extract<CardMedia, { source: "embed" }>) {
  if (m.provider === "youtube") return "Video YouTube"
  if (m.provider === "drive") return "File Google Drive"
  return hostOf(m.url)
}

export function CardMediaSection({
  cardId,
  media,
  thumbnailMediaId,
  disabled,
}: {
  cardId: number
  media: CardMedia[]
  thumbnailMediaId: number | null
  disabled: boolean
}) {
  const router = useRouter()
  const [local, setLocal] = React.useState<Local[]>([])
  const [order, setOrder] = React.useState<number[] | null>(null)
  const [removing, setRemoving] = React.useState<{ id: number; name: string; file: boolean } | null>(null)
  const [removePending, startRemove] = React.useTransition()
  const [open, setOpen] = React.useState(false)
  const [index, setIndex] = React.useState(0)

  const queue = React.useRef<Local[]>([])
  const running = React.useRef(0)
  const controllers = React.useRef(new Map<string, AbortController>())
  const localRef = React.useRef(local)
  localRef.current = local

  const patch = React.useCallback((id: string, p: Partial<MediaUploadItem>) => {
    setLocal((prev) => prev.map((l) => (l.id === id ? { ...l, ...p } : l)))
  }, [])

  const drop = React.useCallback((id: string) => {
    setLocal((prev) => {
      const l = prev.find((x) => x.id === id)
      if (l?.src.startsWith("blob:")) URL.revokeObjectURL(l.src)
      return prev.filter((x) => x.id !== id)
    })
  }, [])

  const upload = React.useCallback(
    async (item: Local) => {
      const ctrl = controllers.current.get(item.id)
      if (!ctrl || ctrl.signal.aborted) return
      const { file } = item
      try {
        if (item.kind === "video") {
          const codec = await videoCodecOf(
            (o, l) => file.slice(o, o + l).arrayBuffer().then((b) => new Uint8Array(b)),
            file.size
          ).catch(() => {
            throw new Error(`${file.name}: file tidak bisa dibaca. Coba lagi.`)
          })
          const err = codecError(file.name, codec)
          if (err) return patch(item.id, { status: "error", error: err })
        }
        const start = await startUploadAction(cardId, {
          name: file.name,
          size: file.size,
          mime: file.type,
        })
        if ("error" in start || !start.data)
          return patch(item.id, {
            status: "error",
            error: "error" in start ? start.error : "Gagal memulai unggahan.",
          })
        await uploadToStorage(
          start.data,
          file,
          (pct) => patch(item.id, { progress: pct }),
          ctrl.signal
        )
        patch(item.id, { progress: 100 })
        const fin = await finishUploadAction(cardId, start.data.key, file.name)
        if ("error" in fin) return patch(item.id, { status: "error", error: fin.error })
        drop(item.id)
        router.refresh()
      } catch (e) {
        if (ctrl.signal.aborted) return
        patch(item.id, {
          status: "error",
          error: e instanceof Error ? e.message : "Gagal mengunggah. Coba lagi.",
        })
      }
    },
    [cardId, drop, patch, router]
  )

  const pump = React.useCallback(() => {
    while (running.current < MAX_PARALLEL && queue.current.length) {
      const next = queue.current.shift()!
      running.current++
      void upload(next).finally(() => {
        running.current--
        pump()
      })
    }
  }, [upload])

  function onAdd(files: { file: File; kind: MediaKind }[]) {
    const added: Local[] = files.map(({ file, kind }) => {
      const id = `${LOCAL}${crypto.randomUUID()}`
      controllers.current.set(id, new AbortController())
      return {
        id,
        file,
        name: file.name,
        size: file.size,
        kind,
        src: URL.createObjectURL(file),
        status: "uploading",
        progress: 0,
      }
    })
    setLocal((prev) => [...prev, ...added])
    queue.current.push(...added)
    pump()
  }

  const uploading = local.some((l) => l.status === "uploading")
  React.useEffect(() => {
    if (!uploading) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [uploading])

  React.useEffect(() => {
    const ctrls = controllers.current
    return () => {
      for (const c of ctrls.values()) c.abort()
      for (const l of localRef.current) if (l.src.startsWith("blob:")) URL.revokeObjectURL(l.src)
    }
  }, [])

  // Urutan: pilihan lokal sementara (optimistis) atau `position` dari server.
  const sorted = React.useMemo(() => {
    const byPos = [...media].sort((a, b) => a.position - b.position)
    if (!order) return byPos
    const rank = new Map(order.map((id, i) => [id, i]))
    return byPos.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
  }, [media, order])

  const thumbId = React.useMemo(() => {
    const eff = effectiveThumbnail(media, thumbnailMediaId)
    const url = (m: CardMedia) => (m.source === "file" ? mediaSrc(m.id) : embedThumb(m))
    return (
      media.find((m) => m.id === thumbnailMediaId && canBeThumbnail(m)) ??
      (eff ? sorted.find((m) => url(m) === eff) : undefined)
    )?.id
  }, [media, sorted, thumbnailMediaId])

  const serverItems: MediaUploadItem[] = sorted.map((m) =>
    m.source === "file"
      ? {
          id: String(m.id),
          name: m.originalName,
          size: m.size,
          kind: m.mediaKind,
          src: mediaSrc(m.id),
          status: "done",
          thumbnail: m.id === thumbId,
        }
      : {
          id: String(m.id),
          name: embedName(m),
          size: 0,
          kind: "image",
          src: embedThumb(m) ?? "",
          status: "done",
          source: "embed",
          provider: m.provider,
          href: m.url,
          thumbnail: m.id === thumbId,
        }
  )
  const items = [
    ...serverItems,
    ...local.map(({ file: _file, ...item }) => item),
  ]

  const lightboxItems: MediaItem[] = sorted.map((m) =>
    m.source === "file"
      ? {
          id: String(m.id),
          kind: m.mediaKind,
          src: mediaSrc(m.id),
          name: m.originalName,
          alt: m.originalName,
          downloadHref: `${mediaSrc(m.id)}?unduh=1`,
        }
      : {
          id: String(m.id),
          kind: "embed",
          src: "",
          name: embedName(m),
          alt: embedName(m),
          poster: embedThumb(m) ?? undefined,
          embedSrc: embedSrc(m) ?? undefined,
          href: embedSrc(m) ? undefined : m.url,
        }
  )

  function run(fn: () => ReturnType<typeof removeMediaAction>) {
    return fn().then((r) => {
      if ("error" in r) toast.error(r.error)
      else router.refresh()
      return r
    })
  }

  function onReorder(ids: string[]) {
    const next = ids.filter((i) => !i.startsWith(LOCAL)).map(Number)
    setOrder(next)
    void run(() => reorderMediaAction(cardId, next)).finally(() => setOrder(null))
  }

  function onRemove(id: string) {
    if (id.startsWith(LOCAL)) {
      controllers.current.get(id)?.abort()
      queue.current = queue.current.filter((q) => q.id !== id)
      drop(id)
      return
    }
    const m = items.find((i) => i.id === id)
    setRemoving({ id: Number(id), name: m?.name ?? "item ini", file: m?.source !== "embed" })
  }

  async function onEmbed(url: string) {
    const r = await addEmbedAction(cardId, url)
    if ("error" in r) return r.error
    router.refresh()
    return null
  }

  return (
    <>
      <MediaUpload
        items={items}
        disabled={disabled}
        maxFiles={MAX_MEDIA_ITEMS}
        onAdd={onAdd}
        onReorder={onReorder}
        onRemove={onRemove}
        onEmbed={onEmbed}
        onSetThumbnail={(id) => void run(() => setThumbnailAction(cardId, Number(id)))}
        onOpen={(id) => {
          const i = lightboxItems.findIndex((m) => m.id === id)
          if (i < 0) return
          setIndex(i)
          setOpen(true)
        }}
      />
      {lightboxItems.length > 0 && (
        <MediaLightbox
          items={lightboxItems}
          index={Math.min(index, lightboxItems.length - 1)}
          onIndexChange={setIndex}
          open={open}
          onOpenChange={setOpen}
        />
      )}
      <AlertDialog open={!!removing} onOpenChange={(next) => !next && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus “{removing?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.file
                ? "File ini ikut terhapus dari penyimpanan dan tidak bisa dikembalikan."
                : "Tautan dihapus dari kartu ini. Isi di penyedia aslinya tidak berubah."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removePending}>Batal</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={removePending}
              onClick={() =>
                startRemove(async () => {
                  if (removing) await run(() => removeMediaAction(cardId, removing.id))
                  setRemoving(null)
                })
              }
            >
              Hapus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
