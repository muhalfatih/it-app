# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tema monokrom #16505E (terang + gelap), komponen tambahan, komponen domain, dan halaman galeri `/galeri` yang siap ditinjau pengguna.

**Architecture:** Semua warna adalah token OKLCH di `packages/ui/src/styles/globals.css`, dan sebuah skrip Node tanpa dependensi memverifikasi kontras AA token tersebut. Komponen dipasang lewat shadcn CLI ke `packages/ui`, sedangkan komponen domain disusun di `packages/ui/src/components/domain/`. `apps/admin` hanya merakit halaman galeri.

**Tech Stack:** Next.js 16.4 (App Router), React 19.3, Tailwind v4, shadcn `base-maia` (Base UI), `@reui`, next-themes, lucide-react, date-fns 4.

**Spec:** `docs/superpowers/specs/2026-11-16-design-system-design.md`

## Global Constraints

- Patuhi `CLAUDE.md` dan `AGENTS.md` di root. Hal yang paling sering dilanggar dirangkum di bawah.
- **Menjalankan perintah:** semua perintah dijalankan di dalam WSL, misalnya `wsl.exe -d Ubuntu -- bash -lc '. ~/.nvm/nvm.sh && cd ~/it-app && <perintah>'`. Jangan jalankan pnpm/npm dari Windows terhadap path `\\wsl.localhost\...`.
- **Memasang komponen:** komponen hanya dipasang lewat `pnpm dlx shadcn@latest add <item> -c packages/ui`, dengan `--dry-run` dulu. Jangan pakai `-c apps/admin`, dan jangan membuat atau menyalin file manual di `packages/ui/src/components` (kecuali `domain/`).
- **Warna dan font:** tidak boleh ada nilai heks/oklch/font langsung di komponen atau halaman. Pakai kelas token (`bg-primary`, `text-muted-foreground`, …).
- **Badge status:** hanya varian `-light` atau `-outline` dari `@reui/badge`, misalnya `success-light`. Varian solid (`bg-success text-white`) tidak lolos kontras, jadi tidak dipakai.
- **Aturan shadcn:** `gap-*` bukan `space-*`; form memakai `FieldGroup` + `Field`; ikon di Button memakai `data-icon`; trigger kustom memakai `render` (Base UI), bukan `asChild`.
- **Sebelum menulis UI `@reui`:** panggil `mcp__reui__get_agent_skill` dan `get_component` untuk API sebenarnya. Sesudahnya jalankan `validate_usage` dan `get_audit_checklist`.
- **Next.js:** sebelum menulis halaman, baca panduan di `apps/admin/node_modules/next/dist/docs/` (app router, `metadata`) karena versi ini punya breaking changes.
- **Commit:** pengerjaan di branch lokal `feat/design-system` dari `main` (sekitar 7 commit: Task 0–5 plus perbaikan), tanpa push. Setiap commit mengikuti aturan versioning `CLAUDE.md`: laporkan dulu `git status`/`git log`, jelaskan isi commit dan dampaknya, lalu commit. Merge ke `main` diputuskan pengguna setelah galeri disetujui. Akhiri pesan commit dengan `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Bahasa:** teks UI berbahasa Indonesia, dan `<html lang="id">`.

## Review Focus

1. **Layar HP 360 px:** halaman galeri tidak boleh punya scroll horizontal di level halaman. Partisi dan Kanban hanya bergeser di dalam kontainernya sendiri, dan kolom nama di partisi tetap menempel (sticky). → Task 5, langkah cek mobile.
2. **Mode gelap:** setiap badge status, alert, dan teks muted harus terbaca. → Task 2, pasangan kontras gelap di skrip.
3. **Target sentuh di perangkat sentuh:** Button (default `h-9` = 36 px), item ToggleGroup, trigger Select, dan item menu harus ≥ 44 px. → Task 2, aturan `pointer: coarse`, dicek di Task 5.
4. **Fokus keyboard:** cincin fokus harus terlihat di kedua tema (`ring` 50 % dikomposit di atas `background`, ≥ 3:1). → Task 2, skrip.
5. **Label panjang berbahasa Indonesia:** misalnya jenis kendala "d. Terhubung ke #INSANTAMA tetapi tidak bisa akses internet sama sekali" atau nama konten 80 karakter. Teks harus membungkus atau terpotong (`truncate`) tanpa merusak kartu, select, atau sel partisi. → Task 4 dan Task 5, data contoh panjang.

---

### Task 0: Commit dokumen spec + plan

- [ ] **Step 1:** Laporkan kondisi repo (`git status`, `git branch -vv`, `git log --oneline -3`), buat branch `git switch -c feat/design-system`, lalu commit `docs/superpowers/specs/2026-11-16-design-system-design.md` dan `docs/superpowers/plans/2026-11-16-design-system.md` dengan pesan `docs: spec dan rencana design system tahap 1`.

### Task 1: Pasang komponen tambahan

**Files:**
- Create (oleh CLI): `packages/ui/src/components/{toggle-group,toggle,radio-group,switch,avatar,progress,empty,breadcrumb,collapsible}.tsx`, `packages/ui/src/components/reui/{time-picker,date-selector,file-type,alert}.tsx` plus berkas `c-file-upload-5` dan hook `use-file-upload` (lokasi persis mengikuti hasil dry-run)
- Modify (oleh CLI): `packages/ui/package.json`, `packages/ui/src/styles/globals.css`, `pnpm-lock.yaml`

**Interfaces:**
- Produces: impor `@workspace/ui/components/<nama>` dan `@workspace/ui/components/reui/<nama>` untuk semua item di atas.

- [ ] **Step 1:** Jalankan `pnpm dlx shadcn@latest add toggle-group radio-group switch avatar progress empty breadcrumb collapsible -c packages/ui --dry-run`. Pastikan semua file mendarat di `packages/ui/src/components/` dan tidak ada yang menimpa komponen terpasang.
- [ ] **Step 2:** Jalankan perintah yang sama tanpa `--dry-run`.
- [ ] **Step 3:** Ambil perintah pasang dari `mcp__reui__get_install_command` untuk `time-picker`, `date-selector`, `file-type`, `alert`, dan `c-file-upload-5`, lalu tambahkan `-c packages/ui --dry-run`. Catat file tujuan, dependensi baru, dan variabel CSS yang akan ditambahkan. `c-file-upload-5` menarik `button` dan `@reui/badge` yang sudah terpasang. Perintah lewat `bash -lc` tidak punya TTY, jadi jangan mengandalkan prompt.
- [ ] **Step 4:** Jalankan pemasangan `@reui` tanpa `--dry-run`. Setelah itu `git diff --stat -- packages/ui/src/components` untuk file yang **sudah ada sebelum Task 1** harus kosong. Kalau ada yang berubah, pulihkan dengan `git restore <file>` lalu laporkan.
- [ ] **Step 5:** Periksa `git diff packages/ui/src/styles/globals.css`, lalu baca file yang baru ditambahkan. Perbaiki alias impor yang tidak cocok dengan `@workspace/ui/...` dan komposisi yang melanggar aturan shadcn. Grep cara `reui/alert.tsx` memakai token status (`text-*-foreground`, `bg-*/N`, `dark:text-*`) dan catat pasangan teks/latarnya untuk skrip kontras Task 2.
- [ ] **Step 6:** Jalankan `pnpm lint && pnpm typecheck`. Harus lulus tanpa error.
- [ ] **Step 7:** Commit dengan pesan `feat(ui): pasang komponen tambahan design system`.

### Task 2: Token tema + skrip cek kontras

**Files:**
- Create: `packages/ui/scripts/check-contrast.mjs`
- Modify: `packages/ui/src/styles/globals.css` (blok `:root`, `.dark`, `@layer base`), `packages/ui/package.json` (script `check:contrast`)

**Interfaces:**
- Produces: `pnpm --filter @workspace/ui check:contrast` mengembalikan exit 0 bila semua pasangan lolos, exit 1 dan mencetak pasangan yang gagal bila tidak.

- [ ] **Step 1: Tulis skrip kontras beserta self-check-nya**

`check-contrast.mjs` membaca `globals.css` lalu mengambil semua `--<nama>: oklch(L C H);` di dalam blok `:root { … }` dan `.dark { … }`. Nilai token dengan alpha (`/ 10%`) dilewati sebagai token; komposit alpha yang dibutuhkan pasangan di bawah dihitung dengan mencampur sRGB linear `a·fg + (1−a)·bg` sebelum luminans. Konversinya OKLCH → OKLab → sRGB linear (matriks Björn Ottosson), di-clamp ke 0–1. Setelah itu dihitung luminans relatif WCAG dan rasionya `(L1+0.05)/(L2+0.05)`.

Self-check di awal skrip (pakai `node:assert`):

```js
assert.equal(round1(ratio("oklch(1 0 0)", "oklch(0 0 0)")), 21)
assert.ok(Math.abs(ratio("oklch(0.401 0.062 217.4)", "oklch(1 0 0)") - 8.96) < 0.15) // #16505E vs putih
```

Pasangan yang dicek, untuk masing-masing tema:

| Min | Pasangan (teks / latar) |
| --- | --- |
| 4.5 | foreground/background, card-foreground/card, popover-foreground/popover, primary-foreground/primary, secondary-foreground/secondary, muted-foreground/muted, muted-foreground/background, accent-foreground/accent, sidebar-foreground/sidebar, sidebar-primary-foreground/sidebar-primary, sidebar-accent-foreground/sidebar-accent, destructive/background |
| 4.5 (terang) | success-foreground/background, warning-foreground/background, info-foreground/background, destructive-foreground/background |
| 4.5 (gelap) | success/background, warning/background, info/background, destructive/background, dan keempat `*-foreground`/background |
| 3.0 | primary/background; ring **dikomposit 50 % di atas background** vs background (komponen memakai `ring-ring/50` dan `outline-ring/50`) |
| 4.5 | pasangan dari `reui/alert` yang dicatat di Task 1 Step 5 |

Kalau ada token yang tidak ditemukan atau bukan literal `oklch(...)`, skrip harus gagal. Ini memaksa token status (yang sekarang `var(--color-…)`) ditulis sebagai literal.

- [ ] **Step 2:** Tambahkan `"check:contrast": "node scripts/check-contrast.mjs"` ke `packages/ui/package.json`. Jalankan dengan token yang masih bawaan; harapannya FAIL dengan daftar token status yang bukan literal oklch.

- [ ] **Step 3: Tulis token**

Nilai awal di bawah ini (hue 217 untuk netral). Geser nilai L **hanya** bila skrip menolak, dan pertahankan `primary` terang tepat `oklch(0.401 0.062 217.4)`.

| Token | `:root` | `.dark` |
| --- | --- | --- |
| background | 0.995 0.002 217 | 0.19 0.02 217 |
| foreground, card-foreground, popover-foreground | 0.20 0.03 217 | 0.96 0.008 217 |
| card, popover | 1 0 0 | 0.23 0.025 217 |
| primary, ring, sidebar-primary, sidebar-ring | **0.401 0.062 217.4** | 0.72 0.08 210 |
| primary-foreground, sidebar-primary-foreground | 0.985 0.005 217 | 0.20 0.03 217 |
| secondary, muted, accent, sidebar-accent | 0.96 0.01 217 | 0.28 0.025 217 |
| secondary-foreground, accent-foreground, sidebar-accent-foreground | 0.30 0.045 217 | 0.96 0.008 217 |
| muted-foreground | 0.50 0.03 217 | 0.72 0.02 217 |
| border, input, sidebar-border | 0.91 0.012 217 | 0.32 0.025 217 |
| sidebar | 0.98 0.006 217 | 0.22 0.022 217 |
| sidebar-foreground | 0.20 0.03 217 | 0.96 0.008 217 |
| chart-1…5 | L 0.85 / 0.70 / 0.55 / 0.40 / 0.28, C 0.06, H 217 | urutan L dibalik |
| destructive / -foreground | 0.55 0.17 27 / 0.42 0.13 27 | 0.68 0.15 25 / 0.80 0.10 25 |
| success / -foreground | 0.60 0.11 155 / 0.40 0.08 155 | 0.72 0.12 155 / 0.82 0.09 155 |
| warning / -foreground | 0.76 0.13 80 / 0.45 0.09 70 | 0.80 0.13 85 / 0.86 0.10 85 |
| info / -foreground | 0.58 0.13 290 / 0.42 0.11 290 | 0.72 0.12 290 / 0.84 0.08 290 |

| invert / -foreground | 0.25 0.03 217 / 0.985 0.005 217 | 0.35 0.03 217 / 0.985 0.005 217 |

`info` sengaja ungu (hue 290), bukan biru, supaya "Tindak Lanjut" tidak tertukar dengan badge tahap `primary-light` (hue 217). Keputusan akhirnya di tinjauan galeri.

Variabel tambahan dari `@reui/alert` (Task 1) diarahkan ke token di atas lewat `var(--success)` dan sejenisnya, kalau memungkinkan. Kalau tidak bisa, tulis sebagai literal oklch dengan hue yang sama.

- [ ] **Step 4: Target sentuh**

Tambahkan satu blok `@media (pointer: coarse)` di `@layer base` `globals.css` yang memberi `min-height: 2.75rem` pada kontrol utama berikut (selector `[data-slot="…"]`, diverifikasi dengan grep `data-slot=` termasuk hasil Task 1): `button`, `toggle-group-item`, `select-trigger`, `combobox-trigger`, `select-item`, `dropdown-menu-item`, `tabs-trigger`, `input`, `sidebar-menu-button`. Di blok yang sama:
- tombol ikon (`[data-slot="button"][class*="size-"]`) juga diberi `min-width: 2.75rem`, supaya tidak menjadi 36×44;
- `[data-slot="tabs-list"]` diberi `height: auto`, supaya trigger tidak meluap;
- tombol di dalam `[data-slot="calendar"]` dan di dalam root kanban, data-grid, dan event-calendar `@reui` (cari `data-slot` root-nya) **dikecualikan** dengan `:not(... *)`, karena sel padat itu tidak dibesarkan.

Bentuk akhir selector disesuaikan dari pemeriksaan di Task 5 Step 3.

Checkbox, radio, dan switch tidak dibesarkan langsung. Target sentuhnya ≥ 44 px karena seluruh baris `Field` horizontal berikut labelnya bisa diklik, dan itu dibuktikan di galeri (Task 5).

- [ ] **Step 5:** Jalankan `pnpm --filter @workspace/ui check:contrast`. Harapannya: PASS, exit 0.
- [ ] **Step 6:** Jalankan `pnpm lint && pnpm typecheck`. Harapannya: lulus.
- [ ] **Step 7:** Commit dengan pesan `feat(ui): token tema monokrom #16505E terang dan gelap`.

