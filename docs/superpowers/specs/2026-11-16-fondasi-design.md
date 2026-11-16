# Fondasi Aplikasi — Database, Login, Peran (Tahap 1)

Tanggal: 16 November 2026 · Acuan: PRD §3, §6, §7, §9 (risiko #1, #6, #9) dan spesifikasi §3 (akun, peran, matriks akses §3.3, Setting §3.4).

## Tujuan

Menyediakan fondasi yang dipakai semua modul Tahap 1: basis data, login, peran & bidang, otorisasi server-side sesuai matriks §3.3, dan data Setting. Setelah fondasi ini, tiap modul (Planner, Laporan Harian, dst.) tinggal menambah tabel dan halamannya sendiri.

**Bukan tujuan:** isi modul apa pun; integrasi sistem informasi sekolah; notifikasi push; upload file; PDF.

**Anti-tujuan:** otorisasi yang hanya menyembunyikan menu (akses langsung lewat URL/aksi server harus tetap ditolak); sesi yang tidak bisa dicabut saat akun dinonaktifkan; kata sandi tersimpan selain sebagai hash.

## Keputusan pengguna

| Topik | Keputusan |
| --- | --- |
| Login | **Akun lokal dulu**; dibungkus di `packages/auth` agar nanti diganti adapter sistem informasi sekolah (PRD risiko #1). |
| Pembuatan akun | **Dibuat oleh Manajer** (termasuk akun Staf Unit Lain). Tidak ada pendaftaran mandiri. |
| Peran | **Multi-peran**: hak akses = gabungan semua peran akun. Akun tanpa peran = Staf Unit Lain (hanya menu Layanan). |
| Pendekatan | **A — Drizzle ORM + Better Auth + PostgreSQL di Docker.** |

## Approaches

1. **Drizzle + Better Auth + PostgreSQL (Docker)** — dipilih. Sesi tersimpan di DB (bisa dicabut), hash kata sandi/rate limit/pembuatan akun oleh admin sudah tersedia; skema TypeScript di `packages/db` cocok untuk monorepo.
2. Prisma + Auth.js credentials — ditolak: credentials Auth.js memaksa sesi JWT sehingga sesi tidak bisa dicabut saat akun dinonaktifkan; langkah codegen Prisma di monorepo.
3. Drizzle + auth buatan sendiri — ditolak: keamanan (hash, sesi, rate limit, CSRF) jadi tanggung jawab sendiri, lebih banyak kode berisiko.

## Rancangan

### Paket & struktur

- `packages/db` (`@workspace/db`): koneksi Postgres, skema Drizzle, migrasi (drizzle-kit), seed. Hanya diimpor dari kode server.
- `packages/auth` (`@workspace/auth`): konfigurasi Better Auth (login), daftar izin, fungsi otorisasi, helper sesi untuk server (`requireUser`, `requirePermission`). Satu-satunya tempat yang tahu "dari mana login berasal".
- `apps/admin`: route handler Better Auth, halaman login, guard di `(app)/layout`, halaman Setting. Sidebar menerima menu yang sudah disaring peran.
- `docker-compose.yml` di root: PostgreSQL untuk pengembangan (data di volume). `.env.example` berisi `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

### Data (skema awal)

- **Akun** (tabel Better Auth: user, session, account, verification) + kolom aplikasi di user: `username` (unik, dipakai login), `name`, `unitId` (opsional, unit asal untuk Staf Unit Lain), `bidang` (set: IT/Media; kosong untuk non-staf unit), `mustChangePassword`, `disabledAt`.
- **Peran akun**: tabel `user_role (userId, role)` dengan role ∈ `direktur | manajer | sdm_strategi | sdm_khusus`. Tanpa baris = Staf Unit Lain.
- **Setting** (§3.4): `task_type` (daftar penugasan), `channel` (kanal output + `requiresLink`), `routine_task` (tugas rutin per orang), `unit`, `building` (gedung). Semua punya `active` agar bisa dinonaktifkan tanpa memutus data lama.
- Waktu disimpan `timestamptz`; ditampilkan dalam WIB (Asia/Jakarta).

### Login & akun

- Login dengan **username + kata sandi** (tanpa email wajib; pegawai sekolah belum tentu punya email kerja). *Keputusan pembangun.*
- Manajer membuat akun dengan kata sandi awal; akun baru wajib **ganti kata sandi saat login pertama** (`mustChangePassword`). *Keputusan pembangun.*
- Lupa kata sandi: Manajer mengatur ulang kata sandi (kembali `mustChangePassword`). Tidak ada email reset.
- Manajer bisa **menonaktifkan** akun: login ditolak dan semua sesinya dicabut.
- Sesi di database, berlaku 7 hari dan diperpanjang saat dipakai. *Keputusan pembangun.*
- Kata sandi minimal 8 karakter; percobaan login dibatasi (rate limit Better Auth).
- **Akun Manajer awal** dibuat lewat skrip seed dari variabel lingkungan (username + kata sandi sementara), bukan di kode.

### Otorisasi

- Izin ditulis sebagai daftar konstanta yang mengikuti baris matriks §3.3, mis. `planner.lihat`, `planner.ubah`, `laporan.isi`, `laporan.rekap.semua`, `laporan.rekap.sendiri`, `kanban.ide_ke_draft`, `kanban.draft_ke_review`, `kanban.review_ke_disetujui`, `kanban.tayang`, `absensi.isi`, `layanan.ajukan`, `layanan.setujui_sdm`, `pengaduan.lihat`, `inventaris.kelola`, `peminjaman.catat`, `setting.kelola`.
- `permissionsFor(roles)` = gabungan izin semua peran; tanpa peran = hanya `layanan.ajukan` (+ melihat "Pengajuan Saya").
- Setiap halaman dan aksi server memanggil `requirePermission(...)`; gagal → 403 / redirect. Menu sidebar disaring dari izin yang sama (tampilan saja, bukan pengaman).
- `(app)/layout` mewajibkan sesi; tanpa sesi → `/masuk`. Akun `mustChangePassword` diarahkan ke `/ganti-kata-sandi`.
- Filter awal "Pekerjaan saya saja" (dipakai modul Planner nanti): aktif bila akun punya `sdm_khusus` dan tidak punya `manajer`, `sdm_strategi`, atau `direktur`. *Keputusan pembangun untuk multi-peran.*

### Halaman di fondasi

- `/masuk` — form login (blok login shadcn lewat CLI, teks Indonesia).
- `/ganti-kata-sandi` — wajib saat login pertama / setelah reset.
- `/setting/akun` — daftar akun (data-grid): buat akun, ubah nama/unit, atur peran (multi) & bidang, atur ulang kata sandi, nonaktifkan/aktifkan. Hanya `setting.kelola`.
- `/setting/penugasan`, `/setting/kanal`, `/setting/tugas-rutin`, `/setting/unit-gedung` — daftar sederhana tambah/ubah/nonaktifkan. Hanya `setting.kelola`.
- Menu pengguna di sidebar: nama asli + peran, tombol Keluar.
- `/galeri` tetap ada di balik login.

### Kualitas

- Tes otomatis untuk fungsi otorisasi (`permissionsFor`, filter awal) dengan matriks §3.3 sebagai tabel kasus — termasuk multi-peran dan akun tanpa peran.
- Tes integrasi ringan: akses langsung ke `/setting/akun` dan aksi server Setting oleh akun tanpa izin ditolak (PRD §10 "termasuk akses langsung lewat URL/API").
- Migrasi dan seed bisa dijalankan ulang dengan aman di DB kosong.

## Diserahkan ke pembangun

Versi pasti library, nama kolom detail, pilihan blok login shadcn, tata letak halaman Setting (mengikuti pola galeri: Card + data-grid, editing inline untuk daftar sederhana), nama variabel lingkungan seed.

## Pertanyaan terbuka (tidak menghalangi)

- Kebijakan kata sandi lebih ketat (mis. wajib angka) — ikut default 8 karakter dulu.
- Pencatatan log aktivitas akun (PRD §6 "Audit") — mulai dari kolom waktu dibuat/diubah; log khusus dibuat bersama modul yang membutuhkannya (riwayat kartu, buka-kunci laporan).
