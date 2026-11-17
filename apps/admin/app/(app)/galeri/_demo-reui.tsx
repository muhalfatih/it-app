"use client"

import * as React from "react"
import { InboxIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Cascader,
  CascaderContent,
  CascaderEmpty,
  CascaderList,
  CascaderPanel,
  CascaderStatus,
  CascaderTrigger,
} from "@workspace/ui/components/reui/cascader/cascader"
import { CascaderItems } from "@workspace/ui/components/reui/cascader/cascader-item"
import {
  CascaderBreadcrumb,
  CascaderInput,
  CascaderNav,
  CascaderValue,
} from "@workspace/ui/components/reui/cascader/cascader-nav"
import type { CascaderNode } from "@workspace/ui/components/reui/cascader/cascader-types"
import { FileType, getFileType } from "@workspace/ui/components/reui/file-type"
import { Filters } from "@workspace/ui/components/reui/filters/filters"
import { createFilterQuery } from "@workspace/ui/components/reui/filters/filters-query"
import type {
  FilterField,
  FilterQuery,
} from "@workspace/ui/components/reui/filters/filters-types"
import { IconStack } from "@workspace/ui/components/reui/icon-stack"

const LOKASI: CascaderNode[] = [
  {
    value: "gedung-a",
    label: "Gedung A",
    children: [
      { value: "gedung-a.101", label: "Ruang 101" },
      { value: "gedung-a.102", label: "Ruang guru" },
    ],
  },
  {
    value: "gedung-b",
    label: "Gedung B",
    children: [
      { value: "gedung-b.lab", label: "Lab komputer" },
      { value: "gedung-b.studio", label: "Studio media" },
    ],
  },
  { value: "aula", label: "Aula" },
]

const FIELDS: FilterField[] = [
  { id: "judul", label: "Judul", type: "text" },
  {
    id: "tahap",
    label: "Tahap",
    type: "select",
    options: [
      { value: "ide", label: "Ide" },
      { value: "draft", label: "Draft" },
      { value: "tayang", label: "Tayang" },
    ],
  },
]

const BERKAS = [
  "laporan-harian.pdf",
  "rekap-aset.xlsx",
  "naskah-video.docx",
  "poster.png",
  "arsip-foto.zip",
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

export function ReuiDemo() {
  const [lokasi, setLokasi] = React.useState("gedung-b.lab")
  const [query, setQuery] = React.useState<FilterQuery>(() =>
    createFilterQuery()
  )

  return (
    <div className="grid min-w-0 gap-6 md:grid-cols-2">
      <Block title="Cascader (lokasi aset)">
        <Cascader items={LOKASI} value={lokasi} onValueChange={setLokasi}>
          <CascaderTrigger
            render={<Button variant="outline" aria-label="Lokasi aset" />}
          >
            <CascaderValue placeholder="Pilih lokasi" />
          </CascaderTrigger>
          <CascaderContent className="w-72">
            <CascaderPanel>
              <CascaderNav>
                <CascaderInput />
              </CascaderNav>
              <CascaderBreadcrumb />
              <CascaderEmpty />
              <CascaderList>
                <CascaderItems />
              </CascaderList>
              <CascaderStatus />
            </CascaderPanel>
          </CascaderContent>
        </Cascader>
      </Block>

      <Block title="Ikon berkas">
        <div className="flex flex-wrap items-center gap-3">
          {BERKAS.map((nama) => (
            <div key={nama} className="flex items-center gap-2">
              <FileType type={getFileType(nama)} aria-hidden="true" />
              <span className="text-sm">{nama}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Icon stack">
        <div className="flex items-center gap-3">
          <IconStack aria-hidden="true" className="w-16">
            <InboxIcon className="size-4" />
          </IconStack>
          <p className="text-sm text-muted-foreground">
            Belum ada kartu di tahap ini.
          </p>
        </div>
      </Block>

      <div className="md:col-span-2">
        <Block title="Filter">
          <Filters fields={FIELDS} query={query} onQueryChange={setQuery} />
        </Block>
      </div>
    </div>
  )
}
