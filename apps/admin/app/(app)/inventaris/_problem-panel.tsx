"use client"

import * as React from "react"
import Link from "next/link"
import { PackageCheckIcon } from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { FieldError } from "@workspace/ui/components/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@workspace/ui/components/item"
import { Badge } from "@workspace/ui/components/reui/badge"
import { Spinner } from "@workspace/ui/components/spinner"

import type { ProblemRow } from "@/lib/inventaris/queries"

import { resolveProblemAction } from "./actions"

const fmt = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
})

export function ProblemPanel({ problems }: { problems: ProblemRow[] }) {
  const [target, setTarget] = React.useState<ProblemRow | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function close() {
    setTarget(null)
    setError(null)
  }

  function resolve() {
    if (!target) return
    setError(null)
    startTransition(async () => {
      const result = await resolveProblemAction(
        target.loanId,
        target.equipmentId
      )
      if ("error" in result) setError(result.error)
      else close()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rusak atau hilang</CardTitle>
        <CardDescription className="max-w-prose">
          Pulihkan alat yang sudah berfungsi lagi agar stok bertambah. Untuk
          alat yang hilang permanen, turunkan jumlah di tabel atas lebih dulu,
          lalu Pulihkan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {problems.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageCheckIcon />
              </EmptyMedia>
              <EmptyTitle>Tidak ada alat bermasalah</EmptyTitle>
              <EmptyDescription>
                Alat yang dikembalikan dalam keadaan rusak atau hilang muncul
                di sini.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup>
            {problems.map((p) => (
              <Item key={`${p.loanId}-${p.equipmentId}`} variant="outline">
                <ItemContent>
                  <ItemTitle>
                    {p.equipmentName}
                    <Badge variant="warning-light">{p.problemQty} unit</Badge>
                  </ItemTitle>
                  <ItemDescription>{p.problemNote}</ItemDescription>
                  <ItemDescription>
                    <Link
                      href={`/inventaris/peminjaman/${p.loanId}`}
                      className="underline underline-offset-4"
                    >
                      {p.borrowerName}
                    </Link>
                    , dikembalikan {fmt.format(p.returnedAt)}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTarget(p)}
                  >
                    Pulihkan
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )}
      </CardContent>

      <AlertDialog open={target !== null} onOpenChange={(o) => !o && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan alat?</AlertDialogTitle>
            <AlertDialogDescription>
              {target
                ? `${target.problemQty} unit ${target.equipmentName} dihitung tersedia lagi.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <FieldError>{error}</FieldError> : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button onClick={resolve} disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Pulihkan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