### Task 3: Theme toggle + layout

**Files:**
- Create: `packages/ui/src/components/domain/theme-toggle.tsx`
- Modify: `apps/admin/app/layout.tsx`

**Interfaces:**
- Produces: `ThemeToggle(): JSX.Element`, dari `@workspace/ui/components/domain/theme-toggle`.

- [ ] **Step 1:** Buat `ThemeToggle` (`"use client"`): `DropdownMenu` dengan trigger `Button variant="ghost" size="icon"` (ikon `SunIcon`/`MoonIcon`, `aria-label="Ganti tema"`) dan `DropdownMenuRadioGroup` berisi Terang / Gelap / Sistem, yang memanggil `useTheme().setTheme("light" | "dark" | "system")` dari `next-themes`.
- [ ] **Step 2:** Di `layout.tsx`: ubah `lang` menjadi `"id"`, beri `<ThemeProvider defaultTheme="light">` (lewat props, tanpa mengedit `theme-provider.tsx` hasil CLI), dan tambahkan `export const metadata = { title: "Unit IT & Media" }` sesuai panduan metadata Next 16.
- [ ] **Step 3:** Jalankan `pnpm lint && pnpm typecheck`. Harapannya: lulus.
- [ ] **Step 4:** Commit dengan pesan `feat(ui): theme toggle dan tema terang default`.

