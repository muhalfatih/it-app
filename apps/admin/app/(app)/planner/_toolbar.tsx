"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react"

import { buttonVariants } from "@workspace/ui/components/button"
import { ButtonGroup } from "@workspace/ui/components/button-group"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"

type PlannerToolbarProps = {
  title: string
  tabs: { value: string; label: string; href: string }[]
  active: string
  prevHref: string
  nextHref: string
  todayHref: string
  rentang: { active: "pekan" | "bulan"; pekanHref: string; bulanHref: string } | null
  saya: boolean
  sayaHref: string
  newHref: string | null
}

/**
 * Tautan bergaya tombol: tetap <a> asli (tanpa role="button") supaya dibacakan sebagai tautan.
 * data-slot="button" agar ButtonGroup tetap menyatukan sudutnya.
 */
const linkButton = (
  variant: "default" | "outline",
  size?: "default" | "icon"
) => ({ "data-slot": "button", className: buttonVariants({ variant, size }) })

export function PlannerToolbar(props: PlannerToolbarProps) {
  const router = useRouter()
  const go = (href: string) => router.push(href)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Tampilan Planner">
          <ButtonGroup>
            {props.tabs.map((t) => (
              <Link
                key={t.value}
                href={t.href}
                aria-current={t.value === props.active ? "page" : undefined}
                {...linkButton(t.value === props.active ? "default" : "outline")}
              >
                {t.label}
              </Link>
            ))}
          </ButtonGroup>
        </nav>
        {props.newHref && (
          <Link href={props.newHref} {...linkButton("default")}>
            <PlusIcon data-icon="inline-start" />
            Entri baru
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <ButtonGroup>
            <Link
              href={props.prevHref}
              aria-label="Periode sebelumnya"
              {...linkButton("outline", "icon")}
            >
              <ChevronLeftIcon />
            </Link>
            <Link
              href={props.nextHref}
              aria-label="Periode berikutnya"
              {...linkButton("outline", "icon")}
            >
              <ChevronRightIcon />
            </Link>
          </ButtonGroup>
          <Link href={props.todayHref} {...linkButton("outline")}>
            Hari ini
          </Link>
          <h2 className="ml-1 text-base font-medium tabular-nums">
            {props.title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:ml-auto">
          {props.rentang && (
            <ButtonGroup>
              <Link
                href={props.rentang.pekanHref}
                aria-current={props.rentang.active === "pekan" ? "true" : undefined}
                {...linkButton(props.rentang.active === "pekan" ? "default" : "outline")}
              >
                Pekan
              </Link>
              <Link
                href={props.rentang.bulanHref}
                aria-current={props.rentang.active === "bulan" ? "true" : undefined}
                {...linkButton(props.rentang.active === "bulan" ? "default" : "outline")}
              >
                Bulan
              </Link>
            </ButtonGroup>
          )}
          {/* Label membungkus switch: seluruh baris (min 44px) jadi area sentuh. */}
          <Label htmlFor="planner-saya" className="min-h-11 cursor-pointer">
            <Switch
              id="planner-saya"
              checked={props.saya}
              onCheckedChange={() => go(props.sayaHref)}
            />
            Pekerjaan saya saja
          </Label>
        </div>
      </div>
    </div>
  )
}
