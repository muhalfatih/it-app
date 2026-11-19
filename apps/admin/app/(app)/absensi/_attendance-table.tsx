"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@workspace/db/schema/stages"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { saveAttendance } from "./actions"

const LABEL: Record<AttendanceStatus, string> = {
  hadir: "Hadir",
  izin: "Izin",
  izin_kegiatan: "Izin Kegiatan",
  sakit: "Sakit",
  tanpa_keterangan: "Tanpa Keterangan",
}
const ITEMS = ATTENDANCE_STATUSES.map((value) => ({
  value,
  label: LABEL[value],
}))

type Row = { id: string; name: string; status: AttendanceStatus | null }

export function AttendanceTable({
  date,
  rows,
  disabled,
}: {
  date: string
  rows: Row[]
  disabled: boolean
}) {
  const [values, setValues] = React.useState(
    () =>
      new Map<string, AttendanceStatus>(
        rows.map((r) => [r.id, r.status ?? "hadir"])
      )
  )
  const [busy, setBusy] = React.useState<string | null>(null)

  async function change(userId: string, status: AttendanceStatus) {
    const before = values.get(userId) ?? "hadir"
    setValues((m) => new Map(m).set(userId, status))
    setBusy(userId)
    const result = await saveAttendance(userId, date, status)
    setBusy(null)
    if ("error" in result) {
      setValues((m) => new Map(m).set(userId, before))
      toast.error(result.error)
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead className="w-64">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>
                <Select
                  items={ITEMS}
                  value={values.get(r.id) ?? "hadir"}
                  disabled={disabled || busy === r.id}
                  onValueChange={(v) =>
                    v && change(r.id, v as AttendanceStatus)
                  }
                >
                  <SelectTrigger
                    aria-label={`Status ${r.name}`}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ITEMS.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