### Task 4: Komponen domain

**Files:**
- Create: `packages/ui/src/components/domain/{partition-grid,content-card,assignment-rows,media-player}.tsx`

**Interfaces:**
- Consumes: komponen dari Task 1 dan `Table`, `Card`, `Select`, `Popover`, `Calendar`, `Button`, `Avatar`, `@reui/badge`.
- Produces:
  ```ts
  // partition-grid.tsx — Table; baris = orang, kolom = days; sel tanpa item → bg-muted; kolom nama sticky; scroll horizontal di dalam kontainer
  type PartitionItem = { id: string; label: string }
  type PartitionRow = { personId: string; name: string; items: Record<string, PartitionItem[]> } // key = days[i].key
  function PartitionGrid(props: { days: { key: string; label: string }[]; rows: PartitionRow[] }): JSX.Element

  // content-card.tsx — Card penuh (Header/Title/Content/Footer); badge tahap primary-light; ikon LockIcon bila locked; judul line-clamp-2
  type ContentStage = "ide" | "draft" | "review" | "disetujui" | "tayang"
  function ContentCard(props: { title: string; stage: ContentStage; publishDate: string; channels: string[]; assignees: { name: string }[]; thumbnailUrl?: string; locked?: boolean }): JSX.Element
  const CONTENT_STAGE_LABEL: Record<ContentStage, string> // "Ide","Draft","Review","Disetujui","Telah Tayang"

  // assignment-rows.tsx ("use client") — tiap baris: Select orang, Select jenis, Popover+Calendar mode="range"; tombol "Tambah penugasan" & hapus baris (aria-label "Hapus penugasan")
  type Option = { value: string; label: string }
  type Assignment = { personId: string; taskTypeId: string; start?: string; end?: string } // ISO yyyy-MM-dd
  function AssignmentRows(props: { value: Assignment[]; onChange: (value: Assignment[]) => void; people: Option[]; taskTypes: Option[] }): JSX.Element

  // media-player.tsx — video: <video controls preload="metadata" playsInline>; image: <img>; keduanya aspect-video, object-contain, bg-muted, rounded-lg
  function MediaPlayer(props: { src: string; kind: "image" | "video"; alt: string; poster?: string }): JSX.Element
  ```

