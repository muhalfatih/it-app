"use client"

import * as React from "react"
import {
  BellIcon,
  BuildingIcon,
  ClockIcon,
  FilterIcon,
  MessageSquareTextIcon,
  SendIcon,
  WifiIcon,
} from "lucide-react"

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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  DateSelector,
  type DateSelectorValue,
} from "@workspace/ui/components/reui/date-selector"
import { TimePicker } from "@workspace/ui/components/reui/time-picker"
import { Pattern as FileUpload } from "@workspace/ui/components/examples/c-file-upload-5"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"
import { DATE_SELECTOR_I18N_ID } from "@workspace/ui/lib/i18n-id"

const GEDUNG = [
  { value: "a", label: "Gedung A (SD)" },
  { value: "b", label: "Gedung B (SMP)" },
  { value: "c", label: "Gedung C (SMA)" },
  { value: "aula", label: "Aula" },
]

const KENDALA = [
  {
    value: "a",
    title: "Wifi #INSANTAMA tidak muncul",
    desc: "Jaringan tidak terbaca di daftar wifi.",
  },
  {
    value: "b",
    title: "Tidak bisa terhubung",
    desc: "Jaringan terlihat, tetapi gagal tersambung.",
  },
  {
    value: "c",
    title: "Username/password salah",
    desc: "Akun ditolak atau lupa kata sandi.",
  },
  {
    value: "d",
    title: "Terhubung tanpa internet",
    desc: "Tersambung ke #INSANTAMA tetapi tidak bisa akses internet sama sekali.",
  },
  {
    value: "e",
    title: "Internet lambat",
    desc: "Tersambung dan bisa akses, tetapi sangat lambat.",
  },
  {
    value: "f",
    title: "Situs/aplikasi tertentu tidak bisa",
    desc: "Internet jalan, hanya website atau aplikasi tertentu yang gagal.",
  },
]

/* ---------------- Form 1: Pengaduan Internet ---------------- */

