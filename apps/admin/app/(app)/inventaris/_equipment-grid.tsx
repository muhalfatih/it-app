"use client"

import * as React from "react"
import { useTable, type ColumnDef } from "@tanstack/react-table"
import {
  BoxIcon,
  CircleCheckIcon,
  CircleDotIcon,
  HandHelpingIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  PowerOffIcon,
  SigmaIcon,
  TagIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"

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
import { DataGridHeader, gridMeta } from "@workspace/ui/components/domain/data-grid-header"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/reui/badge"
import { StatusBadge } from "@workspace/ui/components/domain/status-badge"
import {
  DataGrid,
  dataGridFeatures,
  type DataGridFeatures,
} from "@workspace/ui/components/reui/data-grid/data-grid"
import { DataGridStacked } from "@workspace/ui/components/domain/data-grid-stacked"
import { DataGridScrollArea } from "@workspace/ui/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@workspace/ui/components/reui/data-grid/data-grid-table"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@workspace/ui/components/reui/number-field"
import { Spinner } from "@workspace/ui/components/spinner"
import { DATA_GRID_I18N_ID } from "@workspace/ui/lib/i18n-id"

import type { EquipmentRow } from "@/lib/inventaris/queries"

import {
  createEquipmentAction,
  deleteEquipmentAction,
  setEquipmentActiveAction,
  updateEquipmentAction,
} from "./actions"

type Confirm = { kind: "toggle" | "delete"; row: EquipmentRow }

export function EquipmentGrid({ equipment }: { equipment: EquipmentRow[] }) {
  const [form, setForm] = React.useState<{
    open: boolean
    row: EquipmentRow | null
  }>({ open: false, row: null })
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)

  const columns = React.useMemo<ColumnDef<DataGridFeatures, EquipmentRow>[]>(
    () => [
      {
        id: "name",
        meta: gridMeta({ headerTitle: "Nama", icon: BoxIcon }),
        accessorKey: "name",
        header: ({ column }) => <DataGridHeader column={column} />,
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.name}
          </span>
        ),
        size: 200,
      },
      { id: "brand", meta: gridMeta({ headerTitle: "Merek", icon: TagIcon }), accessorKey: "brand", header: "Merek", size: 140 },
      {
        id: "total",
        meta: gridMeta({ headerTitle: "Jumlah", icon: SigmaIcon }),
        accessorKey: "total",
        header: ({ column }) => <DataGridHeader column={column} />,
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.total}</span>
        ),
        size: 90,
      },
      {
        id: "onLoan",
        meta: gridMeta({ headerTitle: "Dipinjam", icon: HandHelpingIcon }),
        accessorKey: "onLoan",
        header: ({ column }) => <DataGridHeader column={column} />,
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.onLoan}</span>
        ),
        size: 100,
      },
      {
        id: "unresolved",
        meta: gridMeta({ headerTitle: "Rusak/hilang", icon: TriangleAlertIcon }),
        accessorKey: "unresolved",
        header: ({ column }) => <DataGridHeader column={column} />,
        cell: ({ row }) =>
          row.original.unresolved > 0 ? (
            <StatusBadge variant="warning-light">{row.original.unresolved}</StatusBadge>
          ) : (
            <span className="tabular-nums">0</span>
          ),
        size: 120,
      },
      {
        id: "available",
        meta: gridMeta({ headerTitle: "Tersedia", icon: CircleCheckIcon }),
        accessorKey: "available",
        header: ({ column }) => <DataGridHeader column={column} />,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.available}
          </span>
        ),
        size: 100,
      },
      {
        id: "active",
        meta: gridMeta({ headerTitle: "Status", icon: CircleDotIcon }),
        accessorKey: "active",
        header: ({ column }) => <DataGridHeader column={column} />,
        cell: ({ row }) =>
          row.original.active ? (
            <StatusBadge variant="success-light">Aktif</StatusBadge>
          ) : (
            <StatusBadge variant="invert-light" icon={PowerOffIcon}>Nonaktif</StatusBadge>
          ),
        size: 100,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => {
          const r = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Aksi untuk ${r.name}`}
                  />
                }
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => setForm({ open: true, row: r })}
                  >
                    <PencilIcon />
                    Ubah
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setConfirm({ kind: "toggle", row: r })}
                  >
                    <PowerIcon />
                    {r.active ? "Nonaktifkan" : "Aktifkan"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirm({ kind: "delete", row: r })}
                  >
                    <Trash2Icon />
                    Hapus
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 56,
      },
    ],
    []
  )

  const table = useTable({
    features: dataGridFeatures,
    data: equipment,
    columns,
    getRowId: (row) => String(row.id),
  })

  return (
    <>
      <DataGrid
        table={table}
        recordCount={equipment.length}
        i18n={DATA_GRID_I18N_ID}
        tableLayout={{ headerBackground: false }}
        emptyMessage={
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageIcon />
              </EmptyMedia>
              <EmptyTitle>Belum ada alat</EmptyTitle>
            </EmptyHeader>
          </Empty>
        }
      >
        <Card className="w-full gap-0 p-0">
          <CardHeader className="px-4 py-3 max-md:grid-cols-1!">
            <CardTitle>Daftar alat</CardTitle>
            <CardAction className="max-md:col-start-1 max-md:row-span-1 max-md:row-start-3 max-md:mt-2 max-md:justify-self-start">
              <Button size="sm" onClick={() => setForm({ open: true, row: null })}>
                <PlusIcon data-icon="inline-start" />
                Tambah alat
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="border-t px-0">
            <DataGridScrollArea className="hidden md:block">
              <DataGridTable />
            </DataGridScrollArea>
            <DataGridStacked />
          </CardContent>
        </Card>
      </DataGrid>

      <EquipmentDialog
        key={
          form.row
            ? `${form.row.id}-${form.row.name}-${form.row.brand}-${form.row.total}`
            : "baru"
        }
        open={form.open}
        row={form.row}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
      />
      <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}

function EquipmentDialog({
  open,
  row,
  onClose,
}: {
  open: boolean
  row: EquipmentRow | null
  onClose: () => void
}) {
  const id = React.useId()
  const [name, setName] = React.useState(row?.name ?? "")
  const [brand, setBrand] = React.useState(row?.brand ?? "")
  const [total, setTotal] = React.useState<number | null>(row?.total ?? 1)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  // Dialog dipasang ulang per alat (key), tetapi tambah-berturutan perlu bersih.
  React.useEffect(() => {
    if (open && !row) {
      setName("")
      setBrand("")
      setTotal(1)
    }
    if (open) setError(null)
  }, [open, row])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const input = { name, brand, total }
    startTransition(async () => {
      const result = row
        ? await updateEquipmentAction(row.id, input)
        : await createEquipmentAction(input)
      if ("error" in result) setError(result.error)
      else onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{row ? "Ubah alat" : "Tambah alat"}</DialogTitle>
            <DialogDescription>
              Alat tanpa merek diisi tanda hubung (-).
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-nama`}>Nama alat</FieldLabel>
              <Input
                id={`${id}-nama`}
                name="nama"
                autoComplete="off"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-merek`}>Merek</FieldLabel>
              <Input
                id={`${id}-merek`}
                name="merek"
                autoComplete="off"
                required
                maxLength={80}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-jumlah`}>Jumlah</FieldLabel>
              <NumberField
                id={`${id}-jumlah`}
                min={1}
                step={1}
                value={total}
                onValueChange={setTotal}
              >
                <NumberFieldGroup>
                  <NumberFieldDecrement aria-label="Kurangi jumlah" />
                  <NumberFieldInput name="jumlah" autoComplete="off" />
                  <NumberFieldIncrement aria-label="Tambah jumlah" />
                </NumberFieldGroup>
              </NumberField>
            </Field>
          </FieldGroup>
          {error ? <FieldError>{error}</FieldError> : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Batal
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDialog({
  confirm,
  onClose,
}: {
  confirm: Confirm | null
  onClose: () => void
}) {
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()
  // Simpan nilai terakhir agar teks tidak kosong selama animasi tutup.
  const last = React.useRef<Confirm | null>(null)
  if (confirm) last.current = confirm
  const c = confirm ?? last.current

  function close() {
    setError(null)
    onClose()
  }

  function run() {
    if (!confirm) return
    setError(null)
    startTransition(async () => {
      const { kind, row } = confirm
      const result =
        kind === "delete"
          ? await deleteEquipmentAction(row.id)
          : await setEquipmentActiveAction(row.id, !row.active)
      if ("error" in result) setError(result.error)
      else close()
    })
  }

  const isDelete = c?.kind === "delete"
  return (
    <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDelete
              ? "Hapus alat?"
              : c?.row.active
                ? "Nonaktifkan alat?"
                : "Aktifkan alat?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDelete
              ? `${c?.row.name} dihapus dari daftar. Alat yang punya riwayat peminjaman tidak bisa dihapus.`
              : c?.row.active
                ? `${c?.row.name} tidak muncul lagi di pilihan peminjaman baru. Riwayat tetap terbaca.`
                : `${c?.row.name} bisa dipinjam lagi.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <FieldError>{error}</FieldError> : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <Button
            variant={isDelete ? "destructive" : "default"}
            onClick={run}
            disabled={pending}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {isDelete ? "Hapus" : c?.row.active ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
