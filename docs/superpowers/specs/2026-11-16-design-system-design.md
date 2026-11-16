# Design System — Aplikasi Unit IT & Media (Tahap 1)

Tanggal: 16 November 2026 · Acuan: `resources/prd_aplikasi-it-dan-media-tahap-1.md` (§6, §8), rincian dari `resources/spesifikasi-aplikasi-unit-it-media-tahap-1.md`.

## Tujuan

Menetapkan token tema dan set komponen ter-tema **sebelum** modul dibangun (PRD §8 "Keluaran desain"), supaya tiap modul tinggal merakit. Aplikasi dipakai harian, terutama di HP, oleh staf unit, Manajer, Direktur, dan unit lain.

**Bukan tujuan:** membangun halaman modul, database, atau login. Itu tahap berikutnya.

**Anti-tujuan:** nilai warna/font yang ditulis langsung di komponen; komponen UI buatan sendiri dari nol; tampilan gelap setengah jadi.

## Keputusan (disetujui pengguna)

| Topik | Keputusan |
| --- | --- |
| Identitas | Monokrom dari **#16505E** (`oklch(0.401 0.062 217.4)`, kontras ≈ 9:1 vs putih). Semua token netral diberi rona hue 217. |
| Status | Pengecualian monokrom: `destructive`, `warning`, `success`, `info` tetap merah/kuning/hijau/biru, nada redam, hanya di badge & alert. |
| Nada visual | Rapi, padat data, formal tidak kaku. *(usulan, tidak dibantah)* |
| Font | Geist (sans) + Geist Mono — sudah terpasang di `apps/admin/app/layout.tsx`. |
| Radius | `0.625rem` (bawaan `base-maia`). |
| Kepadatan | Campuran: kontrol sentuh ≥ 44 px (T/TL, centang Tayang, tombol, menu); baris tabel, sel partisi, kartu Kanban ringkas. |
| Tema | Terang (default) **dan** gelap sekarang, dengan tombol ganti tema. Kontras WCAG AA dicek di kedua mode. |
| Perangkat & a11y | Dari PRD: HP + laptop satu web app; fokus keyboard terlihat; kalender & partisi digeser horizontal di HP. |
| Logo | Menyusul; baru dibutuhkan untuk kepala PDF (spesifikasi §4.4). |

## Pemetaan token (`packages/ui/src/styles/globals.css`)

| Token | Terang | Gelap |
| --- | --- | --- |
| `primary`, `ring`, `sidebar-primary` | #16505E | teal yang lebih terang (L ≈ 0.70) agar kontras di latar gelap |
| `background`, `card`, `popover` | putih, rona teal sangat tipis | teal sangat gelap (L ≈ 0.18–0.22) |
| `muted`, `secondary`, `accent`, `border`, `input`, `sidebar` | tint teal sangat terang | tint teal gelap |
| `foreground`, `muted-foreground` | teal hampir hitam / teal abu-abu | teal hampir putih / teal abu-abu terang |
| `chart-1…5` | 5 tingkat terang-gelap hue 217 | sama, dibalik urutannya |
| `destructive`, `warning`, `success`, `info` (+ `-foreground`) | merah/kuning/hijau/biru redam | versi lebih terang untuk latar gelap |

Nilai pasti ditentukan saat implementasi dan diverifikasi kontrasnya (AA: 4.5:1 teks, 3:1 elemen UI). Variabel tambahan dari item `@reui` diselaraskan ke token di atas, bukan dibiarkan bawaan.

## Komponen

**Sudah terpasang:** alert-dialog, alert, badge, button-group, button, calendar, card, chart, checkbox, combobox, dialog, dropdown-menu, field, input-group, input, label, popover, scroll-area, select, separator, sheet, sidebar, skeleton, sonner, spinner, table, tabs, textarea, theme-provider, tooltip; `@reui`: badge, cascader, data-grid, event-calendar, filters, icon-stack, kanban, number-field, timeline.

**Ditambah via CLI (`-c packages/ui`, `--dry-run` dulu):**

| Asal | Item | Kegunaan |
| --- | --- | --- |
| shadcn | `toggle-group` | T/TL, Daftar/Kalender/Partisi, status absensi |
| shadcn | `radio-group` | Ya / Tidak / Tidak tahu (Pengaduan Internet) |
| shadcn | `switch` | "Pekerjaan saya saja", "Wajib link" |
| shadcn | `avatar` | Staf di partisi, kartu, sidebar |
| shadcn | `progress` | Skor laporan, progres unggah |
| shadcn | `empty` | Keadaan kosong |
| shadcn | `breadcrumb`, `collapsible` | Navigasi, grup menu sidebar |
| @reui | `time-picker` | Jam pinjam/kembali, waktu kendala |
| @reui | `date-selector` | Periode rekap & PDF |
| @reui | `c-file-upload-5` + `file-type` | Unggah foto/video kartu & rundown |
| @reui | `alert` | "Perlu diperbarui", "Laporan terkunci" |

`cascader`, `filters`, `icon-stack` dibiarkan; dihapus nanti bila tidak terpakai.

**Komponen domain** (`packages/ui/src/components/domain/`), disusun dari komponen di atas:

- `partition-grid` — baris orang × kolom Senin–Sabtu, sel kosong `bg-muted`.
- `content-card` — kartu Kanban (thumbnail, nama, tahap, kanal, penugasan).
- `assignment-rows` — baris penugasan multi-entry (orang + jenis + rentang tanggal).
- `media-player` — pemutar foto/video review memakai `<video>` bawaan (streaming lewat range request di sisi server nanti).
- `theme-toggle` — tombol ganti tema (dropdown-menu + theme-provider).

## Approaches (cara menulis token)

1. **Tulis token OKLCH langsung di `globals.css`** — dipilih. Kontrol penuh atas palet monokrom + status, sesuai aturan proyek (token = satu-satunya sumber warna).
2. Preset shadcn (`apply <code>`) — preset bawaan tidak memuat hue #16505E; tetap harus diedit manual, jadi tidak menambah apa-apa.
3. Generator tema eksternal — dilarang aturan proyek (shadcn + `@reui` saja).

## Keluaran & penerimaan

1. Token terang + gelap di `globals.css`, kontras AA terverifikasi.
2. Komponen tambahan terpasang lewat CLI; perubahan `globals.css` dari `@reui` diperiksa lewat `git diff`.
3. Komponen domain di `packages/ui/src/components/domain/`.
4. Halaman galeri `apps/admin/app/galeri/page.tsx` menampilkan semua komponen ter-tema (termasuk badge status, T/TL, "Tertunda N hari", partisi contoh, kartu Kanban contoh) dalam mode terang & gelap.
5. `pnpm lint` dan `pnpm typecheck` lulus. Pengguna meninjau galeri dan menyetujui sebelum modul dimulai.

## Diserahkan ke pembangun

Nilai OKLCH pasti per token, susunan halaman galeri, nama file domain final.