function ComplaintForm() {
  const [kendala, setKendala] = React.useState("d")
  const [lain, setLain] = React.useState<string[]>(["tidak-tahu"])
  const [time, setTime] = React.useState<string | null>("07:45")
  const [desc, setDesc] = React.useState("")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WifiIcon aria-hidden className="size-4 text-muted-foreground" />
          Pengaduan Internet
        </CardTitle>
        <CardDescription>
          Bahan evaluasi layanan internet sekolah. Tidak ada status lanjutan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Lokasi</FieldLegend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="gedung">
                  Gedung <span className="text-destructive">*</span>
                </FieldLabel>
                <Select items={GEDUNG} defaultValue="b">
                  <SelectTrigger id="gedung" className="w-full">
                    <SelectValue placeholder="Pilih gedung" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {GEDUNG.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid>
                <FieldLabel htmlFor="ruang">
                  Ruangan/Kelas <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="ruang"
                  aria-invalid
                  placeholder="mis. Lab Komputer 2"
                />
                <FieldDescription>Ruangan wajib diisi.</FieldDescription>
              </Field>
            </div>
          </FieldSet>

          <FieldSeparator />

          <FieldSet>
            <FieldLegend>Jenis kendala</FieldLegend>
            <FieldDescription>Pilih yang paling mendekati.</FieldDescription>
            <RadioGroup
              value={kendala}
              onValueChange={(v) => setKendala(String(v))}
              className="grid gap-2 sm:grid-cols-2"
            >
              {KENDALA.map((k) => (
                <FieldLabel key={k.value} htmlFor={`kendala-${k.value}`}>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>
                        <span className="text-muted-foreground">
                          {k.value}.
                        </span>{" "}
                        {k.title}
                      </FieldTitle>
                      <FieldDescription>{k.desc}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem value={k.value} id={`kendala-${k.value}`} />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </FieldSet>

          <FieldSeparator />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>
                <ClockIcon
                  aria-hidden
                  className="size-3.5 text-muted-foreground"
                />
                Waktu mulai terjadi
              </FieldLabel>
              <TimePicker value={time} onValueChange={setTime} />
              <FieldDescription>Hari ini, Senin 16 November.</FieldDescription>
            </Field>
            <FieldSet>
              <FieldLegend variant="label">
                Pengguna lain di ruangan mengalami hal sama?
              </FieldLegend>
              <ToggleGroup
                value={lain}
                onValueChange={(v) => v.length && setLain(v)}
                variant="outline"
                className="w-full *:flex-1"
              >
                <ToggleGroupItem value="ya">Ya</ToggleGroupItem>
                <ToggleGroupItem value="tidak">Tidak</ToggleGroupItem>
                <ToggleGroupItem value="tidak-tahu">Tidak tahu</ToggleGroupItem>
              </ToggleGroup>
            </FieldSet>
          </div>

          <Field>
            <FieldLabel htmlFor="deskripsi">
              Deskripsi kendala{" "}
              <Badge variant="outline" size="sm">
                opsional
              </Badge>
            </FieldLabel>
            <Textarea
              id="deskripsi"
              maxLength={500}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ceritakan kapan terjadi dan apa yang sudah dicoba."
            />
            <FieldDescription className="text-right tabular-nums">
              {desc.length}/500
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost">Batal</Button>
        <Button>
          <SendIcon data-icon="inline-start" />
          Kirim pengaduan
        </Button>
      </CardFooter>
    </Card>
  )
}

/* ---------------- Form 2: Tugas hari ini (T/TL) ---------------- */

const TASKS = [
  { id: "t1", title: "Cek jaringan Lab Komputer 2", source: "Rutin" },
  {
    id: "t2",
    title: "Editing — Video Profil Sekolah",
    source: "Planner",
    late: 2,
  },
  { id: "t3", title: "Pasang proyektor Aula", source: "dari Manajer" },
  { id: "t4", title: "Backup server file mingguan", source: "Input sendiri" },
]

function DailyTasks() {
  const [status, setStatus] = React.useState<Record<string, string[]>>({
    t1: ["T"],
    t2: ["TL"],
  })
  const done = Object.values(status).filter((v) => v[0] === "T").length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tugas hari ini</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground tabular-nums">
            {done}/{TASKS.length}
          </span>{" "}
          Tuntas · terkunci besok 10.00 WIB
        </CardDescription>
        <CardAction>
          <Badge variant="warning-light">Belum dikirim</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y border-y">
          {TASKS.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-6 py-2.5">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-medium">{t.title}</span>
                <span className="flex flex-wrap items-center gap-1">
                  <Badge variant="outline" size="sm">
                    {t.source}
                  </Badge>
                  {t.late ? (
                    <Badge variant="warning-light" size="sm">
                      Tertunda {t.late} hari
                    </Badge>
                  ) : null}
                </span>
              </div>
              <ToggleGroup
                aria-label={`Status ${t.title}`}
                value={status[t.id] ?? []}
                onValueChange={(v) => setStatus((s) => ({ ...s, [t.id]: v }))}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="T" aria-label="Tuntas">
                  T
                </ToggleGroupItem>
                <ToggleGroupItem value="TL" aria-label="Tindak Lanjut">
                  TL
                </ToggleGroupItem>
              </ToggleGroup>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm">Kirim laporan</Button>
      </CardFooter>
    </Card>
  )
}

/* ---------------- Form 3: Preferensi (switch rows, pola c-switch-7) ---------------- */

const PREFS = [
  {
    id: "mine",
    icon: FilterIcon,
    title: "Pekerjaan saya saja",
    desc: "Filter awal Media Planner.",
    on: true,
  },
  {
    id: "push",
    icon: BellIcon,
    title: "Notifikasi push",
    desc: "Penugasan, revisi, dan pengajuan.",
    on: true,
  },
  {
    id: "remind",
    icon: ClockIcon,
    title: "Pengingat 15.45 WIB",
    desc: "Bila laporan hari ini belum dikirim.",
    on: true,
  },
  {
    id: "comment",
    icon: MessageSquareTextIcon,
    title: "Komentar kartu",
    desc: "Saat ada komentar di kartu Anda.",
    on: false,
  },
]

function Preferences() {
  return (
    <Card className="gap-0 p-0">
      <CardHeader className="px-4 py-3">
        <CardTitle>Preferensi</CardTitle>
      </CardHeader>
      <Separator />
      <FieldGroup className="gap-0">
        {PREFS.map(({ id, icon: Icon, title, desc, on }, i) => (
          <React.Fragment key={id}>
            {i > 0 ? <Separator /> : null}
            <Field>
              <FieldLabel className="justify-between px-4 py-3">
                <FieldContent>
                  <FieldTitle className="flex items-center gap-2">
                    <Icon aria-hidden="true" className="size-4 opacity-60" />
                    {title}
                  </FieldTitle>
                  <FieldDescription>{desc}</FieldDescription>
                </FieldContent>
                <Switch defaultChecked={on} />
              </FieldLabel>
            </Field>
          </React.Fragment>
        ))}
      </FieldGroup>
    </Card>
  )
}

/* ---------------- Form 4: Periode & lampiran ---------------- */

function PeriodAndAttachment() {
  const [period, setPeriod] = React.useState<DateSelectorValue | undefined>()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BuildingIcon aria-hidden className="size-4 text-muted-foreground" />
          Pengajuan SDM
        </CardTitle>
        <CardDescription>
          Periode kegiatan dan lampiran rundown.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>Tanggal kegiatan</FieldLabel>
            <DateSelector
              value={period}
              onChange={setPeriod}
              maxYear={2027}
              dayDateFormat="dd/MM/yyyy"
              showTwoMonths={false}
              i18n={DATE_SELECTOR_I18N_ID}
            />
          </Field>
          <Field>
            <FieldLabel>Lampiran rundown</FieldLabel>
            <FileUpload />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

export function FormsDemo() {
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[3fr_2fr]">
      <ComplaintForm />
      <div className="flex min-w-0 flex-col gap-4">
        <DailyTasks />
        <Preferences />
      </div>
      <div className="lg:col-span-2">
        <PeriodAndAttachment />
      </div>
    </div>
  )
}
