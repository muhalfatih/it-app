"use client"

import * as React from "react"
import {
  CircleAlertIcon,
  CloudUploadIcon,
  ExternalLinkIcon,
  GripVerticalIcon,
  HardDriveIcon,
  LinkIcon,
  PlayIcon,
  StarIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
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
import {
  ACCEPT,
  MAX_MEDIA_SIZE,
  mediaKindOf,
  type MediaKind,
} from "@workspace/ui/lib/media-format"
import { cn } from "@workspace/ui/lib/utils"

const noop = () => () => {}

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
  /** "embed" = tautan YouTube/Drive/lain, bukan file di server. Bawaan "file". */
  source?: "file" | "embed"
  /** Penyedia sematan; dipakai bila `source` "embed". */
  provider?: "youtube" | "drive" | "tautan"
  /** Tautan asli sematan (untuk menampilkan domain). */
  href?: string
  /** Item ini jadi thumbnail kartu. */
  thumbnail?: boolean
}

const PROVIDER_LABEL = {
  youtube: "YouTube",
  drive: "Google Drive",
  tautan: "Tautan",
} as const

function domainOf(href?: string) {
  try {
    return href ? new URL(href).hostname.replace(/^www\./, "") : ""
  } catch {
    return ""
  }
}

function formatSize(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Sampul ubin sematan: YouTube pakai gambar sampul, Drive ikon, tautan lain domain + ikon tautan keluar. */
function EmbedCover({ item }: { item: MediaUploadItem }) {
  if (item.provider === "youtube" && item.src)
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- sampul dari penyedia */}
        <img
          src={item.src}
          alt=""
          className="pointer-events-none size-full object-cover"
        />
        <span className="pointer-events-none absolute inset-0 m-auto flex size-8 items-center justify-center rounded-full bg-invert/70 text-invert-foreground">
          <PlayIcon aria-hidden className="size-4 fill-current" />
        </span>
      </>
    )
  const domain = domainOf(item.href)
  return (
    <div className="pointer-events-none flex size-full flex-col items-center justify-center gap-1.5 p-2 text-center text-muted-foreground">
      {item.provider === "drive" ? (
        <HardDriveIcon aria-hidden className="size-6" />
      ) : item.provider === "youtube" ? (
        <PlayIcon aria-hidden className="size-6" />
      ) : (
        <ExternalLinkIcon aria-hidden className="size-5" />
      )}
      {item.provider !== "drive" && domain && (
        <span className="max-w-full truncate text-xs">{domain}</span>
      )}
    </div>
  )
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
  onEmbed,
  onSetThumbnail,
  onOpen,
  disabled = false,
  maxFiles = 10,
  maxSize = MAX_MEDIA_SIZE,
  className,
}: {
  items: MediaUploadItem[]
  /** Hanya berisi file yang lolos validasi format, ukuran, dan sisa slot. */
  onAdd: (files: { file: File; kind: MediaKind }[]) => void
  onReorder: (ids: string[]) => void
  onRemove: (id: string) => void
  /** Tambah sematan. Kembalikan null bila berhasil, atau pesan galat untuk ditampilkan di bawah kolom. Tanpa prop ini kolom tautan tidak muncul. */
  onEmbed?: (url: string) => Promise<string | null>
  /** Tanpa prop ini tombol ★ tidak muncul. Hanya foto dan YouTube yang bisa jadi thumbnail. */
  onSetThumbnail?: (id: string) => void
  /** Klik ubin yang sudah selesai (mis. membuka lightbox). */
  onOpen?: (id: string) => void
  /** Hanya lihat: area unggah, pegangan, hapus, dan ★ disembunyikan. */
  disabled?: boolean
  maxFiles?: number
  maxSize?: number
  className?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const [errors, setErrors] = React.useState<string[]>([])
  const [embedUrl, setEmbedUrl] = React.useState("")
  const [embedError, setEmbedError] = React.useState<string | null>(null)
  const [embedding, setEmbedding] = React.useState(false)
  const embedErrorId = React.useId()
  // dnd-kit membuat id aria berbeda di server dan klien (hydration mismatch); render grid setelah mount saja, seperti papan Kanban.
  const mounted = React.useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  // Ubin gagal tidak memakai slot: bisa dihapus atau dicoba ulang tanpa memblokir unggahan lain.
  const used = items.filter((item) => item.status !== "error").length
  const slots = maxFiles - used
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

  async function submitEmbed() {
    const url = embedUrl.trim()
    if (!url || embedding || !onEmbed) return
    setEmbedding(true)
    setEmbedError(null)
    try {
      const error = await onEmbed(url)
      if (error) setEmbedError(error)
      else setEmbedUrl("")
    } catch {
      setEmbedError("Tautan tidak bisa ditambahkan. Coba lagi.")
    } finally {
      setEmbedding(false)
    }
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
              {items.map((item) => {
                const embed = item.source === "embed"
                const canStar =
                  !disabled &&
                  !!onSetThumbnail &&
                  item.status === "done" &&
                  (embed ? item.provider === "youtube" : item.kind === "image")
                return (
                  <SortableItem
                    key={item.id}
                    value={item.id}
                    disabled={disabled}
                  >
                    <div className="group/tile flex min-w-0 flex-col gap-1.5">
                      <div
                        className={cn(
                          "relative aspect-[4/3] overflow-hidden rounded-md border bg-muted",
                          item.status === "error" && "border-destructive"
                        )}
                      >
                        {embed ? (
                          <EmbedCover item={item} />
                        ) : item.kind === "image" ? (
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
                        {!embed && item.kind === "video" && (
                          <Badge
                            variant="outline"
                            size="sm"
                            className="absolute start-2 bottom-2 bg-background/90"
                          >
                            <PlayIcon />
                            Video
                          </Badge>
                        )}

                        {onOpen && item.status === "done" && (
                          <button
                            type="button"
                            aria-label={`Buka ${item.name}`}
                            onClick={() => onOpen(item.id)}
                            className="absolute inset-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                          />
                        )}

                        {!disabled && (
                          <>
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
                          </>
                        )}
                        {canStar && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-pressed={!!item.thumbnail}
                            aria-label={`Jadikan thumbnail ${item.name}`}
                            onClick={() => onSetThumbnail(item.id)}
                            className={cn(
                              "absolute end-2 bottom-2 size-6 rounded-full",
                              !item.thumbnail && hidden
                            )}
                          >
                            <StarIcon
                              className={item.thumbnail ? "fill-current" : ""}
                            />
                          </Button>
                        )}

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
                        <span className="truncate text-xs text-muted-foreground tabular-nums">
                          {embed
                            ? PROVIDER_LABEL[item.provider ?? "tautan"]
                            : formatSize(item.size)}
                        </span>
                      </div>
                    </div>
                  </SortableItem>
                )
              })}
            </Sortable>
          ) : (
            <Skeleton className="h-44 w-full" />
          )}
        </div>
      )}

      {!disabled && (
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
                {used} dari {maxFiles} file
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
            {onEmbed && (
              <>
                <div className="flex w-full max-w-sm items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  atau
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="flex w-full max-w-sm flex-col gap-1.5 text-start">
                  <InputGroup>
                    <InputGroupAddon>
                      <LinkIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="url"
                      inputMode="url"
                      name="embed-url"
                      autoComplete="off"
                      spellCheck={false}
                      value={embedUrl}
                      disabled={full || embedding}
                      placeholder="Tempel tautan YouTube, Drive, atau lainnya"
                      aria-label="Tautan sematan"
                      aria-invalid={!!embedError}
                      aria-describedby={embedError ? embedErrorId : undefined}
                      onChange={(e) => {
                        setEmbedUrl(e.target.value)
                        setEmbedError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          void submitEmbed()
                        }
                      }}
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        variant="secondary"
                        disabled={full || embedding || !embedUrl.trim()}
                        onClick={() => void submitEmbed()}
                      >
                        {embedding ? "Menambah…" : "Tambah"}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  {embedError && (
                    <p
                      id={embedErrorId}
                      role="alert"
                      className="text-xs text-destructive"
                    >
                      {embedError}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!disabled && errors.length > 0 && (
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
