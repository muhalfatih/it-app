"use client"

import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"
import { ButtonGroup } from "@workspace/ui/components/button-group"

/** Navigasi tanggal; client karena ButtonGroup memakai hook. nextHref null = sudah hari ini. */
export function DateNav({
  prevHref,
  nextHref,
  todayHref,
  title,
}: {
  prevHref: string
  nextHref: string | null
  todayHref: string
  title: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ButtonGroup>
        <Link
          href={prevHref}
          aria-label="Hari sebelumnya"
          className={buttonVariants({ variant: "outline", size: "icon" })}
        >
          <ChevronLeftIcon />
        </Link>
        {nextHref ? (
          <Link
            href={nextHref}
            aria-label="Hari berikutnya"
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <ChevronRightIcon />
          </Link>
        ) : null}
      </ButtonGroup>
      <Link href={todayHref} className={buttonVariants({ variant: "outline" })}>
        Hari ini
      </Link>
      <h2 className="ml-1 text-base font-medium">{title}</h2>
    </div>
  )
}