- [ ] **Step 1:** Tulis keempat file sesuai interface di atas. Format tanggal memakai `date-fns` dengan locale `id`.
- [ ] **Step 2:** Jalankan `pnpm lint && pnpm typecheck`. Harapannya: lulus.
- [ ] **Step 3:** Commit dengan pesan `feat(ui): komponen domain partisi, kartu konten, penugasan, pemutar media`.

### Task 5: Halaman galeri

**Files:**
- Create: `apps/admin/app/galeri/page.tsx`, `apps/admin/public/galeri/contoh.svg` (gambar contoh sederhana untuk `MediaPlayer`, isian abu-abu tengah yang tetap; `currentColor` tidak ikut tema bila dimuat lewat `<img>`)
- Modify: `apps/admin/app/page.tsx` (ganti isi bawaan dengan tautan ke `/galeri`)

**Interfaces:**
- Consumes: semua komponen dari Task 1–4.

- [ ] **Step 1:** Susun `/galeri` dengan header berisi judul "Galeri Komponen" dan `ThemeToggle`. Isinya bagian-bagian berikut, masing-masing dengan judul:
  1. **Warna:** swatch token, satu kotak per token memakai kelas `bg-*`.
  2. **Tipografi:** heading, teks isi, muted, mono.
  3. **Tombol:** semua varian dan ukuran.
  4. **Form:** Input, Textarea, Select, Combobox, Switch "Pekerjaan saya saja", RadioGroup Ya/Tidak/Tidak tahu, Checkbox centang Tayang dalam `Field` horizontal, ToggleGroup T/TL, ToggleGroup Daftar/Kalender/Partisi, ToggleGroup 5 status absensi, time-picker, date-selector, dan file upload.
  5. **Badge status:** Tuntas `success-light`, Tindak Lanjut `info-light`, "Tertunda 3 hari" `warning-light`, Ditolak `destructive-light`, Diajukan `outline`, serta lima tahap konten `primary-light`.
  6. **Alert:** "Perlu diperbarui" (warning) dan "Laporan terkunci" (destructive).
  7. **Progress:** skor 54,5 % dengan teks "6/11".
  8. **Table** dan **PartitionGrid:** 4 orang × Senin–Sabtu, ada sel kosong, satu nama panjang.
  9. **Kanban:** `@reui/kanban`, 5 kolom tahap berisi `ContentCard`, termasuk satu judul 80 karakter dan satu kartu `locked`.
  10. **AssignmentRows** dengan state lokal.
  11. **MediaPlayer** gambar `/galeri/contoh.svg`. Video diuji nanti di modul Kanban dengan streaming server.
  12. **Overlay:** Dialog, AlertDialog konfirmasi dua langkah ("Hapus entri" → konfirmasi kedua), Sheet, Popover, Tooltip, DropdownMenu.
  13. **Calendar** (single + range) dan **`@reui/event-calendar`** tampilan pekan Senin–Sabtu, berisi event penugasan dan penanda tanggal tayang. Warna event memakai `var(--chart-N)`/`var(--primary)`, bukan konstanta `EVENT_CALENDAR_COLORS` (yang memakai `--color-blue-500` dan seterusnya).
  14. **Tabs**, **Sidebar** (contoh dalam kontainer, berisi menu modul Tahap 1), **Timeline** (riwayat kartu: "Disetujui oleh Direktur, 12 Nov 14.20"), **Data Grid** (daftar Planner contoh), **Chart** (bar 5 seri memakai `chart-1…5`).
  15. **Empty**, **Avatar**, **Breadcrumb**, **Skeleton**, **Spinner**, dan Toast (tombol pemicu).

  Pisahkan bagian interaktif ke client component di dalam route yang sama (`apps/admin/app/galeri/_demo-*.tsx`), sementara `page.tsx` tetap server component. File `_demo-*` berisi data contoh dan state, **bukan komponen UI baru**.
