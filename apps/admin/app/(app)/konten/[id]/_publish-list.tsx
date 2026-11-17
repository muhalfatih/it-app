"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import type { CardChannel } from "@/lib/kanban/types"

import { checkChannelAction, uncheckChannelAction } from "../actions"
import { NoteDialog } from "../_note-dialog"

type Row = CardChannel & { checkedLabel: string | null }

/** Centang Tayang per kanal (spesifikasi §6.5). */
export function PublishList({
  cardId,
  channels,
  canCheck,
  canUncheck,
}: {
  cardId: number
  channels: Row[]
  canCheck: boolean
  canUncheck: boolean
}) {
  const [undo, setUndo] = React.useState<Row | null>(null)

  return (
    <div className="flex flex-col divide-y">
      {channels.map((c) => (
        <ChannelRow
          // key memuat status centang: baris dipasang ulang saat dibatalkan, jadi link/galat lama hilang.
          key={`${c.id}-${c.publication ? "on" : "off"}`}
          cardId={cardId}
          channel={c}
          canCheck={canCheck}
          canUncheck={canUncheck}
          onUncheck={() => setUndo(c)}
        />
      ))}
      <NoteDialog
        open={undo !== null}
        onOpenChange={(open) => !open && setUndo(null)}
        title={undo ? `Batalkan centang ${undo.name}?` : ""}
        description="Link yang tersimpan ikut dihapus. Bila kartu sudah Telah Tayang, kartu kembali ke Disetujui."
        label="Alasan pembatalan"
        confirmLabel="Batalkan centang"
        onConfirm={async (reason) => {
          if (!undo) return null
          const result = await uncheckChannelAction(cardId, undo.id, reason)
          if ("error" in result) return result.error
          toast.success(`Centang ${undo.name} dibatalkan`)
          return null
        }}
      />
    </div>
  )
}

function ChannelRow({
  cardId,
  channel: c,
  canCheck,
  canUncheck,
  onUncheck,
}: {
  cardId: number
  channel: Row
  canCheck: boolean
  canUncheck: boolean
  onUncheck: () => void
}) {
  const id = React.useId()
  const [url, setUrl] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()
  const checked = c.publication !== null

  function check() {
    setError(null)
    startTransition(async () => {
      const result = await checkChannelAction(cardId, c.id, url.trim() || null)
      if ("error" in result) setError(result.error)
      else toast.success(`${c.name} ditandai tayang`)
    })
  }

  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex min-h-11 flex-wrap items-center gap-3">
        <Checkbox
          id={id}
          checked={checked}
          disabled={pending || (checked ? !canUncheck : !canCheck)}
          onCheckedChange={(next) => (next ? check() : onUncheck())}
        />
        <Label htmlFor={id} className="font-medium">
          {c.name}
          {c.requiresLink && !checked && (
            <span className="font-normal text-muted-foreground"> (wajib link)</span>
          )}
        </Label>
        {checked && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            oleh {c.publication!.checkedByName}, {c.checkedLabel}
          </span>
        )}
      </div>
      {checked && c.publication!.url && (
        <a
          href={c.publication!.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-7 truncate text-sm text-primary underline-offset-4 hover:underline"
        >
          {c.publication!.url}
        </a>
      )}
      {!checked && canCheck && (
        <div className="ml-7 flex flex-col gap-1">
          <Input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={c.requiresLink ? "https://…" : "https://… (opsional)"}
            autoComplete="off"
            spellCheck={false}
            aria-label={`Link postingan ${c.name}`}
            aria-invalid={error ? true : undefined}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                check()
              }
            }}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
      {checked && canUncheck && (
        <Button type="button" variant="ghost" size="sm" className="ml-7 self-start" onClick={onUncheck}>
          Batalkan centang
        </Button>
      )}
    </div>
  )
}
