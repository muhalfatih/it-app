"use client"

import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ImageIcon,
  PlayIcon,
  RotateCcwIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Badge } from "@workspace/ui/components/reui/badge"
import { cn } from "@workspace/ui/lib/utils"

type MediaItem = {
  id: string
  kind: "image" | "video" | "embed"
  /** File foto/video. Untuk `kind` "embed" boleh kosong. */
  src: string
  /** Nama file, ditampilkan di lightbox. */
  name: string
  alt: string
  /** Gambar sampul video / thumbnail kecil (opsional). */
  poster?: string
  /** Sudah diformat, mis. "0:42". */
  duration?: string
  /** `kind` "embed": URL untuk iframe (mis. YouTube nocookie, Drive preview). */
  embedSrc?: string
  /** `kind` "embed" tanpa `embedSrc`: tautan yang dibuka di tab baru. */
  href?: string
  /** URL unduhan untuk foto/video (mis. endpoint yang menyetel nama file asli). Bawaan `src`. */
  downloadHref?: string
}

/** Gambar kecil item (strip lightbox dan galeri); sematan tanpa sampul memakai ikon. */
function ItemThumb({ item }: { item: MediaItem }) {
  const src = item.kind === "image" ? item.src : item.poster
  if (!src)
    return (
      <span className="flex size-full items-center justify-center bg-muted text-muted-foreground">
        {item.kind === "embed" ? (
          <ExternalLinkIcon aria-hidden className="size-4" />
        ) : (
          <PlayIcon aria-hidden className="size-4" />
        )}
      </span>
    )
  return (
    // eslint-disable-next-line @next/next/no-img-element -- thumbnail file konten
    <img src={src} alt="" className="size-full object-cover" />
  )
}

const KIND_LABEL = { image: "Foto", video: "Video", embed: "Tautan" } as const

const MIN_ZOOM = 1
const MAX_ZOOM = 5
const STEP = 1.25

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

/* ---------------- Gambar yang bisa diperbesar & digeser ---------------- */

type View = { scale: number; x: number; y: number }
const FIT: View = { scale: 1, x: 0, y: 0 }

function ZoomableImage({
  item,
  view,
  onViewChange,
}: {
  item: MediaItem
  view: View
  onViewChange: (view: View) => void
}) {
  const stageRef = React.useRef<HTMLDivElement>(null)
  const pointers = React.useRef(new Map<number, { x: number; y: number }>())
  const pinch = React.useRef<{ dist: number; scale: number } | null>(null)
  const [dragging, setDragging] = React.useState(false)

  // Geser dibatasi agar gambar tidak lepas dari bingkai.
  const bounded = React.useCallback((next: View): View => {
    const el = stageRef.current
    const scale = clamp(next.scale, MIN_ZOOM, MAX_ZOOM)
    if (!el || scale === 1) return { ...FIT, scale }
    const maxX = ((scale - 1) * el.clientWidth) / 2
    const maxY = ((scale - 1) * el.clientHeight) / 2
    return {
      scale,
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    }
  }, [])

  const distance = () => {
    const [a, b] = [...pointers.current.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative flex size-full touch-none items-center justify-center overflow-hidden select-none",
        view.scale > 1 && (dragging ? "cursor-grabbing" : "cursor-grab")
      )}
      onWheel={(e) =>
        onViewChange(
          bounded({
            ...view,
            scale: view.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1),
          })
        )
      }
      onDoubleClick={() =>
        onViewChange(view.scale > 1 ? FIT : bounded({ ...view, scale: 2.5 }))
      }
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pointers.current.size === 2)
          pinch.current = { dist: distance(), scale: view.scale }
        setDragging(true)
      }}
      onPointerMove={(e) => {
        const prev = pointers.current.get(e.pointerId)
        if (!prev) return
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pinch.current && pointers.current.size === 2) {
          const ratio = distance() / (pinch.current.dist || 1)
          onViewChange(bounded({ ...view, scale: pinch.current.scale * ratio }))
        } else if (view.scale > 1) {
          onViewChange(
            bounded({
              ...view,
              x: view.x + e.clientX - prev.x,
              y: view.y + e.clientY - prev.y,
            })
          )
        }
      }}
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId)
        if (pointers.current.size < 2) pinch.current = null
        if (pointers.current.size === 0) setDragging(false)
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId)
        pinch.current = null
        setDragging(false)
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- file konten dari server unit, bukan aset Next */}
      <img
        src={item.src}
        alt={item.alt}
        draggable={false}
        className={cn(
          "max-h-full max-w-full object-contain",
          !dragging &&
            "transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        )}
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
      />
    </div>
  )
}

