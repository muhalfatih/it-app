"use client"

import * as React from "react"
import {
  BoldIcon,
  ChevronRightIcon,
  ItalicIcon,
  LaptopIcon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@workspace/ui/components/button-group"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@workspace/ui/components/input-group"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Toggle } from "@workspace/ui/components/toggle"
import { type DateSelectorValue } from "@workspace/ui/components/reui/date-selector"
import { DateSelectorPopover } from "@workspace/ui/components/domain/date-selector-popover"
import { SettingList } from "@workspace/ui/components/domain/setting-list"
import type { SettingRow } from "@workspace/ui/components/domain/setting-list"
import { ThemeToggle } from "@workspace/ui/components/domain/theme-toggle"
import { Badge } from "@workspace/ui/components/reui/badge"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@workspace/ui/components/reui/frame"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@workspace/ui/components/reui/number-field"

const GEDUNG = ["Gedung A", "Gedung B", "Aula", "Perpustakaan", "Lab Komputer"]

const ASET = [
  { kode: "PRJ-014", nama: "Proyektor Epson EB-X49", lokasi: "Aula", n: 1 },
  { kode: "LPT-032", nama: "Laptop Lenovo V14", lokasi: "Lab Komputer", n: 1 },
  { kode: "KBL-HDMI", nama: "Kabel HDMI 5 m", lokasi: "Gedung A", n: 6 },
]

const KANAL: SettingRow[] = [
  { id: 1, name: "YouTube", active: true, extra: true },
  { id: 2, name: "Instagram", active: true, extra: false },
  { id: 3, name: "Majalah dinding", active: false, extra: false },
]

function Block({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

export function MiscDemo() {
  const [kanal, setKanal] = React.useState(KANAL)
  const [tanggal, setTanggal] = React.useState<DateSelectorValue | undefined>()
  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-2">
      <Block title="Checkbox & label">
        <div className="flex flex-col gap-2">
          {["Foto sudah diunggah", "Caption disetujui", "Tautan ditempel"].map(
            (t, i) => (
              <div key={t} className="flex items-center gap-2">
                <Checkbox id={`cek-${i}`} defaultChecked={i === 0} />
                <Label htmlFor={`cek-${i}`}>{t}</Label>
              </div>
            )
          )}
          <div className="flex items-center gap-2">
            <Checkbox id="cek-x" disabled />
            <Label htmlFor="cek-x">Dikunci oleh Manajer</Label>
          </div>
        </div>
      </Block>

      <Block title="Toggle & grup tombol">
        <div className="flex flex-wrap items-center gap-3">
          <Toggle aria-label="Tebal">
            <BoldIcon />
          </Toggle>
          <Toggle variant="outline" aria-label="Miring" defaultPressed>
            <ItalicIcon />
          </Toggle>
          <ButtonGroup>
            <Button variant="outline">Hari</Button>
            <Button variant="outline">Pekan</Button>
            <Button variant="outline">Bulan</Button>
          </ButtonGroup>
          <ButtonGroup>
            <ButtonGroupText>Halaman 2</ButtonGroupText>
            <ButtonGroupSeparator />
            <Button variant="outline">Berikutnya</Button>
          </ButtonGroup>
        </div>
      </Block>

      <Block title="Input group">
        <div className="flex flex-col gap-2">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              name="cari-aset"
              autoComplete="off"
              aria-label="Cari aset atau kode"
              placeholder="Cari aset atau kode…"
            />
          </InputGroup>
          <InputGroup>
            <InputGroupInput
              name="nama-pengguna"
              autoComplete="off"
              spellCheck={false}
              aria-label="Nama pengguna"
              placeholder="Nama pengguna…"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>@sekolah.sch.id</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </Block>

      <Block title="Number field">
        <NumberField defaultValue={2} min={0} max={20}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput
              name="jumlah-unit"
              autoComplete="off"
              aria-label="Jumlah unit"
            />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Block>

      <Block title="Combobox">
        <Combobox items={GEDUNG}>
          <ComboboxInput
            name="gedung"
            autoComplete="off"
            aria-label="Gedung"
            placeholder="Pilih gedung…"
            showClear
          />
          <ComboboxContent>
            <ComboboxEmpty>Gedung tidak ditemukan.</ComboboxEmpty>
            <ComboboxList>
              {(g: string) => (
                <ComboboxItem key={g} value={g}>
                  {g}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Block>

      <Block title="Collapsible">
        <Frame stacked dense spacing="sm" className="w-full max-w-xs">
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex w-full">
              <FrameHeader className="flex grow flex-row items-center justify-between gap-2">
                <FrameTitle className="text-sm font-medium">
                  Riwayat perbaikan
                </FrameTitle>
                <ChevronRightIcon
                  aria-hidden="true"
                  className="size-4 text-muted-foreground transition-transform in-aria-expanded:rotate-90"
                />
              </FrameHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <FramePanel>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  12 Nov: lampu proyektor diganti. 3 Nov: filter dibersihkan dan
                  lensa dikalibrasi ulang.
                </p>
              </FramePanel>
            </CollapsibleContent>
          </Collapsible>
        </Frame>
      </Block>

      <Block title="Item">
        <ItemGroup className="gap-2">
          <Item variant="outline" size="sm">
            <ItemMedia variant="icon">
              <LaptopIcon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Laptop Lenovo V14</ItemTitle>
              <ItemDescription>Dipinjam Siti · kembali Jumat</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button size="sm" variant="outline">
                Detail
              </Button>
            </ItemActions>
          </Item>
        </ItemGroup>
      </Block>

      <Block title="Date selector di popover">
        <DateSelectorPopover
          value={tanggal}
          onChange={setTanggal}
          label="Tanggal kegiatan"
        />
      </Block>

      <Block title="Tema">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="text-sm text-muted-foreground">
            Terang, gelap, atau ikuti perangkat.
          </span>
        </div>
      </Block>

      <div className="md:col-span-2">
        <Block title="Tabel dasar">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Aset</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ASET.map((a) => (
                  <TableRow key={a.kode}>
                    <TableCell className="font-mono text-xs">
                      {a.kode}
                    </TableCell>
                    <TableCell>{a.nama}</TableCell>
                    <TableCell>
                      <Badge variant="outline" size="sm">
                        {a.lokasi}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.n}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Block>
      </div>

      <div className="md:col-span-2">
        <SettingList
          title="Kanal publikasi"
          description="Nonaktifkan tanpa menghapus agar data lama tetap utuh."
          itemLabel="kanal"
          extraLabel="Wajib link"
          rows={kanal}
          onAdd={async (name, extra) => {
            setKanal((r) => [
              ...r,
              { id: Date.now(), name, active: true, extra: extra ?? false },
            ])
            return { ok: true }
          }}
          onUpdate={async (id, patch) => {
            setKanal((r) =>
              r.map((x) => (x.id === id ? { ...x, ...patch } : x))
            )
            return { ok: true }
          }}
        />
      </div>
    </div>
  )
}
