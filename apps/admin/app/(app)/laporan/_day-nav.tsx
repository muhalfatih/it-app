"use client"

import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"
import { ButtonGroup } from "@workspace/ui/components/button-group"

/**
 * Navigasi antar hari laporan. Client karena ButtonGroup memakai hook.
 * `base` = jalur halaman (mis. /laporan), `tanggal` dilampirkan sebagai query.
 */
export function DayNav({
  base,
  prev,
  next,
  today,
  title,
  extra = "",
}: {
  base: string
  prev: string | null
  next: string | null
  today: string
  title: string
  /** Query tambahan yang dipertahankan, mis. "" atau "&x=1". */
  extra?: string
}) {
  const href = (d: string) => `${base}?tanggal=${d}${extra}`
  const arrow = buttonVariants({ variant: "outline", size: "icon" })
  const disabled = `${arrow} pointer-events-none opacity-50`
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ButtonGroup>
        {prev ? (
          <Link href={href(prev)} aria-label="Hari laporan sebelumnya" className={arrow}>
            <ChevronLeftIcon />
          </Link>
        ) : (
          <span aria-hidden className={disabled}>
            <ChevronLeftIcon />
          </span>
        )}
        {next ? (
          <Link href={href(next)} aria-label="Hari laporan berikutnya" className={arrow}>
            <ChevronRightIcon />
          </Link>
        ) : (
          <span aria-hidden className={disabled}>
            <ChevronRightIcon />
          </span>
        )}
      </ButtonGroup>
      <Link href={href(today)} className={buttonVariants({ variant: "outline" })}>
        Hari ini
      </Link>
      <h2 className="ml-1 text-base font-medium">{title}</h2>
    </div>
  )
}
