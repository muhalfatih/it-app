"use client"

import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon, PrinterIcon } from "lucide-react"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import { ButtonGroup } from "@workspace/ui/components/button-group"

export type PeriodLinks = {
  prev: string
  next: string | null
  today: string
  pekan: string
  bulan: string
}

/**
 * Navigasi periode (pekan/bulan) dan tombol cetak. Client karena ButtonGroup memakai hook
 * dan window.print. Kontrol disembunyikan saat dicetak; judul periode tetap tampil.
 */
export function PeriodBar({
  links,
  rentang,
  title,
}: {
  links: PeriodLinks
  rentang: "pekan" | "bulan"
  title: string
}) {
  const arrow = buttonVariants({ variant: "outline", size: "icon" })
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <ButtonGroup>
          <Link href={links.prev} aria-label="Periode sebelumnya" className={arrow}>
            <ChevronLeftIcon />
          </Link>
          {links.next ? (
            <Link href={links.next} aria-label="Periode berikutnya" className={arrow}>
              <ChevronRightIcon />
            </Link>
          ) : (
            <span aria-hidden className={`${arrow} pointer-events-none opacity-50`}>
              <ChevronRightIcon />
            </span>
          )}
        </ButtonGroup>
        <Link href={links.today} className={buttonVariants({ variant: "outline" })}>
          Hari ini
        </Link>
        <ButtonGroup>
          <Link
            href={links.pekan}
            aria-current={rentang === "pekan" ? "true" : undefined}
            className={buttonVariants({ variant: rentang === "pekan" ? "default" : "outline" })}
          >
            Pekan
          </Link>
          <Link
            href={links.bulan}
            aria-current={rentang === "bulan" ? "true" : undefined}
            className={buttonVariants({ variant: rentang === "bulan" ? "default" : "outline" })}
          >
            Bulan
          </Link>
        </ButtonGroup>
      </div>
      <h2 className="ml-1 text-base font-medium">{title}</h2>
      <Button
        type="button"
        variant="outline"
        className="ml-auto print:hidden"
        onClick={() => window.print()}
      >
        <PrinterIcon data-icon="inline-start" />
        Cetak / simpan PDF
      </Button>
    </div>
  )
}
