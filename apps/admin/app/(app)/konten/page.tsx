import type { Metadata } from "next"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"

import { requirePermission } from "@workspace/auth/session"

import { listBoard } from "@/lib/kanban/queries"

import { Board } from "./_board"

export const metadata: Metadata = { title: "Manajemen Konten" }

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function KontenPage({ searchParams }: Props) {
  const user = await requirePermission("kanban.lihat")
  const allPublished = (await searchParams).tayang === "semua"
  const cards = await listBoard({ allPublished })

  return (
    <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Manajemen Konten
        </h1>
        <p className="text-sm text-muted-foreground">
          Kartu dibuat dari entri Planner. Buka kartu untuk mengisi caption,
          mencentang kanal tayang, dan melihat riwayatnya.
        </p>
      </div>
      <Board
        cards={cards.map((c) => ({
          ...c,
          publishLabel: format(parseISO(c.publishDate), "EEE, d MMM", {
            locale: localeId,
          }),
        }))}
        permissions={[...user.permissions]}
        allPublished={allPublished}
      />
    </div>
  )
}
