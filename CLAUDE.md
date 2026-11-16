@AGENTS.md

## Struktur monorepo & lingkungan

- Monorepo **pnpm workspaces + Turborepo**:
  - `apps/admin`: aplikasi Next.js. Hanya halaman/layout/route (`app/`), konfigurasi, dan perakitan komponen.
  - `packages/ui`: `@workspace/ui`, tempat SEMUA komponen dan token tema (`src/components`, `src/lib`, `src/hooks`, `src/styles/globals.css`).
  - `packages/eslint-config`, `packages/typescript-config`: konfigurasi bersama.
- Impor: komponen dari `@workspace/ui/components/<nama>`, helper dari `@workspace/ui/lib/utils`, `ThemeProvider` dari `@workspace/ui/components/theme-provider`.
- Perintah dari root: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`.
- Jalankan semua perintah di dalam WSL dengan Node dari nvm (muat dulu: `. ~/.nvm/nvm.sh`). Jangan jalankan npm/pnpm dari Windows terhadap path `\\wsl.localhost\...` (path UNC membuat install gagal).

## UI & Design: shadcn only

Semua komponen UI dan keputusan desain WAJIB hanya memakai skill `shadcn` (dan MCP `shadcn` yang sudah terpasang), ditambah registry `@reui` (lihat bagian terakhir). Jangan memakai skill/tool desain lain atau membuat komponen UI kustom dari nol.

- Referensi utama: https://ui.shadcn.com/llms.txt
- Sebelum membuat UI, panggil skill `shadcn`, lalu cari/lihat komponen lewat MCP `shadcn` (`search_items_in_registries`, `view_items_in_registries`, `get_item_examples_from_registries`).
- Pakai style/konfigurasi dari `components.json` (`base-maia`, font Geist, ikon lucide) dan token tema di `packages/ui/src/styles/globals.css`; jangan hardcode warna atau font. Perubahan kustom harus tetap konsisten dengan style `base-maia` dan font Geist.

## Peletakan komponen: hanya di `packages/ui`

- `apps/admin` TIDAK menjadi tempat komponen. Jangan membuat komponen baru (shadcn, `@reui`, pembungkus, maupun domain) di `apps/admin/components`.
- Komponen pembungkus/domain (komposisi khusus aplikasi): `packages/ui/src/components/domain/<nama>.tsx`, impor `@workspace/ui/components/domain/<nama>`. Pakai komponen shadcn sebagai bahan; jangan taruh di file hasil CLI.
- Blok yang membawa halaman (mis. `login-05`, `dashboard-01`): komponennya masuk ke `packages/ui/src/components`, tetapi file halaman (`page.tsx`) tidak dibuat saat memakai `-c packages/ui` (hasil dry-run). Tulis halamannya di `apps/admin/app/...` dengan mengimpor dari `@workspace/ui`, dan beri tahu pengguna file mana yang dibuat.
- File data blok (mis. `data.json`) bisa mendarat di `packages/ui/src/app/`; periksa dengan `--dry-run` dan laporkan.

## Manajemen komponen: wajib shadcn CLI

Semua manajemen komponen (tambah, update, hapus, diff), termasuk **blocks** dan **charts**, WAJIB lewat shadcn CLI. Referensi: https://ui.shadcn.com/docs/cli.md

- Semua komponen (shadcn biasa maupun `@reui`) WAJIB memakai `-c packages/ui`, sehingga file masuk ke `packages/ui/src/components`. Jangan pakai `-c apps/admin`. Jika CLI gagal mendeteksi project, tetap pakai `-c packages/ui`.
- Tambah: `pnpm dlx shadcn@latest add <komponen> -c packages/ui` (atau perintah dari `get_add_command_for_items`, dengan `-c packages/ui` ditambahkan). Blocks mis. `add dashboard-01` atau `add sidebar-07`; charts mis. `add chart` / `add chart-bar-default`.
- Jalankan `--dry-run` dulu untuk blok/komponen besar agar daftar file dan dependensi baru (mis. `@dnd-kit/*`, `@tanstack/react-table`, `recharts`) terlihat sebelum ditulis.
- Menambah, update, atau menghapus komponen: hanya lewat CLI. Jangan membuat atau menyalin file baru di `packages/ui/src/components` secara manual, dan jangan salin kode komponen manual.
- Kustomisasi komponen/style yang sudah terpasang BOLEH, dengan urutan prioritas:
  1. **Token tema** di `packages/ui/src/styles/globals.css` (warna, radius, font). Jangan hardcode warna, ukuran, atau font di komponen.
  2. **Varian** di file `packages/ui/src/components/*.tsx` memakai pola `cva` yang sudah ada, bukan class ad-hoc.
  3. **Komponen pembungkus/domain** (lihat "Peletakan komponen").
- Kustomisasi besar sebaiknya di token atau pembungkus, bukan di file hasil CLI, karena `add --overwrite` dan `init --reinstall` menimpa file komponen. Sebelum menimpa, jalankan `pnpm dlx shadcn@latest diff -c packages/ui` atau cek `git diff`, dan beri tahu pengguna file kustom mana yang akan hilang.

## Registry tambahan: @reui

Registry `@reui` (https://reui.io) dipakai untuk variasi komponen tambahan. Terdaftar di `apps/admin/components.json` dan `packages/ui/components.json` (`https://reui.io/r/{style}/{name}.json`; `{style}` diisi `base-maia`).

**Referensi:** https://reui.io/llms.txt (katalog, dokumentasi, aturan instalasi) dan https://reui.io/docs/mcp.

**MCP `reui`** (server `https://mcp.reui.io`, tool `mcp__reui__*`) WAJIB dipakai untuk semua pekerjaan terkait `@reui`, bersama MCP `shadcn`. Jangan menebak nama item, props, atau perintah instalasi dari ingatan.

- Cari: `search` (kueri natural), `list_components`, `list_block_groups`, `list_block_categories`, `list_example_categories`, `search_icons`.
- Baca API/contoh: `get_component` (props dan penggunaan), `get_examples`, `get_block`, `get_example`, `get_thumbnail`.
- Rencana dan validasi: `compose_page`, `validate_usage` (sebelum menulis kode), `get_audit_checklist` (setelah memasang dan menyesuaikan item).
- Instalasi: `get_install_command` dan `get_project_context`. Perintah yang dikembalikan WAJIB disesuaikan dengan aturan proyek ini: tambahkan `-c packages/ui` dan jalankan `--dry-run` dulu.
- Jika tool `mcp__reui__*` tidak tersedia atau meminta login, beri tahu pengguna (`/mcp`, pilih `reui`, ikuti sign in) alih-alih menebak. Selama MCP belum terhubung, pakai https://reui.io/llms.txt sebagai referensi sementara.

**Aturan instalasi dan penempatan**

- Perintah: `pnpm dlx shadcn@latest add @reui/<nama> -c packages/ui`. Jangan pakai `-c apps/admin` (file akan masuk ke `apps/admin/components/reui/`, bukan paket bersama).
- File mendarat di `packages/ui/src/components/reui/<nama>.tsx`; impor dari `@workspace/ui/components/reui/<nama>`.
- Komponen shadcn biasa tetap diinstal dengan nama polos (tanpa `@reui/`). Jangan menimpa komponen shadcn dengan versi `@reui`; folder `reui/` memang dipisah.
- Item `@reui` menambah CSS variables ke `packages/ui/src/styles/globals.css` (mis. 18 variabel untuk `alert`). Jalankan `--dry-run` dulu, lalu periksa `git diff` pada `globals.css` setelahnya; token tetap satu-satunya sumber warna.
- Item bertanda `locked`/premium di hasil MCP, serta blok/template premium (butuh lisensi Pro/Ultimate): jangan dipasang tanpa persetujuan pengguna.

## Versioning (git, GitHub, dsb): jelaskan sebelum eksekusi

Untuk setiap aksi versioning (commit, push, pull, merge, fast-forward, rebase, reset, checkout/switch, branch, tag, stash, PR, dll.), SEBELUM menjalankan berikan rekomendasi dan penjelasan berbasis fakta repo saat ini:

- **Kondisi sekarang:** cek dulu dengan perintah baca-saja (`git status`, `git branch -vv`, `git log --oneline -n`, `git diff --stat`, `git remote -v`) dan sebutkan hasilnya: branch aktif, upstream, ahead/behind, file berubah/untracked, remote.
- **Apa yang dilakukan:** jelaskan aksinya dan alasannya.
- **Dampak setelah eksekusi:** jelaskan keadaan repo sesudahnya (mis. commit baru berisi file apa, branch X maju N commit, remote ikut berubah, fast-forward mungkin/tidak, riwayat ditulis ulang atau tidak) dan apakah bisa dibatalkan.
- **Rekomendasi:** nyatakan pilihan yang disarankan beserta alternatifnya; untuk aksi yang sulit dibatalkan atau memengaruhi remote (push, force-push, reset --hard, rebase branch bersama), minta konfirmasi dulu.
- Setelah eksekusi, verifikasi hasilnya (`git status`/`git log`) dan laporkan keadaan sebenarnya, bukan asumsi.
