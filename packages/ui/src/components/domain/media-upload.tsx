"use client"

import * as React from "react"
import {
  CircleAlertIcon,
  CloudUploadIcon,
  GripVerticalIcon,
  PlayIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/reui/alert"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "@workspace/ui/components/reui/sortable"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

const noop = () => () => {}

type MediaKind = "image" | "video"

type MediaUploadItem = {
  id: string
  name: string
  /** Ukuran dalam byte. */
  size: number
  kind: MediaKind
  /** URL pratinjau: object URL lokal saat mengunggah, URL server setelah selesai. */
  src: string
  status: "uploading" | "done" | "error"
  /** 0–100, dipakai saat `status` "uploading". */
  progress?: number
  error?: string
}

/** Batas dari rancangan Kanban putaran 2: JPG, PNG, WEBP, MP4, MOV, 500 MB per file. */
const MAX_MEDIA_SIZE = 500 * 1024 * 1024
const ACCEPT = ".jpg,.jpeg,.png,.webp,.mp4,.mov"

/** Menentukan jenis dari MIME, lalu dari ekstensi (MOV kadang tanpa MIME). Null bila tidak didukung. */
function mediaKindOf(file: File): MediaKind | null {
  if (["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "image"
  if (["video/mp4", "video/quicktime"].includes(file.type)) return "video"
  if (/\.(jpe?g|png|webp)$/i.test(file.name)) return "image"
  if (/\.(mp4|mov)$/i.test(file.name)) return "video"
  return null
}

function formatSize(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * Unggah media konten: grid yang bisa diurutkan, area seret-lepas, dan galat per file.
 * Terkontrol: pemanggil memegang `items`, mengunggah file yang lolos validasi (`onAdd`), dan memperbarui progres.
 * Pola dari `@reui/c-file-upload-8`.
 */
function MediaUpload({
  items,
  onAdd,
  onReorder,
  onRemove,
  maxFiles = 10,
  maxSize = MAX_MEDIA_SIZE,
  className,
}: {
  items: MediaUploadItem[]
  /** Hanya berisi file yang lolos validasi format, ukuran, dan sisa slot. */
  onAdd: (files: { file: File; kind: MediaKind }[]) => void
  onReorder: (ids: string[]) => void
  onRemove: (id: string) => void
  maxFiles?: number
  maxSize?: number
  className?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])
  // dnd-kit membuat id aria berbeda di server dan klien (hydration mismatch); render grid setelah mount saja, seperti papan Kanban.
  const mounted = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  const slots = maxFiles - items.length
  const full = slots <= 0

  function pick(list: FileList | File[]) {
    const accepted: { file: File; kind: MediaKind }[] = []
    const rejected: string[] = []
    for (const file of Array.from(list)) {
      const kind = mediaKindOf(file)
      if (!kind)
        rejected.push(
          `${file.name}: format tidak didukung. Pakai JPG, PNG, WEBP, MP4, atau MOV.`
        )
      else if (file.size > maxSize)
        rejected.push(`${file.name}: melebihi ${formatSize(maxSize)}.`)
      else if (accepted.length >= slots)
        rejected.push(`${file.name}: melebihi batas ${maxFiles} file.`)
      else accepted.push({ file, kind })
    }
    setErrors(rejected)
    if (accepted.length) onAdd(accepted)
  }

  const hidden =
    "opacity-0 group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 pointer-coarse:opacity-100"

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Seret pegangan di pojok kiri atas untuk mengubah urutan.
            </p>
          )}
          {mounted ? (
            <Sortable
              value={items.map((item) => item.id)}
              onValueChange={onReorder}
              getItemValue={(id) => id}
              strategy="grid"
              className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5"
            >
              {items.map((item) => (
                <SortableItem key={item.id} value={item.id}>
                  <div className="group/tile flex min-w-0 flex-col gap-1.5">
                    <div
                      className={cn(
                        "relative aspect-[4/3] overflow-hidden rounded-md border bg-muted",
                        item.status === "error" && "border-destructive"
                      )}
                    >
                      {item.kind === "image" ? (
                        // Nama file ada di keterangan di bawahnya, jadi gambar ini dekoratif.
                        <img
                          src={item.src}
                          alt=""
                          className="pointer-events-none size-full object-cover"
                        />
                      ) : (
                        <video
                          src={`${item.src}#t=0.1`}
                          muted
                          playsInline
                          preload="metadata"
                          className="pointer-events-none size-full object-cover"
                        />
                      )}
                      {item.kind === "video" && (
                        <Badge
                          variant="outline"
                          size="sm"
                          className="absolute start-2 bottom-2 bg-background/90"
                        >
                          <PlayIcon />
                          Video
                        </Badge>
                      )}

                      <SortableItemHandle
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={`Geser ${item.name} untuk mengubah urutan`}
                            className={cn(
                              "absolute start-2 top-2 size-6 rounded-full",
                              hidden
                            )}
                          />
                        }
                      >
                        <GripVerticalIcon />
                      </SortableItemHandle>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Hapus ${item.name}`}
                        onClick={() => onRemove(item.id)}
                        className={cn(
                          "absolute end-2 top-2 size-6 rounded-full",
                          hidden
                        )}
                      >
                        <XIcon />
                      </Button>

                      {item.status === "uploading" && (
                        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-background/90 p-2">
                          <span className="text-xs tabular-nums">
                            Mengunggah… {Math.round(item.progress ?? 0)}%
                          </span>
                          <Progress
                            value={item.progress ?? 0}
                            aria-label={`Progres unggah ${item.name}`}
                            className="[&_[data-slot=progress-track]]:h-1"
                          />
                        </div>
                      )}
                      {item.status === "error" && (
                        <div
                          role="alert"
                          className="absolute inset-x-0 bottom-0 flex items-start gap-1.5 bg-background/90 p-2 text-xs text-destructive"
                        >
                          <CircleAlertIcon className="mt-px size-3.5 shrink-0" />
                          {item.error ?? "Gagal mengunggah. Coba lagi."}
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span
                        className="truncate text-xs font-medium"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatSize(item.size)}
                      </span>
                    </div>
                  </div>
                </SortableItem>
              ))}
            </Sortable>
          ) : (
            <Skeleton className="h-44 w-full" />
          )}
        </div>
      )}

      <Card
        className={cn(
          "rounded-md border-dashed shadow-none transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragEnter={(e) => {
          e.preventDefault()
          if (!full) setDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null))
            setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!full) pick(e.dataTransfer.files)
        }}
      >
        <CardContent className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-8 items-center justify-center rounded-full border">
            <CloudUploadIcon className="size-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">
              {full
                ? `Batas ${maxFiles} file tercapai`
                : "Pilih file atau seret ke sini"}
            </p>
            <p className="text-xs text-muted-foreground">
              Foto JPG, PNG, WEBP atau video MP4, MOV. Maksimal{" "}
              {formatSize(maxSize)} per file.
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {items.length} dari {maxFiles} file
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            name="media"
            multiple
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              if (e.target.files) pick(e.target.files)
              e.target.value = "" // agar file yang sama bisa dipilih lagi
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={full}
            onClick={() => inputRef.current?.click()}
          >
            Pilih file
          </Button>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{errors.length} file tidak bisa ditambahkan</AlertTitle>
          <AlertDescription>
            <ul className="flex flex-col gap-0.5">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export {
  MAX_MEDIA_SIZE,
  MediaUpload,
  mediaKindOf,
  type MediaKind,
  type MediaUploadItem,
}
