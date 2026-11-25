"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  useTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table"
import {
  CircleAlertIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  CrownIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import { ROLE_LABEL } from "@workspace/auth/permissions"
import { withoutManager } from "@workspace/auth/rules"
import type { Bidang, Role } from "@workspace/db/schema/roles"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/reui/alert"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  DataGrid,
  dataGridFeatures,
  type DataGridFeatures,
} from "@workspace/ui/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@workspace/ui/components/reui/data-grid/data-grid-column-header"
import { DataGridPagination } from "@workspace/ui/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@workspace/ui/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@workspace/ui/components/reui/data-grid/data-grid-table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { DATA_GRID_I18N_ID } from "@workspace/ui/lib/i18n-id"

import {
  createAccountAction,
  createFromSimtamaAction,
  searchSimtamaAction,
  setDisabledAction,
  transferManagerAction,
  updateAccountAction,
  type ActionResult,
  type StaffResult,
} from "./actions"

type Account = {
  id: string
  username: string
  name: string
  roles: Role[]
  bidang: Bidang[]
  unitId: number | null
  disabled: boolean
  sso: boolean
  createdAt: string
}
type UnitOption = { id: number; name: string }

const ROLE_HINT: Record<Role, string> = {
  direktur: "Persetujuan akhir konten, melihat semua rekap.",
  manajer: "Mengelola unit, Setting, absensi, dan persetujuan.",
  sdm_strategi: "Mengisi Planner, memindahkan kartu Ide ke Draft.",
  sdm_khusus: "Pelaksana tugas dan pengisi laporan harian.",
}
const ROLE_ORDER: Role[] = ["manajer", "direktur", "sdm_strategi", "sdm_khusus"]
const BIDANG_LABEL: Record<Bidang, string> = { it: "IT", media: "Media" }
const NO_UNIT = "none"

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function reportResult(
  result: ActionResult | { error: string },
  success: string
) {
  if ("error" in result) {
    toast.error(result.error)
    return false
  }
  toast.success(success)
  return true
}

/* ---------------- Cari pegawai di Simtama ---------------- */

