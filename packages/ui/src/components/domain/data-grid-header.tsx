"use client"

// Sama seperti grid-nya: tidak lewat React Compiler (baca state dari objek TanStack).
"use no memo"

import type { ComponentProps } from "react"
import type { LucideIcon } from "lucide-react"

import type { DataGridColumnMeta } from "@workspace/ui/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@workspace/ui/components/reui/data-grid/data-grid-column-header"

/**
 * Meta kolom dengan `icon`: DataGridColumnMeta (di reui/) belum punya field itu, jadi lewat
 * helper ini supaya bertipe. Dibaca oleh DataGridHeader dan DataGridStacked.
 */
function gridMeta<TData = unknown>(
  meta: DataGridColumnMeta<TData> & { icon?: LucideIcon }
): DataGridColumnMeta<TData> {
  return meta
}

/**
 * Header kolom DataGrid dengan ikon dari `meta.icon` (satu sumber: DataGridStacked
 * memakai meta yang sama untuk label di HP). `icon` eksplisit menimpa meta.
 */
function DataGridHeader<TData extends object, TValue>({
  column,
  icon,
  ...props
}: Omit<ComponentProps<typeof DataGridColumnHeader<TData, TValue>>, "icon"> & {
  icon?: LucideIcon
}) {
  const meta = column.columnDef.meta as { icon?: LucideIcon } | undefined
  const Icon = icon ?? meta?.icon
  return (
    <DataGridColumnHeader
      column={column}
      icon={
        Icon ? (
          <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        ) : undefined
      }
      {...props}
    />
  )
}

export { DataGridHeader, gridMeta }
