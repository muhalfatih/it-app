"use client"

import * as React from "react"
import { toast } from "sonner"

import type { ContentStage } from "@workspace/db/schema/stages"
import { Button } from "@workspace/ui/components/button"
import { CONTENT_STAGE_LABEL } from "@workspace/ui/components/domain/content-card"

import { moveCardAction } from "../actions"
import { NoteDialog } from "../_note-dialog"

const FORWARD_LABEL: Partial<Record<ContentStage, string>> = {
  draft: "Pindahkan ke Draft",
  review: "Ajukan ke Review",
  disetujui: "Setujui",
}

export function StageActions({
  cardId,
  name,
  stage,
  forward,
  back,
}: {
  cardId: number
  name: string
  stage: ContentStage
  forward?: ContentStage
  back?: ContentStage
}) {
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function advance(to: ContentStage) {
    startTransition(async () => {
      const result = await moveCardAction(cardId, stage, to)
      if ("error" in result) toast.error(result.error)
      else toast.success(`Kartu dipindah ke ${CONTENT_STAGE_LABEL[to]}`)
    })
  }

  if (!forward && !back) return null
  return (
    <div className="flex flex-wrap gap-2">
      {back && (
        <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(true)}>
          Kembalikan ke {CONTENT_STAGE_LABEL[back]}
        </Button>
      )}
      {forward && (
        <Button type="button" disabled={pending} onClick={() => advance(forward)}>
          {FORWARD_LABEL[forward]}
        </Button>
      )}
      {back && (
        <NoteDialog
          open={open}
          onOpenChange={setOpen}
          title={`Kembalikan ke ${CONTENT_STAGE_LABEL[back]}?`}
          description={`“${name}” dikembalikan untuk revisi. Catatan tersimpan di riwayat kartu.`}
          label="Catatan revisi"
          confirmLabel="Kembalikan"
          onConfirm={async (note) => {
            const result = await moveCardAction(cardId, stage, back, note)
            if ("error" in result) return result.error
            toast.success(`Kartu dikembalikan ke ${CONTENT_STAGE_LABEL[back]}`)
            return null
          }}
        />
      )}
    </div>
  )
}
