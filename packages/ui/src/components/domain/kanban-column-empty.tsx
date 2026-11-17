import type { ContentStage } from "@workspace/ui/components/domain/content-card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { cn } from "@workspace/ui/lib/utils"

const COPY: Record<ContentStage, { title: string; description: string }> = {
  ide: {
    title: "Belum ada ide",
    description: "Kartu baru muncul di sini dari entri Planner.",
  },
  draft: {
    title: "Draft kosong",
    description:
      "Pindahkan kartu dari Ide saat caption dan materi mulai digarap.",
  },
  review: {
    title: "Tidak ada review",
    description: "Kartu yang menunggu persetujuan Direktur tampil di sini.",
  },
  disetujui: {
    title: "Belum ada yang disetujui",
    description: "Kartu siap tayang menunggu dicentang di tiap kanal.",
  },
  tayang: {
    title: "Belum ada yang tayang",
    description: "Kartu pindah ke sini otomatis saat semua kanal dicentang.",
  },
}

/** Keadaan kosong satu kolom Kanban; pesan menyesuaikan tahap, dan kolom Telah Tayang menyesuaikan rentang waktunya. */
function KanbanColumnEmpty({
  stage,
  showAll = true,
  className,
}: {
  stage: ContentStage
  /** Hanya untuk tahap `tayang`: false bila papan baru menampilkan 30 hari terakhir. */
  showAll?: boolean
  className?: string
}) {
  const { title, description } =
    stage === "tayang" && !showAll
      ? {
          title: "Tidak ada yang tayang",
          description:
            "Tidak ada dalam 30 hari terakhir. Pilih Semua untuk melihat yang lebih lama.",
        }
      : COPY[stage]

  return (
    <Empty className={cn("min-h-40 gap-2 border p-4", className)}>
      <EmptyHeader className="gap-1.5">
        <EmptyTitle className="text-sm">{title}</EmptyTitle>
        <EmptyDescription className="text-xs/relaxed">
          {description}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export { KanbanColumnEmpty }
