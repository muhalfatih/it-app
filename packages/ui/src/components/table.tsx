"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import type { LucideIcon } from "lucide-react"
import { cn } from "cn"

// stacked (default): di bawah md tiap baris jadi blok, sel tampil "label: nilai" dari data-label.
const tableVariants = cva("w-full caption-bottom text-sm", {
  variants: {
    layout: {
      stacked: [
        "max-md:block max-md:[&_thead]:hidden max-md:[&_tbody]:block max-md:[&_tfoot]:block",
        "max-md:[&_tr]:block max-md:[&_tr]:px-4 max-md:[&_tr]:py-5",
        "max-md:[&_td]:flex max-md:[&_td]:max-w-none max-md:[&_td]:items-baseline max-md:[&_td]:justify-between max-md:[&_td]:gap-6 max-md:[&_td]:px-0 max-md:[&_td]:min-h-7 max-md:[&_td]:py-1 max-md:[&_td]:text-right max-md:[&_td]:font-medium max-md:[&_td]:text-foreground max-md:[&_td]:whitespace-normal",
        "max-md:[&_td]:before:shrink-0 max-md:[&_td]:before:text-left max-md:[&_td]:before:font-normal max-md:[&_td]:before:text-muted-foreground max-md:[&_td]:before:content-[attr(data-label)]",
        "max-md:[&_td:not([data-label])]:before:hidden",
        // sel pertama jadi judul baris: tanpa label, rata kiri, sedikit lebih tegas
        "max-md:[&_td:first-child]:justify-start max-md:[&_td:first-child]:pb-2 max-md:[&_td:first-child]:text-left max-md:[&_td:first-child]:text-base max-md:[&_td:first-child]:font-semibold max-md:[&_td:first-child]:before:hidden",
      ],
      scroll: "",
    },
  },
  defaultVariants: { layout: "stacked" },
})

function Table({
  className,
  layout,
  ...props
}: React.ComponentProps<"table"> & VariantProps<typeof tableVariants>) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full",
        layout === "scroll" ? "overflow-x-auto" : "md:overflow-x-auto"
      )}
    >
      <table
        data-slot="table"
        className={cn(tableVariants({ layout }), className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/60 [&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/40 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

// numeric: kolom angka, rata kanan dengan tabular-nums.
// icon: ikon lucide dekoratif. Di TableHead tampil di header desktop; di TableCell tampil
// di label baris HP (disembunyikan di desktop dan di sel pertama yang jadi judul baris).
function TableHead({
  className,
  children,
  icon: Icon,
  numeric,
  ...props
}: React.ComponentProps<"th"> & { icon?: LucideIcon; numeric?: boolean }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-3 text-left align-middle text-sm font-semibold whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        numeric && "text-right tabular-nums",
        className
      )}
      {...props}
    >
      {Icon ? (
        <span className="inline-flex items-center gap-1.5">
          <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          {children}
        </span>
      ) : (
        children
      )}
    </th>
  )
}

function TableCell({
  className,
  children,
  icon: Icon,
  numeric,
  ...props
}: React.ComponentProps<"td"> & { icon?: LucideIcon; numeric?: boolean }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-3.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        numeric && "text-right tabular-nums",
        Icon && "max-md:relative max-md:pl-6!",
        className
      )}
      {...props}
    >
      {Icon && (
        <Icon
          aria-hidden
          data-slot="table-cell-icon"
          className="absolute top-2 left-0 size-3.5 text-muted-foreground md:hidden max-md:[td:first-child_&]:hidden"
        />
      )}
      {children}
    </td>
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
