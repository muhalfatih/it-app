// Data contoh untuk galeri saja — bukan data aplikasi.
import type { PartitionRow } from "@workspace/ui/components/domain/partition-grid"

export const DAYS = [
  { key: "2026-11-16", label: "Sen 16" },
  { key: "2026-11-17", label: "Sel 17" },
  { key: "2026-11-18", label: "Rab 18" },
  { key: "2026-11-19", label: "Kam 19" },
  { key: "2026-11-20", label: "Jum 20" },
  { key: "2026-11-21", label: "Sab 21" },
]

export const PEOPLE = [
  { value: "budi", label: "Budi Santoso" },
  { value: "siti", label: "Siti Rahmawati" },
  { value: "ahmad", label: "Ahmad Fauzan" },
  { value: "nur", label: "Nurul Hidayah Kusumawardhani" },
]

export const TASK_TYPES = [
  { value: "footage", label: "Take footage" },
  { value: "editing", label: "Editing" },
  { value: "caption", label: "Caption" },
  { value: "dokumentasi", label: "Dokumentasi" },
  { value: "desain", label: "Desain" },
]

export const PARTITION_ROWS: PartitionRow[] = [
  {
    personId: "budi",
    name: "Budi Santoso",
    items: {
      "2026-11-16": [{ id: "1", label: "Take footage — Video Profil Sekolah" }],
      "2026-11-17": [{ id: "2", label: "Take footage — Video Profil Sekolah" }],
      "2026-11-19": [
        { id: "3", label: "Editing — Video Profil Sekolah" },
        { id: "4", label: "Dokumentasi — Rapat Komite" },
      ],
    },
  },
  {
    personId: "siti",
    name: "Siti Rahmawati",
    items: {
      "2026-11-18": [{ id: "5", label: "Desain — Poster Pentas Seni" }],
    },
  },
  { personId: "ahmad", name: "Ahmad Fauzan", items: {} },
  {
    personId: "nur",
    name: "Nurul Hidayah Kusumawardhani",
    items: {
      "2026-11-20": [
        {
          id: "6",
          label:
            "Caption — Liputan Kunjungan Industri Kelas XI ke Kawasan Industri",
        },
      ],
      "2026-11-21": [
        { id: "7", label: "Caption — Liputan Kunjungan Industri" },
      ],
    },
  },
]

export const LONG_TITLE =
  "Liputan Kunjungan Industri Kelas XI ke Kawasan Industri Cikarang bersama Mitra DU/DI 2026"
