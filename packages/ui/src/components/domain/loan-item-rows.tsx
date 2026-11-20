"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@workspace/ui/components/reui/frame"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@workspace/ui/components/reui/number-field"
import { cn } from "@workspace/ui/lib/utils"

/** Alat yang bisa dipilih; `available` = sisa stok saat ini. */
type LoanOption = { id: number; name: string; brand: string; available: number }
/** `equipmentId` null = baris baru yang belum memilih alat. */
type LoanRow = { equipmentId: number | null; qty: number }

type LoanItemRowsProps = {
  rows: LoanRow[]
  options: LoanOption[]
  onChange: (rows: LoanRow[]) => void
  /** Batas jumlah baris; bawaan 20. */
  max?: number
}

// HP: alat + hapus, lalu jumlah. Desktop: satu baris.
const ROW =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_12rem_2.25rem]"

const optionLabel = (o: LoanOption) => `${o.name} · ${o.brand}`

/**
 * Baris alat di formulir peminjaman: pilih alat (combobox), jumlah (maks = sisa stok), hapus.
 * Alat yang sudah dipilih di baris lain tidak muncul lagi.
 */
function LoanItemRows({ rows, options, onChange, max = 20 }: LoanItemRowsProps) {
  const find = (id: number | null) => options.find((o) => o.id === id) ?? null
  const update = (index: number, patch: Partial<LoanRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  const incomplete = rows.filter((r) => r.equipmentId === null || r.qty < 1).length

  return (
    <Frame spacing="xs">
      <FrameHeader className="flex flex-row flex-wrap items-center gap-2">
        <FrameTitle>Alat dipinjam</FrameTitle>
        <Badge variant="outline" size="sm">
          {rows.length}
        </Badge>
        {incomplete > 0 ? (
          <Badge variant="warning-light" size="sm">
            {incomplete} belum lengkap
          </Badge>
        ) : null}
      </FrameHeader>
      <FramePanel className="p-0!">
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Belum ada alat. Tambahkan baris di bawah.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((row, index) => {
              const n = index + 1
              const selected = find(row.equipmentId)
              const choices = options.filter(
                (o) =>
                  o.id === row.equipmentId ||
                  !rows.some((r) => r.equipmentId === o.id)
              )
              return (
                <li key={index} className={cn(ROW, "px-3 py-2")}>
                  <Combobox
                    items={choices}
                    value={selected}
                    onValueChange={(o: LoanOption | null) =>
                      update(index, {
                        equipmentId: o?.id ?? null,
                        qty: o ? Math.min(Math.max(row.qty, 1), o.available) : row.qty,
                      })
                    }
                    itemToStringLabel={optionLabel}
                    itemToStringValue={(o: LoanOption) => String(o.id)}
                    isItemEqualToValue={(a: LoanOption, b: LoanOption) => a.id === b.id}
                  >
                    <ComboboxInput
                      aria-label={`Alat, baris ${n}`}
                      placeholder="Pilih alat…"
                      autoComplete="off"
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>Alat tidak ditemukan.</ComboboxEmpty>
                      <ComboboxList>
                        {(o: LoanOption) => (
                          <ComboboxItem key={o.id} value={o}>
                            <span className="min-w-0 flex-1 truncate">
                              {optionLabel(o)}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              Tersedia {o.available}
                            </span>
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus baris ${n}${selected ? `: ${selected.name}` : ""}`}
                    className="sm:order-last"
                    onClick={() => onChange(rows.filter((_, i) => i !== index))}
                  >
                    <Trash2Icon />
                  </Button>
                  <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                    <NumberField
                      min={1}
                      max={selected?.available}
                      step={1}
                      disabled={!selected}
                      value={row.qty || null}
                      onValueChange={(v) => update(index, { qty: v ?? 0 })}
                      className="w-40"
                    >
                      <NumberFieldGroup>
                        <NumberFieldDecrement aria-label={`Kurangi jumlah, baris ${n}`} />
                        <NumberFieldInput
                          aria-label={`Jumlah, baris ${n}`}
                          autoComplete="off"
                          className="w-14 text-center tabular-nums"
                        />
                        <NumberFieldIncrement aria-label={`Tambah jumlah, baris ${n}`} />
                      </NumberFieldGroup>
                    </NumberField>
                    {selected ? (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        maks {selected.available}
                      </span>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div className="border-t p-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            disabled={rows.length >= max}
            onClick={() => onChange([...rows, { equipmentId: null, qty: 1 }])}
          >
            <PlusIcon data-icon="inline-start" />
            {rows.length >= max ? `Maksimal ${max} alat` : "Tambah alat"}
          </Button>
        </div>
      </FramePanel>
    </Frame>
  )
}

export { LoanItemRows, type LoanOption, type LoanRow }
