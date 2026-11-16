"use client"

import * as React from "react"

import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { Pattern as FileUpload } from "@workspace/ui/components/examples/c-file-upload-5"
import {
  DateSelector,
  type DateSelectorValue,
} from "@workspace/ui/components/reui/date-selector"
import { TimePicker } from "@workspace/ui/components/reui/time-picker"
import { DATE_SELECTOR_I18N_ID } from "@workspace/ui/lib/i18n-id"

const KENDALA = [
  { value: "a", label: "a. Wifi #INSANTAMA tidak muncul/tidak terbaca" },
  { value: "b", label: "b. Tidak bisa terhubung ke #INSANTAMA" },
  { value: "c", label: "c. Username atau password salah/tidak tahu" },
  {
    value: "d",
    label:
      "d. Terhubung ke #INSANTAMA tetapi tidak bisa akses internet sama sekali",
  },
  {
    value: "e",
    label: "e. Terhubung ke #INSANTAMA tetapi akses internet lambat",
  },
  {
    value: "f",
    label:
      "f. Bisa akses internet, namun tidak dapat mengakses website atau aplikasi tertentu",
  },
]

const GEDUNG = [
  "Gedung A (SD)",
  "Gedung B (SMP)",
  "Gedung C (SMA)",
  "Aula",
  "Masjid",
]
const KANAL = ["YouTube", "Instagram", "Facebook", "WA Grup", "TV Display"]
const ABSENSI = ["Hadir", "Izin", "Izin Kegiatan", "Sakit", "Tanpa Keterangan"]

export function FormsDemo() {
  const [status, setStatus] = React.useState<string[]>(["TL"])
  const [time, setTime] = React.useState<string | null>("13:30")
  const [period, setPeriod] = React.useState<DateSelectorValue | undefined>()

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nama-kegiatan">Nama kegiatan</FieldLabel>
          <Input
            id="nama-kegiatan"
            placeholder="mis. Pentas Seni Akhir Semester"
          />
        </Field>
        <Field data-invalid>
          <FieldLabel htmlFor="wa">Nomor WA</FieldLabel>
          <Input id="wa" inputMode="tel" aria-invalid defaultValue="0812" />
          <FieldDescription>Nomor WA belum lengkap.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Jenis kendala</FieldLabel>
          <Select items={KENDALA}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih jenis kendala" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {KENDALA.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Gedung</FieldLabel>
          <Combobox items={GEDUNG}>
            <ComboboxInput placeholder="Cari gedung" />
            <ComboboxContent>
              <ComboboxEmpty>Gedung tidak ditemukan.</ComboboxEmpty>
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Field>
        <Field>
          <FieldLabel htmlFor="hambatan">Hambatan hari ini</FieldLabel>
          <Textarea id="hambatan" placeholder="Tulis hambatan, bila ada" />
        </Field>
        <Field>
          <FieldLabel>Waktu mulai terjadi</FieldLabel>
          <TimePicker value={time} onValueChange={setTime} />
        </Field>
        <Field>
          <FieldLabel>Periode rekap</FieldLabel>
          <DateSelector
            value={period}
            onChange={setPeriod}
            maxYear={2027}
            dayDateFormat="dd/MM/yyyy"
            i18n={DATE_SELECTOR_I18N_ID}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field orientation="horizontal">
          <Switch id="pekerjaan-saya" defaultChecked />
          <FieldLabel htmlFor="pekerjaan-saya">Pekerjaan saya saja</FieldLabel>
        </Field>
        <FieldSet>
          <FieldLegend variant="label">Status tugas</FieldLegend>
          <ToggleGroup
            value={status}
            onValueChange={setStatus}
            variant="outline"
          >
            <ToggleGroupItem value="T">Tuntas (T)</ToggleGroupItem>
            <ToggleGroupItem value="TL">Tindak Lanjut (TL)</ToggleGroupItem>
          </ToggleGroup>
        </FieldSet>
        <FieldSet>
          <FieldLegend variant="label">Tampilan Planner</FieldLegend>
          <ToggleGroup defaultValue={["daftar"]} variant="outline">
            <ToggleGroupItem value="daftar">Daftar</ToggleGroupItem>
            <ToggleGroupItem value="kalender">Kalender</ToggleGroupItem>
            <ToggleGroupItem value="partisi">Partisi</ToggleGroupItem>
          </ToggleGroup>
        </FieldSet>
        <FieldSet>
          <FieldLegend variant="label">Absensi</FieldLegend>
          <ToggleGroup
            defaultValue={["Hadir"]}
            variant="outline"
            className="flex-wrap"
          >
            {ABSENSI.map((a) => (
              <ToggleGroupItem key={a} value={a}>
                {a}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>
        <FieldSet>
          <FieldLegend variant="label">
            Apakah pengguna lain di ruangan mengalami hal yang sama?
          </FieldLegend>
          <RadioGroup defaultValue="tidak-tahu">
            {[
              ["ya", "Ya"],
              ["tidak", "Tidak"],
              ["tidak-tahu", "Tidak tahu"],
            ].map(([value, label]) => (
              <Field key={value} orientation="horizontal">
                <RadioGroupItem value={value} id={`lain-${value}`} />
                <FieldLabel htmlFor={`lain-${value}`}>{label}</FieldLabel>
              </Field>
            ))}
          </RadioGroup>
        </FieldSet>
        <FieldSet>
          <FieldLegend variant="label">Tayang per kanal</FieldLegend>
          {KANAL.map((kanal, i) => (
            <Field key={kanal} orientation="horizontal">
              <Checkbox id={`kanal-${kanal}`} defaultChecked={i < 2} />
              <FieldContent>
                <FieldLabel htmlFor={`kanal-${kanal}`}>{kanal}</FieldLabel>
                {i < 2 ? (
                  <FieldDescription>Wajib link postingan</FieldDescription>
                ) : null}
              </FieldContent>
            </Field>
          ))}
        </FieldSet>
        <Field>
          <FieldLabel>Konten (foto/video)</FieldLabel>
          <FileUpload />
        </Field>
      </FieldGroup>
    </div>
  )
}