/* ---------------- Lightbox ---------------- */

function MediaLightbox({
  items,
  index,
  onIndexChange,
  open,
  onOpenChange,
}: {
  items: MediaItem[]
  index: number
  onIndexChange: (index: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [view, setView] = React.useState<View>(FIT)
  const item = items[index]
  const isImage = item?.kind === "image"
  const [failedVideo, setFailedVideo] = React.useState<string | null>(null)

  const go = (next: number) => {
    setView(FIT)
    onIndexChange((next + items.length) % items.length)
  }
  const zoom = (factor: number) =>
    setView((v) =>
      v.scale * factor <= MIN_ZOOM
        ? FIT
        : { ...v, scale: clamp(v.scale * factor, MIN_ZOOM, MAX_ZOOM) }
    )

  if (!item) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setView(FIT)
        onOpenChange(next)
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="grid h-svh w-screen max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-none bg-invert p-0 text-invert-foreground ring-0 sm:max-w-none"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(index + 1)
          else if (e.key === "ArrowLeft") go(index - 1)
          else if (isImage && (e.key === "+" || e.key === "=")) zoom(STEP)
          else if (isImage && e.key === "-") zoom(1 / STEP)
          else if (isImage && e.key === "0") setView(FIT)
        }}
      >
        {/* Bilah atas: nama file, posisi, zoom, unduh, tutup */}
        <header className="flex items-center gap-2 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <DialogTitle className="truncate text-sm font-medium">
              {item.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-invert-foreground/70 tabular-nums">
              {index + 1} / {items.length} · {KIND_LABEL[item.kind]}
              {item.kind === "video" && item.duration
                ? ` · ${item.duration}`
                : ""}
            </DialogDescription>
          </div>
          {item.kind !== "embed" && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Unduh ${item.name}`}
              render={
                <a href={item.downloadHref ?? item.src} download={item.name} />
              }
              nativeButton={false}
            >
              <DownloadIcon />
            </Button>
          )}
          <DialogClose
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Tutup" />
            }
          >
            <XIcon />
          </DialogClose>
        </header>

        {/* Panggung media */}
        <div className="relative min-h-0 px-2 sm:px-14">
          {isImage ? (
            <ZoomableImage
              key={item.id}
              item={item}
              view={view}
              onViewChange={setView}
            />
          ) : item.kind === "embed" ? (
            item.embedSrc ? (
              <div className="flex size-full items-center justify-center">
                <iframe
                  key={item.id}
                  src={item.embedSrc}
                  title={item.name}
                  allow="fullscreen; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="aspect-video max-h-full w-full max-w-5xl rounded-lg border-0 bg-black"
                />
              </div>
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-invert-foreground/70">
                  Tautan ini tidak bisa ditampilkan di sini.
                </p>
                {item.href && (
                  <Button
                    variant="secondary"
                    render={
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                    nativeButton={false}
                  >
                    <ExternalLinkIcon data-icon="inline-start" />
                    Buka di tab baru
                  </Button>
                )}
              </div>
            )
          ) : failedVideo === item.id ? (
            <div
              role="alert"
              className="flex size-full flex-col items-center justify-center gap-3 text-center"
            >
              <p className="text-sm">
                Video ini tidak bisa diputar di browser ini.
              </p>
              <Button
                variant="secondary"
                render={
                  <a
                    href={item.downloadHref ?? item.src}
                    download={item.name}
                  />
                }
                nativeButton={false}
              >
                <DownloadIcon data-icon="inline-start" />
                Unduh
              </Button>
            </div>
          ) : (
            <div className="flex size-full items-center justify-center">
              <video
                key={item.id}
                onError={() => setFailedVideo(item.id)}
                src={item.src}
                poster={item.poster}
                controls
                autoPlay
                playsInline
                preload="metadata"
                aria-label={item.alt}
                className="max-h-full max-w-full rounded-lg"
              >
                {item.alt}
              </video>
            </div>
          )}
          {items.length > 1 ? (
            <>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Sebelumnya"
                className="absolute top-1/2 left-2 -translate-y-1/2"
                onClick={() => go(index - 1)}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Berikutnya"
                className="absolute top-1/2 right-2 -translate-y-1/2"
                onClick={() => go(index + 1)}
              >
                <ChevronRightIcon />
              </Button>
            </>
          ) : null}
        </div>

        {/* Strip thumbnail */}
        <footer className="flex flex-col gap-2 px-3 py-3">
          {isImage ? (
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Perkecil"
                disabled={view.scale <= MIN_ZOOM}
                onClick={() => zoom(1 / STEP)}
              >
                <ZoomOutIcon />
              </Button>
              <span
                aria-live="polite"
                className="w-12 text-center text-xs tabular-nums"
              >
                {Math.round(view.scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Perbesar"
                disabled={view.scale >= MAX_ZOOM}
                onClick={() => zoom(STEP)}
              >
                <ZoomInIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Kembalikan ukuran"
                disabled={view.scale === 1}
                onClick={() => setView(FIT)}
              >
                <RotateCcwIcon />
              </Button>
            </div>
          ) : null}
          {isImage ? (
            <p className="hidden text-center text-xs text-invert-foreground/70 sm:block">
              Gulir atau klik ganda untuk zoom · seret untuk menggeser · ← →
              untuk pindah
            </p>
          ) : null}
          <div className="flex justify-center gap-2 overflow-x-auto">
            {items.map((m, i) => (
              <button
                key={m.id}
                type="button"
                aria-label={`Lihat ${m.name}`}
                aria-current={i === index || undefined}
                onClick={() => go(i)}
                className={cn(
                  "relative size-12 shrink-0 overflow-hidden rounded-md opacity-60 ring-2 ring-transparent transition-opacity outline-none hover:opacity-100 focus-visible:ring-ring aria-current:opacity-100 aria-current:ring-invert-foreground"
                )}
              >
                <ItemThumb item={m} />
                {m.kind === "video" ? (
                  <PlayIcon
                    aria-hidden
                    className="absolute inset-0 m-auto size-4 fill-current text-invert-foreground"
                  />
                ) : null}
              </button>
            ))}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- Galeri thumbnail ---------------- */

/** Grid thumbnail foto/video; klik membuka lightbox (foto: zoom & geser, video: diputar). */
function MediaGallery({
  items,
  className,
}: {
  items: MediaItem[]
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [index, setIndex] = React.useState(0)

  return (
    <>
      <ul
        className={cn(
          "grid max-w-3xl grid-cols-3 gap-2 sm:grid-cols-4",
          className
        )}
      >
        {items.map((item, i) => (
          <li
            key={item.id}
            // Media pertama jadi sorotan 2x2.
            className={i === 0 ? "col-span-2 row-span-2" : undefined}
          >
            <button
              type="button"
              aria-label={`Buka ${KIND_LABEL[item.kind].toLowerCase()} ${item.name}`}
              onClick={() => {
                setIndex(i)
                setOpen(true)
              }}
              className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="block size-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 motion-reduce:transition-none">
                <ItemThumb item={item} />
              </span>
              {item.kind === "video" ||
              (item.kind === "embed" && item.poster) ? (
                <>
                  <span className="absolute inset-0 m-auto flex size-10 items-center justify-center rounded-full bg-invert/70 text-invert-foreground">
                    <PlayIcon aria-hidden className="size-4 fill-current" />
                  </span>
                  {item.kind === "video" && item.duration ? (
                    <Badge
                      variant="invert"
                      size="sm"
                      className="absolute right-1.5 bottom-1.5 tabular-nums"
                    >
                      {item.duration}
                    </Badge>
                  ) : null}
                </>
              ) : item.kind === "image" ? (
                <ImageIcon
                  aria-hidden
                  className="absolute right-2 bottom-2 size-3.5 text-invert-foreground opacity-0 drop-shadow transition-opacity group-hover:opacity-100"
                />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <MediaLightbox
        items={items}
        index={index}
        onIndexChange={setIndex}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

export { MediaGallery, MediaLightbox, type MediaItem }
