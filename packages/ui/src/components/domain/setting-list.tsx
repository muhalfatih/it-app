"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@workspace/ui/components/reui/frame"
import { Spinner } from "@workspace/ui/components/spinner"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

type SettingRow = { id: number; name: string; active: boolean; extra?: boolean }
type Patch = Partial<Omit<SettingRow, "id">>
type Result = { ok: true } | { error: string }

/**
 * Daftar Setting dengan editing inline: ubah nama langsung, nonaktifkan (tanpa hapus agar data lama
 * tetap utuh), dan satu kolom centang opsional (mis. "Wajib link" untuk kanal).
 */
function SettingList({
  title,
  description,
  rows,
  itemLabel = "item",
  extraLabel,
  onAdd,
  onUpdate,
}: {
  title: string
  description?: string
  rows: SettingRow[]
  /** Kata benda untuk placeholder & label aksesibel, mis. "kanal". */
  itemLabel?: string
  extraLabel?: string
  onAdd: (name: string, extra?: boolean) => Promise<Result>
  onUpdate: (id: number, patch: Patch) => Promise<Result>
}) {
  const formId = React.useId()
  const [draft, setDraft] = React.useState("")
  const [draftExtra, setDraftExtra] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [busy, setBusy] = React.useState<string | null>(null)
  const active = rows.filter((r) => r.active).length

  async function save(key: string, run: () => Promise<Result>) {
    setBusy(key)
    const result = await run()
    setBusy(null)
    setErrors((e) => {
      const next = { ...e }
      if ("error" in result) next[key] = result.error
      else delete next[key]
      return next
    })
    return "ok" in result
  }

  return (
    <Frame spacing="xs" className="w-full min-w-0">
      <FrameHeader className="flex flex-row flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <FrameTitle>{title}</FrameTitle>
          {description ? (
            <FrameDescription>{description}</FrameDescription>
          ) : null}
        </div>
        <Badge variant="outline" size="sm" className="tabular-nums">
          {active} aktif
        </Badge>
      </FrameHeader>
      <FramePanel className="p-0!">
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Belum ada {itemLabel}. Tambahkan di bawah.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => {
              const key = String(row.id)
              const error = errors[key]
              return (
                <li
                  key={row.id}
                  className={cn(
                    "flex flex-col gap-1 px-3 py-2",
                    !row.active && "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Input
                      defaultValue={row.name}
                      aria-label={`Nama ${itemLabel}`}
                      aria-invalid={error ? true : undefined}
                      className={cn(
                        "min-w-0 flex-1",
                        !row.active && "text-muted-foreground"
                      )}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur()
                        if (e.key === "Escape") {
                          e.currentTarget.value = row.name
                          e.currentTarget.blur()
                        }
                      }}
                      onBlur={(e) => {
                        const name = e.currentTarget.value.trim()
                        const input = e.currentTarget
                        if (name === row.name) return
                        void save(key, () => onUpdate(row.id, { name })).then(
                          (ok) => {
                            if (!ok) input.focus()
                          }
                        )
                      }}
                    />
                    {extraLabel ? (
                      <label className="flex shrink-0 items-center gap-2 text-sm">
                        <Checkbox
                          checked={row.extra ?? false}
                          onCheckedChange={(checked) =>
                            void save(key, () =>
                              onUpdate(row.id, { extra: checked === true })
                            )
                          }
                        />
                        <span className="hidden sm:inline">{extraLabel}</span>
                        <span className="sr-only sm:hidden">{extraLabel}</span>
                      </label>
                    ) : null}
                    <label className="flex shrink-0 items-center gap-2 text-sm">
                      <Switch
                        checked={row.active}
                        onCheckedChange={(checked) =>
                          void save(key, () =>
                            onUpdate(row.id, { active: checked })
                          )
                        }
                      />
                      <span className="w-16 text-muted-foreground">
                        {row.active ? "Aktif" : "Nonaktif"}
                      </span>
                    </label>
                    {busy === key ? <Spinner aria-label="Menyimpan" /> : null}
                  </div>
                  {error ? (
                    <p role="alert" className="text-xs text-destructive">
                      {error}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}

        <form
          id={formId}
          className="flex flex-col gap-1 border-t px-3 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            const name = draft.trim()
            if (!name) return
            void save("new", () => onAdd(name, draftExtra)).then((ok) => {
              if (ok) {
                setDraft("")
                setDraftExtra(false)
              }
            })
          }}
        >
          <div className="flex items-center gap-3">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Tambah ${itemLabel}…`}
              aria-label={`Nama ${itemLabel} baru`}
              aria-invalid={errors.new ? true : undefined}
              className="min-w-0 flex-1"
            />
            {extraLabel ? (
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <Checkbox
                  checked={draftExtra}
                  onCheckedChange={(c) => setDraftExtra(c === true)}
                />
                <span className="hidden sm:inline">{extraLabel}</span>
                <span className="sr-only sm:hidden">{extraLabel}</span>
              </label>
            ) : null}
            <Button
              type="submit"
              size="sm"
              disabled={!draft.trim() || busy === "new"}
            >
              {busy === "new" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              Tambah
            </Button>
          </div>
          {errors.new ? (
            <p role="alert" className="text-xs text-destructive">
              {errors.new}
            </p>
          ) : null}
        </form>
      </FramePanel>
    </Frame>
  )
}

export { SettingList, type SettingRow }
