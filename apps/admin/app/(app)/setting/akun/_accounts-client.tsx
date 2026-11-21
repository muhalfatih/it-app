"use client"

import * as React from "react"
import {
  useTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table"
import {
  CircleAlertIcon,
  CopyIcon,
  KeyRoundIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  RefreshCwIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react"
import { toast } from "sonner"

import { ROLE_LABEL } from "@workspace/auth/permissions"
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
  InputGroupButton,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { DATA_GRID_I18N_ID } from "@workspace/ui/lib/i18n-id"

import {
  createAccountAction,
  createFromSimtamaAction,
  resetPasswordAction,
  searchSimtamaAction,
  setDisabledAction,
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
  mustChangePassword: boolean
  sso: boolean
  hasPassword: boolean
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

/** Kata sandi sementara yang mudah dibacakan (tanpa 0/O, 1/l/I). */
function randomPassword(length = 10) {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
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

/* ---------------- Kata sandi sementara ---------------- */

function TempPasswordField({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className="font-mono"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label="Buat kata sandi acak"
          onClick={() => onChange(randomPassword())}
        >
          <RefreshCwIcon />
        </InputGroupButton>
        <InputGroupButton
          size="icon-xs"
          aria-label="Salin kata sandi"
          disabled={!value}
          onClick={() =>
            navigator.clipboard
              .writeText(value)
              .then(() => toast.success("Kata sandi disalin"))
          }
        >
          <CopyIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
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

/* ---------------- Form akun (Sheet) ---------------- */

type FormValue = {
  username: string
  name: string
  password: string
  roles: Role[]
  bidang: Bidang[]
  unitId: number | null
}

function AccountSheet({
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
      password: randomPassword(),
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
            password: "",
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
          : await createAccountAction({
              ...profile,
              username: value.username,
              password: value.password,
            })
      if ("error" in result) {
        setError(result.error)
        return
      }
      reportResult(result, editing ? "Akun diperbarui" : "Akun dibuat")
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {editing ? `Ubah ${account.name}` : "Akun baru"}
          </SheetTitle>
          <SheetDescription>
            {editing
              ? "Perubahan peran berlaku saat halaman dimuat ulang oleh pemilik akun."
              : fromSimtama
                ? "Pilih pegawai dari direktori Simtama. Ia masuk dengan akun Simtama ID-nya, tanpa kata sandi baru."
                : "Berikan username dan kata sandi sementara ke pemilik akun. Ia wajib menggantinya saat login pertama."}
          </SheetDescription>
        </SheetHeader>
        <form
          id={formId}
          onSubmit={submit}
          className="flex-1 overflow-y-auto px-4 pb-4"
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
                  : "Buat akun manual (bukan pegawai Simtama)"}
              </Button>
            ) : null}
            {fromSimtama ? null : (
              <>
                <Field>
                  <FieldLabel htmlFor={`${formId}-username`}>
                    Username
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
                {!editing ? (
                  <Field>
                    <FieldLabel htmlFor={`${formId}-password`}>
                      Kata sandi sementara
                    </FieldLabel>
                    <TempPasswordField
                      id={`${formId}-password`}
                      value={value.password}
                      onChange={(password) => setValue({ ...value, password })}
                    />
                    <FieldDescription>Minimal 8 karakter.</FieldDescription>
                  </Field>
                ) : null}
              </>
            )}

            <FieldSet>
              <FieldLegend variant="label">Peran</FieldLegend>
              <FieldDescription>
                Boleh lebih dari satu. Tanpa peran = staf unit lain (hanya menu
                Layanan).
              </FieldDescription>
              <div className="flex flex-col gap-2">
                {ROLE_ORDER.map((role) => {
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
        <SheetFooter className="flex-row justify-end border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form={formId} disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {editing ? "Simpan perubahan" : "Buat akun"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/* ---------------- Atur ulang kata sandi ---------------- */

function ResetPasswordDialog({
  account,
  onOpenChange,
}: {
  account: Account | null
  onOpenChange: (open: boolean) => void
}) {
  const [password, setPassword] = React.useState("")
  const [pending, startTransition] = React.useTransition()
  React.useEffect(() => {
    if (account) setPassword(randomPassword())
  }, [account])

  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atur ulang kata sandi {account?.name}</DialogTitle>
          <DialogDescription>
            Semua sesi akun ini dikeluarkan. Berikan kata sandi sementara ini ke
            pemiliknya; ia wajib menggantinya saat login.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="reset-password">Kata sandi sementara</FieldLabel>
          <TempPasswordField
            id="reset-password"
            value={password}
            onChange={setPassword}
          />
        </Field>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
          <Button
            disabled={pending || password.length < 8}
            onClick={() =>
              startTransition(async () => {
                if (!account) return
                const result = await resetPasswordAction(account.id, password)
                if (reportResult(result, "Kata sandi diatur ulang")) {
                  onOpenChange(false)
                }
              })
            }
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Atur ulang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------- Tabel akun ---------------- */

function statusBadge(a: Account) {
  if (a.disabled) return <Badge variant="destructive-light">Nonaktif</Badge>
  if (a.mustChangePassword)
    return <Badge variant="warning-light">Belum ganti sandi</Badge>
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
  const [sheet, setSheet] = React.useState<{
    open: boolean
    account: Account | null
  }>({
    open: false,
    account: null,
  })
  const [resetFor, setResetFor] = React.useState<Account | null>(null)
  const [toggleFor, setToggleFor] = React.useState<Account | null>(null)
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
                    onClick={() => setSheet({ open: true, account: a })}
                  >
                    <PencilIcon />
                    Ubah
                  </DropdownMenuItem>
                  {a.hasPassword ? (
                    <DropdownMenuItem onClick={() => setResetFor(a)}>
                      <KeyRoundIcon />
                      Atur ulang kata sandi
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuGroup>
                {self ? null : (
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
                onClick={() => setSheet({ open: true, account: null })}
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

      <AccountSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        account={sheet.account}
        units={units}
        directory={directory}
      />
      <ResetPasswordDialog
        account={resetFor}
        onOpenChange={(open) => !open && setResetFor(null)}
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
    </>
  )
}