function StaffSearch({
  id,
  onPick,
}: {
  id: string
  onPick: (staff: StaffResult) => void
}) {
  const [query, setQuery] = React.useState("")
  const [result, setResult] = React.useState<{
    q: string
    rows?: StaffResult[]
    error?: string
  }>()
  const term = query.trim()

  React.useEffect(() => {
    if (term.length < 2) return
    let stale = false
    // Ditunda agar tidak memanggil Simtama di setiap ketukan.
    const timer = setTimeout(async () => {
      const r = await searchSimtamaAction(term)
      if (!stale) setResult({ q: term, ...r })
    }, 300)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [term])

  const current = result?.q === term ? result : undefined
  return (
    <Field>
      <FieldLabel htmlFor={id}>Pegawai</FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama atau username Simtama"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        {term.length >= 2 && !current ? (
          <InputGroupAddon align="inline-end">
            <Spinner />
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {current?.error ? (
        <FieldDescription className="text-destructive">
          {current.error}
        </FieldDescription>
      ) : current?.rows?.length === 0 ? (
        <FieldDescription>Tidak ada pegawai yang cocok.</FieldDescription>
      ) : current?.rows ? (
        <ul className="flex flex-col divide-y rounded-lg border">
          {current.rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                disabled={r.added}
                onClick={() => onPick(r)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="font-medium">
                  {r.name}
                  {r.added ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · sudah punya akun
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.username}
                  {r.unit ? ` · ${r.unit}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <FieldDescription>
          Akun masuk lewat Simtama ID; aksesnya di Simtama diberikan otomatis.
        </FieldDescription>
      )}
    </Field>
  )
}

/* ---------------- Form akun (Dialog) ---------------- */

type FormValue = {
  username: string
  name: string
  roles: Role[]
  bidang: Bidang[]
  unitId: number | null
}

function AccountDialog({
  open,
  onOpenChange,
  account,
  units,
  directory,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account | null
  units: UnitOption[]
  /** Direktori Simtama tersedia: akun baru dipilih dari sana, manual jadi cadangan. */
  directory: boolean
}) {
  const formId = React.useId()
  const editing = account !== null
  const [manual, setManual] = React.useState(!directory)
  const [picked, setPicked] = React.useState<StaffResult | null>(null)
  const fromSimtama = !editing && !manual
  const [value, setValue] = React.useState<FormValue>(() => blank())
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string>()

  function blank(): FormValue {
    return {
      username: "",
      name: "",
      roles: [],
      bidang: [],
      unitId: null,
    }
  }

  React.useEffect(() => {
    if (!open) return
    setError(undefined)
    setManual(!directory)
    setPicked(null)
    setValue(
      account
        ? {
            username: account.username,
            name: account.name,
            roles: account.roles,
            bidang: account.bidang,
            unitId: account.unitId,
          }
        : blank()
    )
  }, [open, account, directory])

  const isUnitStaff = value.roles.length > 0
  const unitItems = [
    { value: NO_UNIT, label: "Tidak ada" },
    ...units.map((u) => ({ value: String(u.id), label: u.name })),
  ]

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const profile = {
      name: value.name,
      roles: value.roles,
      bidang: isUnitStaff ? value.bidang : [],
      unitId: value.unitId,
    }
    if (fromSimtama && !picked) {
      setError("Pilih pegawai dari Simtama dulu.")
      return
    }
    startTransition(async () => {
      const result = editing
        ? await updateAccountAction(account.id, profile)
        : fromSimtama
          ? await createFromSimtamaAction({
              accountId: picked!.id,
              roles: profile.roles,
              bidang: profile.bidang,
              unitId: profile.unitId,
            })
          : await createAccountAction({ ...profile, username: value.username })
      if ("error" in result) {
        setError(result.error)
        return
      }
      reportResult(result, editing ? "Akun diperbarui" : "Akun dibuat")
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? `Ubah ${account.name}` : "Akun baru"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Perubahan peran berlaku saat halaman dimuat ulang oleh pemilik akun."
              : fromSimtama
                ? "Pilih pegawai dari direktori Simtama. Ia masuk dengan akun Simtama ID-nya, tanpa kata sandi baru."
                : "Isi username Simtama ID pemilik akun. Akun tertaut saat ia pertama kali masuk dengan Simtama ID; pastikan aksesnya ke aplikasi ini sudah diberikan di Simtama."}
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          onSubmit={submit}
          className="-mx-4 px-4 no-scrollbar max-h-[70vh] overflow-y-auto overscroll-contain py-1"
        >
          <FieldGroup>
            {fromSimtama ? (
              picked ? (
                <Field>
                  <FieldLabel>Pegawai</FieldLabel>
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                    <div className="flex min-w-0 flex-1 flex-col text-sm">
                      <span className="truncate font-medium">
                        {picked.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {picked.username}
                        {picked.unit ? ` · ${picked.unit}` : ""}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPicked(null)}
                    >
                      Ganti
                    </Button>
                  </div>
                </Field>
              ) : (
                <StaffSearch id={`${formId}-staff`} onPick={setPicked} />
              )
            ) : null}
            {!editing && directory ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="self-start px-0"
                onClick={() => {
                  setManual(!manual)
                  setError(undefined)
                }}
              >
                {manual
                  ? "Pilih dari direktori Simtama"
                  : "Daftarkan manual dengan username Simtama ID"}
              </Button>
            ) : null}
            {fromSimtama ? null : (
              <>
                <Field>
                  <FieldLabel htmlFor={`${formId}-username`}>
                    Username Simtama ID
                  </FieldLabel>
                  <Input
                    id={`${formId}-username`}
                    value={value.username}
                    onChange={(e) =>
                      setValue({ ...value, username: e.target.value })
                    }
                    disabled={editing}
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="mis. budi.s"
                    required
                  />
                  <FieldDescription>
                    {editing
                      ? "Username tidak bisa diubah."
                      : "3–30 karakter: huruf, angka, titik, atau garis bawah."}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${formId}-name`}>
                    Nama lengkap
                  </FieldLabel>
                  <Input
                    id={`${formId}-name`}
                    value={value.name}
                    onChange={(e) =>
                      setValue({ ...value, name: e.target.value })
                    }
                    autoComplete="off"
                    required
                  />
                </Field>
              </>
            )}

            <FieldSet>
              <FieldLegend variant="label">Peran</FieldLegend>
              <FieldDescription>
                Boleh lebih dari satu. Tanpa peran = staf unit lain (hanya menu
                Layanan). Manajer hanya satu; pindahkan lewat menu Jadikan
                Manajer di daftar akun.
              </FieldDescription>
              <div className="flex flex-col gap-2">
                {withoutManager(ROLE_ORDER).map((role) => {
                  const id = `${formId}-role-${role}`
                  return (
                    <FieldLabel key={role} htmlFor={id}>
                      <Field orientation="horizontal">
                        <Checkbox
                          id={id}
                          checked={value.roles.includes(role)}
                          onCheckedChange={(checked) =>
                            setValue({
                              ...value,
                              roles: checked
                                ? [...value.roles, role]
                                : value.roles.filter((r) => r !== role),
                            })
                          }
                        />
                        <FieldContent>
                          <FieldTitle>{ROLE_LABEL[role]}</FieldTitle>
                          <FieldDescription>{ROLE_HINT[role]}</FieldDescription>
                        </FieldContent>
                      </Field>
                    </FieldLabel>
                  )
                })}
              </div>
            </FieldSet>

            {isUnitStaff ? (
              <FieldSet>
                <FieldLegend variant="label">Bidang</FieldLegend>
                <ToggleGroup
                  multiple
                  variant="outline"
                  value={value.bidang}
                  onValueChange={(bidang) =>
                    setValue({ ...value, bidang: bidang as Bidang[] })
                  }
                  aria-label="Bidang"
                >
                  <ToggleGroupItem value="it">IT</ToggleGroupItem>
                  <ToggleGroupItem value="media">Media</ToggleGroupItem>
                </ToggleGroup>
              </FieldSet>
            ) : (
              <Field>
                <FieldLabel htmlFor={`${formId}-unit`}>Unit asal</FieldLabel>
                <Select
                  items={unitItems}
                  value={value.unitId ? String(value.unitId) : NO_UNIT}
                  onValueChange={(v) =>
                    setValue({
                      ...value,
                      unitId: v && v !== NO_UNIT ? Number(v) : null,
                    })
                  }
                >
                  <SelectTrigger id={`${formId}-unit`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {unitItems.map((u) => (
                        <SelectItem key={u.value} value={u.value}>
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {units.length === 0
                    ? "Daftar unit masih kosong; isi di Setting → Unit & gedung."
                    : "Dipakai sebagai unit pengaju di Pengajuan SDM."}
                </FieldDescription>
              </Field>
            )}
          </FieldGroup>
          {error ? (
            <Alert variant="destructive" className="mt-6">
              <CircleAlertIcon />
              <AlertTitle>Belum tersimpan</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form={formId} disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {editing ? "Simpan perubahan" : "Buat akun"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- Tabel akun ---------------- */

function statusBadge(a: Account) {
  if (a.disabled) return <Badge variant="destructive-light">Nonaktif</Badge>
  // Akun manual yang pemiliknya belum pernah masuk dengan Simtama ID.
  if (!a.sso) return <Badge variant="warning-light">Belum masuk</Badge>
  return <Badge variant="success-light">Aktif</Badge>
}

export function AccountsClient({
  accounts,
  units,
  currentUserId,
  directory,
}: {
  accounts: Account[]
  units: UnitOption[]
  currentUserId: string
  directory: boolean
}) {
  const [dialog, setDialog] = React.useState<{
    open: boolean
    account: Account | null
  }>({
    open: false,
    account: null,
  })
  const [toggleFor, setToggleFor] = React.useState<Account | null>(null)
  const [transferTo, setTransferTo] = React.useState<Account | null>(null)
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "name", desc: false },
  ])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const unitName = React.useMemo(
    () => new Map(units.map((u) => [u.id, u.name])),
    [units]
  )

  const columns = React.useMemo<ColumnDef<DataGridFeatures, Account>[]>(
    () => [
      {
        accessorKey: "name",
        id: "name",
        header: ({ column }) => (
          <DataGridColumnHeader title="Akun" column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback>{initials(row.original.name)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">
                {row.original.name}
                {row.original.id === currentUserId ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    (Anda)
                  </span>
                ) : null}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {row.original.username}
                {row.original.sso ? " · Simtama ID" : ""}
              </span>
            </div>
          </div>
        ),
        size: 240,
        enableSorting: true,
      },
      {
        id: "roles",
        header: "Peran",
        cell: ({ row }) =>
          row.original.roles.length ? (
            <div className="flex flex-wrap gap-1">
              {ROLE_ORDER.filter((r) => row.original.roles.includes(r)).map(
                (r) => (
                  <Badge key={r} variant="primary-light" size="sm">
                    {ROLE_LABEL[r]}
                  </Badge>
                )
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              Staf unit lain
            </span>
          ),
        size: 220,
      },
      {
        id: "bidang",
        header: "Bidang / unit",
        cell: ({ row }) => {
          const a = row.original
          if (a.roles.length)
            return a.bidang.length ? (
              <span className="text-sm">
                {a.bidang.map((b) => BIDANG_LABEL[b]).join(" & ")}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Belum diatur
              </span>
            )
          return (
            <span className="text-sm">
              {a.unitId ? (unitName.get(a.unitId) ?? "—") : "—"}
            </span>
          )
        },
        size: 140,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => statusBadge(row.original),
        size: 150,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => {
          const a = row.original
          const self = a.id === currentUserId
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Aksi untuk ${a.name}`}
                  />
                }
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => setDialog({ open: true, account: a })}
                  >
                    <PencilIcon />
                    Ubah
                  </DropdownMenuItem>
                  {self || a.disabled || a.roles.includes("manajer") ? null : (
                    <DropdownMenuItem onClick={() => setTransferTo(a)}>
                      <CrownIcon />
                      Jadikan Manajer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                {/* Manajer tidak bisa dinonaktifkan (pindahkan perannya dulu). */}
                {self || a.roles.includes("manajer") ? null : (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant={a.disabled ? "default" : "destructive"}
                      onClick={() => setToggleFor(a)}
                    >
                      <PowerIcon />
                      {a.disabled ? "Aktifkan" : "Nonaktifkan"}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 56,
      },
    ],
    [currentUserId, unitName]
  )

  const table = useTable({
    features: dataGridFeatures,
    data: accounts,
    columns,
    getRowId: (row) => row.id,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  })

  const active = accounts.filter((a) => !a.disabled)
  const unitStaff = active.filter((a) => a.roles.length > 0).length

  return (
    <>
      <DataGrid
        table={table}
        recordCount={accounts.length}
        i18n={DATA_GRID_I18N_ID}
        tableLayout={{ headerBackground: false }}
        emptyMessage={
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <UsersIcon aria-hidden className="size-5" />
            Belum ada akun.
          </div>
        }
      >
        <Card className="w-full gap-0 p-0">
          <CardHeader className="px-4 py-3">
            <CardTitle>Daftar akun</CardTitle>
            <CardDescription>
              {active.length} aktif · {unitStaff} staf unit ·{" "}
              {active.length - unitStaff} staf unit lain
            </CardDescription>
            <CardAction>
              <Button
                size="sm"
                onClick={() => setDialog({ open: true, account: null })}
              >
                <PlusIcon data-icon="inline-start" />
                Akun baru
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="border-y px-0">
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </CardContent>
          <CardFooter className="border-none bg-transparent! px-4 py-2.5">
            <DataGridPagination />
          </CardFooter>
        </Card>
      </DataGrid>

      <AccountDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}
        account={dialog.account}
        units={units}
        directory={directory}
      />
      <AlertDialog
        open={toggleFor !== null}
        onOpenChange={(open) => !open && setToggleFor(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleFor?.disabled ? "Aktifkan" : "Nonaktifkan"} akun{" "}
              {toggleFor?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleFor?.disabled
                ? "Pemilik akun bisa login lagi."
                : "Pemilik akun langsung dikeluarkan dari semua perangkat dan tidak bisa login. Data dan riwayatnya tetap tersimpan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={toggleFor?.disabled ? "default" : "destructive"}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (!toggleFor) return
                  const disable = !toggleFor.disabled
                  const result = await setDisabledAction(toggleFor.id, disable)
                  if (
                    reportResult(
                      result,
                      disable ? "Akun dinonaktifkan" : "Akun diaktifkan"
                    )
                  ) {
                    setToggleFor(null)
                  }
                })
              }
            >
              {toggleFor?.disabled ? "Aktifkan" : "Nonaktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={transferTo !== null}
        onOpenChange={(open) => !open && setTransferTo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Jadikan {transferTo?.name} Manajer?</AlertDialogTitle>
            <AlertDialogDescription>
              Manajer hanya satu. Peran Manajer Anda pindah ke{" "}
              {transferTo?.name}, dan Anda tidak bisa membuka Setting lagi.
              Peran Anda yang lain tetap. Hanya Manajer baru yang bisa
              mengembalikannya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (!transferTo) return
                  const result = await transferManagerAction(transferTo.id)
                  if (
                    reportResult(
                      result,
                      `${transferTo.name} sekarang Manajer`
                    )
                  ) {
                    setTransferTo(null)
                    // Setting hanya untuk Manajer; halaman ini tidak berlaku lagi bagi Anda.
                    router.replace("/")
                  }
                })
              }
            >
              Jadikan Manajer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