- [ ] **Step 2:** Jalankan `pnpm lint && pnpm typecheck && pnpm --filter admin build`. Harapannya: lulus.
- [ ] **Step 3: Cek mobile & tema**

Jalankan `pnpm dev`. Buka `/galeri` di lebar 360 px dan 1280 px, dalam mode terang dan gelap. Pastikan:
- tidak ada scroll horizontal di level halaman;
- partisi dan Kanban bergeser di dalam kontainernya;
- kolom nama tetap menempel;
- label panjang terpotong atau membungkus dengan rapi;
- fokus Tab terlihat.

Pada emulasi sentuh (DevTools device mode), ukur Button (default, `sm`, ikon), item ToggleGroup, Tabs, dan tombol menu Sidebar: semuanya harus ≥ 44 px. Calendar, event-calendar, Kanban, dan Data Grid tidak boleh rusak tata letaknya. Sesuaikan selector Task 2 Step 4 bila perlu. Simpan screenshot keempat kombinasi tersebut untuk laporan.
- [ ] **Step 4:** Jalankan `mcp__reui__validate_usage` dan `get_audit_checklist` untuk item `@reui` yang dipakai, lalu perbaiki temuannya.
- [ ] **Step 5:** Commit dengan pesan `feat(admin): halaman galeri komponen ter-tema`.

### Task 6: Serah tinjau

- [ ] **Step 1:** Jalankan `pnpm --filter @workspace/ui check:contrast && pnpm lint && pnpm typecheck`. Semuanya harus lulus.
- [ ] **Step 2:** Laporkan ke pengguna: URL `/galeri`, screenshot, daftar file yang dibuat CLI (termasuk file data blok, kalau ada), perubahan `globals.css` dari `@reui`, dan nilai token yang digeser dari tabel Task 2. Minta persetujuan design system sebelum pengerjaan modul dimulai.
