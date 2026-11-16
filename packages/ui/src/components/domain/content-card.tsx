import {
  CalendarIcon,
  CircleCheckIcon,
  EyeIcon,
  LightbulbIcon,
  LockIcon,
  PencilLineIcon,
  RadioTowerIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/reui/badge"
import { Frame, FramePanel } from "@workspace/ui/components/reui/frame"

type ContentStage = "ide" | "draft" | "review" | "disetujui" | "tayang"

const CONTENT_STAGE_LABEL: Record<ContentStage, string> = {
  ide: "Ide",
  draft: "Draft",
  review: "Review",
  disetujui: "Disetujui",
  tayang: "Telah Tayang",
}

/** Ikon tiap tahap (dipakai di kepala kolom Kanban). */
const CONTENT_STAGE_ICON: Record<ContentStage, typeof LightbulbIcon> = {
  ide: LightbulbIcon,
  draft: PencilLineIcon,
  review: EyeIcon,
  disetujui: CircleCheckIcon,
  tayang: RadioTowerIcon,
}

type ContentCardProps = {
  title: string
  /** Sudah diformat, mis. "Kam, 20 Nov". */
  publishDate: string
  channels: string[]
  assignees: { id: string; name: string }[]
  thumbnailUrl?: string
  locked?: boolean
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

/**
 * Kartu konten Kanban (pola Frame c-kanban-3). Tahap ditunjukkan kolomnya, jadi tidak diulang di kartu.
 * Isi kartu terkunci sejak tahap Review (spesifikasi §6.4).
 */
function ContentCard({
  title,
  publishDate,
  channels,
  assignees,
  thumbnailUrl,
  locked,
}: ContentCardProps) {
  return (
    // relative: label sr-only (absolute) tetap di dalam kartu, tidak melebarkan kontainer scroll
    <Frame variant="ghost" spacing="sm" className="relative p-0">
      <FramePanel className="flex flex-col gap-2.5 p-3">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- file konten dari server unit, bukan aset Next
          <img
            src={thumbnailUrl}
            alt=""
            className="aspect-video w-full rounded-md object-cover"
          />
        ) : null}
        <div className="flex items-start gap-2">
          <span className="line-clamp-2 flex-1 text-sm font-medium">
            {title}
          </span>
          {locked ? (
            <LockIcon
              role="img"
              aria-label="Isi kartu terkunci"
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
            />
          ) : null}
        </div>
        {channels.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {channels.map((channel) => (
              <Badge key={channel} variant="outline" size="sm">
                {channel}
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 tabular-nums">
            <CalendarIcon aria-hidden className="size-3.5" />
            <span className="sr-only">Tanggal tayang:</span>
            {publishDate}
          </span>
          <AvatarGroup>
            {assignees.map((person) => (
              <Avatar key={person.id} size="sm" title={person.name}>
                <AvatarFallback>{initials(person.name)}</AvatarFallback>
              </Avatar>
            ))}
          </AvatarGroup>
          <span className="sr-only">
            Ditugaskan: {assignees.map((p) => p.name).join(", ")}
          </span>
        </div>
      </FramePanel>
    </Frame>
  )
}

export {
  CONTENT_STAGE_ICON,
  CONTENT_STAGE_LABEL,
  ContentCard,
  type ContentStage,
}
