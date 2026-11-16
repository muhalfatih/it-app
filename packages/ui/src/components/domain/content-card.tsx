import { CalendarIcon, LockIcon } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@workspace/ui/components/avatar"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/reui/badge"

type ContentStage = "ide" | "draft" | "review" | "disetujui" | "tayang"

const CONTENT_STAGE_LABEL: Record<ContentStage, string> = {
  ide: "Ide",
  draft: "Draft",
  review: "Review",
  disetujui: "Disetujui",
  tayang: "Telah Tayang",
}

type ContentCardProps = {
  title: string
  stage: ContentStage
  /** Sudah diformat, mis. "Kam, 20 Nov". */
  publishDate: string
  channels: string[]
  assignees: { name: string }[]
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

/** Kartu konten Kanban. Isi kartu terkunci sejak tahap Review (spesifikasi §6.4). */
function ContentCard({
  title,
  stage,
  publishDate,
  channels,
  assignees,
  thumbnailUrl,
  locked,
}: ContentCardProps) {
  return (
    // relative: label sr-only (absolute) tetap di dalam kartu, tidak melebarkan kontainer scroll
    <Card size="sm" className="relative">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- file konten dari server unit, bukan aset Next
        <img
          src={thumbnailUrl}
          alt=""
          className="aspect-video w-full object-cover"
        />
      ) : null}
      <CardHeader>
        <CardTitle className="line-clamp-2">{title}</CardTitle>
        <CardAction>
          {locked ? (
            <LockIcon
              aria-label="Isi kartu terkunci"
              className="text-muted-foreground"
            />
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-1">
        <Badge variant="primary-light">{CONTENT_STAGE_LABEL[stage]}</Badge>
        {channels.map((channel) => (
          <Badge key={channel} variant="outline">
            {channel}
          </Badge>
        ))}
      </CardContent>
      <CardFooter className="justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarIcon aria-hidden />
          <span className="sr-only">Tanggal tayang:</span>
          {publishDate}
        </span>
        <AvatarGroup>
          {assignees.map((person) => (
            <Avatar key={person.name} size="sm" title={person.name}>
              <AvatarFallback>{initials(person.name)}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      </CardFooter>
    </Card>
  )
}

export { CONTENT_STAGE_LABEL, ContentCard, type ContentStage }
