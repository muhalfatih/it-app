import { cn } from "cn"

type MediaPlayerProps = {
  src: string
  kind: "image" | "video"
  alt: string
  poster?: string
  className?: string
}

/** Pemutar foto/video untuk review konten. Video memakai range request dari server (tanpa unduh penuh). */
function MediaPlayer({ src, kind, alt, poster, className }: MediaPlayerProps) {
  const frame = cn(
    "aspect-video w-full rounded-lg bg-muted object-contain",
    className
  )

  if (kind === "video") {
    return (
      <video
        src={src}
        poster={poster}
        controls
        preload="metadata"
        playsInline
        aria-label={alt}
        className={frame}
      >
        {alt}
      </video>
    )
  }

  // eslint-disable-next-line @next/next/no-img-element -- file konten dari server unit, bukan aset Next
  return <img src={src} alt={alt} className={frame} />
}

export { MediaPlayer }
