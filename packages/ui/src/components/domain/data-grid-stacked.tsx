"use client"

// Sama seperti grid-nya: tidak lewat React Compiler (baca state dari objek TanStack yang identitasnya tetap).
"use no memo"

import { flexRender } from "@tanstack/react-table"
import type { LucideIcon } from "lucide-react"
import { useDataGrid } from "@workspace/ui/components/reui/data-grid/data-grid"
import { Item, ItemContent, ItemGroup } from "@workspace/ui/components/item"
import { cn } from "cn"

/**
 * Tampilan HP untuk DataGrid: tiap baris jadi satu item vertikal "label: nilai".
 * Pakai bersama `hidden md:block` pada DataGridScrollArea dan `md:hidden` di sini.
 * Kolom tanpa meta.headerTitle (mis. pilih/aksi) tampil tanpa label.
 */
function DataGridStacked({ className }: { className?: string }) {
  const { table } = useDataGrid()
  const rows = table.getRowModel().rows

  if (rows.length === 0) return null

  return (
    <ItemGroup className={cn("gap-0 md:hidden", className)}>
      {rows.map((row) => (
        <Item key={row.id} size="sm"
          className="rounded-none border-0 border-b border-border px-4 py-5 last:border-b-0">
          <ItemContent className="w-full gap-2.5">
            {row.getVisibleCells().map((cell, i) => {
              const meta = cell.column.columnDef.meta as
                | { headerTitle?: string; icon?: LucideIcon }
                | undefined
              const label = meta?.headerTitle
              const Icon = meta?.icon
              const content = flexRender(
                cell.column.columnDef.cell,
                cell.getContext()
              )
              // Kolom pertama jadi judul item; label-nya tidak perlu diulang.
              if (i === 0) {
                return (
                  <div
                    key={cell.id}
                    className="min-w-0 pb-1 text-base leading-snug font-semibold text-foreground"
                  >
                    {content}
                  </div>
                )
              }
              return (
                <div
                  key={cell.id}
                  className="flex min-h-7 items-center justify-between gap-6 text-sm"
                >
                  {label && (
                    <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                      {Icon && <Icon aria-hidden className="size-3.5" />}
                      {label}
                    </span>
                  )}
                  <div className="min-w-0 text-right font-medium tabular-nums text-foreground">
                    {content}
                  </div>
                </div>
              )
            })}
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}

export { DataGridStacked }
