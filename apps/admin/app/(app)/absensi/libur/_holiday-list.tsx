"use client"

import * as React from "react"
import { CalendarIcon, PartyPopperIcon, Trash2Icon } from "lucide-react"
import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Pattern as DatePicker } from "@workspace/ui/components/examples/c-calendar-24"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { toDate, toIso } from "@/lib/date-value"

import { addHolidayAction, removeHolidayAction } from "./actions"

export function HolidayList({
  holidays,
}: {
  holidays: { date: string; name: string }[]
}) {
  const id = React.useId()
  const [date, setDate] = React.useState("")
  const [name, setName] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function add(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await addHolidayAction(date, name)
      if ("error" in result) return setError(result.error)
      setDate("")
      setName("")
      toast.success("Hari libur ditambahkan")
    })
  }

  function remove(d: string) {
    startTransition(async () => {
      const result = await removeHolidayAction(d)
      if ("error" in result) toast.error(result.error)
      else toast.success("Hari libur dihapus")
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <form
        onSubmit={add}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <Field className="sm:w-60">
          <FieldLabel id={`${id}-tanggal-label`} htmlFor={`${id}-tanggal`}>
            Tanggal
          </FieldLabel>
          <DatePicker
            id={`${id}-tanggal`}
            aria-labelledby={`${id}-tanggal-label ${id}-tanggal`}
            value={toDate(date)}
            onChange={(d) => setDate(toIso(d))}
          />
        </Field>
        <Field className="sm:max-w-sm">
          <FieldLabel htmlFor={`${id}-nama`}>Nama hari libur</FieldLabel>
          <Input
            id={`${id}-nama`}
            name="nama"
            autoComplete="off"
            placeholder="Contoh: Hari Raya Idulfitri…"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-describedby={error ? `${id}-error` : undefined}
            aria-invalid={error ? true : undefined}
          />
        </Field>
        <Button type="submit" disabled={pending}>
          Tambah
        </Button>
      </form>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead icon={CalendarIcon}>Tanggal</TableHead>
              <TableHead icon={PartyPopperIcon}>Nama</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Hapus</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="max-md:justify-center max-md:text-center">
                  <Empty className="border-0 p-6">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <PartyPopperIcon />
                      </EmptyMedia>
                      <EmptyTitle>Belum ada hari libur</EmptyTitle>
                      <EmptyDescription>
                        Tambahkan tanggal libur lewat formulir di atas.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((h) => (
                <TableRow key={h.date}>
                  <TableCell icon={CalendarIcon} data-label="Tanggal" className="whitespace-nowrap tabular-nums">
                    {format(parseISO(h.date), "EEE, d MMM yyyy", {
                      locale: localeId,
                    })}
                  </TableCell>
                  <TableCell icon={PartyPopperIcon} data-label="Nama">{h.name}</TableCell>
                  <TableCell data-label="Aksi">
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Hapus ${h.name}`}
                          />
                        }
                      >
                        <Trash2Icon />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus hari libur?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {h.name} ({h.date}) dihapus dari daftar libur.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(h.date)}>
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
