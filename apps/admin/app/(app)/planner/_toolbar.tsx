"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
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

export function PlannerToolbar(props: PlannerToolbarProps) {
  const router = useRouter()
  const go = (href: string) => router.push(href)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Tampilan Planner">
          <ButtonGroup>
            {props.tabs.map((t) => (
              <Button
                key={t.value}
                variant={t.value === props.active ? "default" : "outline"}
                aria-current={t.value === props.active ? "page" : undefined}
                render={<Link href={t.href} />}
                nativeButton={false}
              >
                {t.label}
              </Button>
            ))}
          </ButtonGroup>
        </nav>
        {props.newHref && (
          <Button render={<Link href={props.newHref} />} nativeButton={false}>
            <PlusIcon data-icon="inline-start" />
            Entri baru
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <ButtonGroup>
            <Button
              variant="outline"
              size="icon"
              aria-label="Periode sebelumnya"
              render={<Link href={props.prevHref} />}
              nativeButton={false}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Periode berikutnya"
              render={<Link href={props.nextHref} />}
              nativeButton={false}
            >
              <ChevronRightIcon />
            </Button>
          </ButtonGroup>
          <Button
            variant="outline"
            render={<Link href={props.todayHref} />}
            nativeButton={false}
          >
            Hari ini
          </Button>
          <h2 className="ml-1 text-base font-medium tabular-nums">
            {props.title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:ml-auto">
          {props.rentang && (
            <ButtonGroup>
              <Button
                variant={props.rentang.active === "pekan" ? "default" : "outline"}
                aria-pressed={props.rentang.active === "pekan"}
                render={<Link href={props.rentang.pekanHref} />}
                nativeButton={false}
              >
                Pekan
              </Button>
              <Button
                variant={props.rentang.active === "bulan" ? "default" : "outline"}
                aria-pressed={props.rentang.active === "bulan"}
                render={<Link href={props.rentang.bulanHref} />}
                nativeButton={false}
              >
                Bulan
              </Button>
            </ButtonGroup>
          )}
          <div className="flex items-center gap-2">
            <Switch
              id="planner-saya"
              checked={props.saya}
              onCheckedChange={() => go(props.sayaHref)}
            />
            <Label htmlFor="planner-saya">Pekerjaan saya saja</Label>
          </div>
        </div>
      </div>
    </div>
  )
}
