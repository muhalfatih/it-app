"use client"

// Sama seperti grid-nya: tidak lewat React Compiler (state dibaca dari objek TanStack).
"use no memo"

import { useDataGrid } from "@workspace/ui/components/reui/data-grid/data-grid"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "cn"

const SIZES = [5, 10, 25, 50, 100]

/**
 * Pagination HP untuk DataGrid: info dan tombol sebelumnya/berikutnya dalam satu baris,
 * pilihan baris per halaman di baris kedua. Pakai bersama `hidden md:block` pada
 * DataGridPagination dan `md:hidden` di sini.
 */
function DataGridPaginationCompact({ className }: { className?: string }) {
  const { i18n, table, recordCount } = useDataGrid()

  const { pageIndex, pageSize } = table.state.pagination
  const pageCount = table.getPageCount()
  const from = recordCount === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, recordCount)

  return (
    <div
      data-slot="data-grid-pagination-compact"
      className={cn("flex flex-col gap-3 text-sm md:hidden", className)}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground tabular-nums">
          {i18n.labels.paginationInfo({ from, to, count: recordCount })}
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">{i18n.labels.previousPage}</span>
              <ChevronLeftIcon className="rtl:rotate-180" />
            </Button>
            <span className="min-w-12 text-center font-medium tabular-nums">
              {pageIndex + 1}/{pageCount}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">{i18n.labels.nextPage}</span>
              <ChevronRightIcon className="rtl:rotate-180" />
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">{i18n.labels.rowsPerPage}</span>
        <Select
          value={`${pageSize}`}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger
            aria-label={i18n.labels.rowsPerPage}
            className="w-fit min-w-16"
            size="sm"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            align="end"
            alignItemWithTrigger={false}
            className="min-w-(--anchor-width)"
          >
            {SIZES.map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export { DataGridPaginationCompact }
