# Inventaris & Peminjaman Alat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manajer mengelola data alat dengan stok tersedia yang terhitung sendiri di `/inventaris`; staf unit (bukan Direktur) mencatat peminjaman dan pengembalian di `/inventaris/peminjaman`, dengan jumlah alat bermasalah + catatan per alat yang menahan stok sampai Manajer memulihkannya.

**Architecture:** Tiga tabel baru di `packages/db/src/schema/inventory.ts`. Stok tidak disimpan: dihitung dari baris peminjaman (`qty` transaksi belum kembali + `problem_qty` yang belum dipulihkan). Aturan murni di `apps/admin/lib/inventaris/rules.ts`, validasi zod di `schema.ts`, query/mutasi di `queries.ts`/`mutations.ts`, dipanggil aksi server tipis di folder route. Semua jalur tulis yang menyentuh stok berjalan dalam transaksi dengan `SELECT … FOR UPDATE` atas baris alat (urut `id` menaik).

**Tech Stack:** Next.js 16 (App Router, `params`/`searchParams` Promise), Drizzle + PostgreSQL, `@workspace/auth`, zod 4, date-fns, vitest, `@workspace/ui` (reui data-grid, reui number-field, reui time-picker, examples/c-calendar-24, combobox, field, input, textarea, select, badge, tabs, table, alert-dialog, empty, card).

**Spec:** `docs/superpowers/specs/2026-11-20-inventaris-design.md`

## Global Constraints

- Semua perintah di WSL setelah `. ~/.nvm/nvm.sh`, dari root repo. Jangan pnpm dari Windows terhadap `\\wsl.localhost`.
- Baca panduan Next di `apps/admin/node_modules/next/dist/docs/` sebelum menulis halaman/aksi (AGENTS.md).
- Komponen hanya di `packages/ui`; `apps/admin` hanya halaman dan file perakitan `_*.tsx` di folder route. **Tidak ada komponen baru yang dipasang lewat CLI**; satu-satunya file komponen baru: `packages/ui/src/components/domain/loan-item-rows.tsx`, dirakit dari komponen yang sudah ada. Bila ternyata butuh komponen lain, berhenti dan ajukan ke pengguna (nama + sumber).
- `domain/setting-list.tsx` **tidak dipakai** untuk data alat: ia hanya menangani nama + aktif, sedangkan alat punya merek dan jumlah. Dipakai sebagai acuan pola saja.
- Warna hanya token `globals.css`. Badge status (varian `@reui` Badge, sudah dicek ada): Dipinjam `info-light`, Terlambat `destructive-light`, Dikembalikan `success-light`, baris bermasalah belum dipulihkan `warning-light`.
- Sebelum Task 5: skill `frontend-design:frontend-design`. Setelah Task 6: `anthropic-skills:web-design-guidelines`, MCP reui `validate_usage` + `get_audit_checklist` untuk item reui yang dipakai.
- Izin (sudah ada di `packages/auth/src/permissions.ts`, **jangan diubah**): `inventaris.kelola` (hanya Manajer), `peminjaman.catat` (Manajer, SDM Strategi, SDM Khusus). Direktur tidak punya keduanya.
- Menu sudah terdaftar di `apps/admin/lib/menu.tsx` dengan URL `/inventaris` (Data alat) dan `/inventaris/peminjaman` (Peminjaman) — **jangan ubah URL-nya**.
- Validasi: nama alat trim 2–80; merek trim 1–80 (wajib, alat tanpa merek diisi `-`); `total` bilangan bulat ≥ 1; nama peminjam trim 2–80; WA opsional, bila diisi dinormalisasi ke digit dengan `+` opsional di depan, 9–16 digit; baris alat 1–20, tanpa alat ganda, `qty` ≥ 1; `dueAt > startedAt`; `startedAt` ≤ sekarang + 5 menit; `returnedAt` ≥ `startedAt` dan ≤ sekarang + 5 menit; `problemQty` 0–`qty`; `problemNote` trim 3–500 wajib bila `problemQty > 0`.
- Pesan galat persis: `"Stok <nama alat> tersedia hanya <N>"`, `"Transaksi ini sudah dikembalikan"`, `"Jumlah tidak boleh kurang dari <N> yang sedang dipinjam atau bermasalah"`, `"Alat ini punya riwayat peminjaman. Nonaktifkan saja agar riwayat tetap terbaca."`, `"Alat sudah dipulihkan"`, `"Isi semua alat dalam transaksi ini"`.
- Galat aksi lewat `guarded()`/`UserError` (`lib/setting-crud.ts`, `lib/user-error.ts`). Id tidak dikenal → `notFound()`.
- Zona WIB untuk label status dan tampilan tanggal; simpan `timestamptz`.
- Setiap aksi git mengikuti bagian "Versioning" CLAUDE.md. Kerja di branch `feat/inventaris` dari `main`. Tidak ada push tanpa persetujuan pengguna.

## Review Focus

1. Dua staf (atau dua tab) mencatat peminjaman unit terakhir bersamaan: satu sukses, satu dapat `"Stok … tersedia hanya 0"`, stok tidak pernah negatif. → tes di Task 4.
2. Pengembalian dikirim dua kali (tombol diklik ganda, atau dua tab): yang kedua gagal dengan `"Transaksi ini sudah dikembalikan"` dan `problem_qty` tidak tertulis dua kali sehingga stok tertahan dobel. → tes di Task 4.
3. Manajer menurunkan jumlah alat selagi alat itu dipinjam atau bermasalah: ditolak dengan angka minimumnya, bukan membuat stok tersedia negatif. → tes di Task 3.
4. `due_at` yang lewat tepat di sekitar tengah malam WIB: label Terlambat muncul berdasar waktu WIB, bukan UTC. → tes di Task 2.
5. Formulir pengembalian mengirim alat di luar transaksi, atau melewatkan satu alat transaksi (§9.3 pengembalian sekaligus): keduanya ditolak, bukan tersimpan separuh. → tes di Task 4.

---

### Task 1: Branch, skema, migrasi

**Files:**
- Create: `packages/db/src/schema/inventory.ts`
- Modify: `packages/db/src/schema/index.ts`
- Generate: `packages/db/drizzle/0007_*.sql`

**Interfaces:**
- Produces: `equipment`, `loan`, `loanItem` dari `@workspace/db/schema`.

- [ ] **Step 0:** Branch `feat/inventaris` dari `main` (aturan Versioning). Commit spec + plan: `docs: rancangan dan rencana modul Inventaris`.
- [ ] **Step 1:** Tulis tiga tabel persis bagian "Basis data" spec: `equipment` (unique index `equipment_name_brand_lower_idx` pada `(lower(name), lower(brand))`, check `total > 0`), `loan` (check `due_at > started_at`, `returned_at >= started_at`, `loan_returned_by_with_returned_at`, index `loan_returned_at_idx` dan `loan_due_at_idx`), `loanItem` (PK `(loan_id, equipment_id)`, FK `loan_id` cascade dan `equipment_id` **restrict**, check `qty > 0`, `problem_qty >= 0 and <= qty`, `loan_item_note_with_problem`, `loan_item_resolve_needs_problem`, `loan_item_resolved_by_with_at`, index `loan_item_equipment_id_idx`).
- [ ] **Step 2:** `pnpm --filter @workspace/db db:generate` → `0007_*.sql` berisi tiga `CREATE TABLE` dan tanpa `DROP` atau `ALTER` tabel lama.
- [ ] **Step 3:** `pnpm --filter @workspace/db db:migrate` ke DB dev dan DB `_test` → sukses; `pnpm typecheck` → lulus.
- [ ] **Step 4:** Commit `feat(db): skema inventaris dan peminjaman alat`.

### Task 2: Validasi & aturan murni

**Files:**
- Create: `apps/admin/lib/inventaris/schema.ts`, `apps/admin/lib/inventaris/rules.ts`, `apps/admin/lib/wa.ts`
- Modify: `apps/admin/lib/layanan/schema.ts` (pakai `normalizeWa` bersama, hapus transform inline)
- Test: `apps/admin/lib/inventaris/rules.test.ts`

**Interfaces:**
- Produces (`wa.ts`): `normalizeWa(raw: string): string | null` — digit dan `+` opsional di depan, 9–16 digit, selain itu `null`.
- Produces (`schema.ts`): `equipmentInputSchema` → `EquipmentInput { name: string; brand: string; total: number }`; `loanInputSchema` → `LoanInput { borrowerName: string; unitId: number; waNumber: string | null; startedAt: Date; dueAt: Date; items: { equipmentId: number; qty: number }[] }`; `returnInputSchema` → `ReturnInput { returnedAt: Date; items: { equipmentId: number; problemQty: number; problemNote: string | null }[] }`.
- Produces (`rules.ts`): `type LoanStatus = "dipinjam" | "terlambat" | "dikembalikan"`; `loanStatus(loan: { dueAt: Date; returnedAt: Date | null }, now: Date): LoanStatus`; `STATUS_LABELS: Record<LoanStatus, string>` = Dipinjam/Terlambat/Dikembalikan; `type StockRow = { equipmentId: number; qty: number; problemQty: number; returned: boolean; resolved: boolean }`; `type EquipmentStock = { id: number; total: number; onLoan: number; unresolved: number; available: number }`; `summarizeStock(equipment: { id: number; total: number }[], rows: StockRow[]): EquipmentStock[]`.

- [ ] **Step 1: Tes gagal** (`rules.test.ts`):
  - `normalizeWa("0812-3456-7890") === "081234567890"`; `normalizeWa("+62 812 3456 7890") === "+6281234567890"`; `normalizeWa("12345") === null`; `normalizeWa("08a12") === null`.
  - `summarizeStock`: alat `total: 5`; satu baris `{qty: 2, returned: false, problemQty: 0, resolved: false}` → `onLoan 2, unresolved 0, available 3`. Baris yang sama tapi `returned: true, problemQty: 2, resolved: false` → `onLoan 0, unresolved 2, available 3` (**tidak dihitung dua kali**). `returned: true, problemQty: 2, resolved: true` → `available 5`. Alat tanpa baris → `available` = `total`. Alat dengan `qty 3` belum kembali + baris lain `problemQty 1` sudah kembali belum pulih → `available 1`.
  - `loanStatus` dengan `now = new Date("2026-11-20T17:30:00Z")` (21 Nov 00.30 WIB): `dueAt = new Date("2026-11-20T16:59:00Z")` (20 Nov 23.59 WIB) → `"terlambat"`; `dueAt = new Date("2026-11-20T18:00:00Z")` → `"dipinjam"`; `returnedAt` terisi → `"dikembalikan"` walau `dueAt` sudah lewat.
  - `loanInputSchema` menolak: `items: []`, 21 baris, dua baris `equipmentId` sama, `qty: 0`, `dueAt <= startedAt`, `startedAt` 10 menit di masa depan.
  - `returnInputSchema` menolak: `problemQty: 2` tanpa `problemNote`, `problemNote` 2 karakter, `problemQty: -1`.
- [ ] **Step 2: Jalankan** `pnpm --filter admin test rules` → FAIL (modul belum ada).
- [ ] **Step 3: Implementasi** ketiga file dengan tanda tangan di Interfaces. `loanStatus` membandingkan `Date` langsung (perbandingan instan tidak butuh konversi zona; label tanggal di layar yang memakai WIB). `summarizeStock`: satu lintasan `rows`, `onLoan` hanya dari `returned === false`, `unresolved` hanya dari `returned === true && !resolved`.
- [ ] **Step 4: Jalankan** `pnpm --filter admin test` → semua lulus, termasuk tes Layanan yang sudah ada (regresi `normalizeWa` yang dipindah). `pnpm lint && pnpm typecheck` lulus.
- [ ] **Step 5: Commit** `feat(admin): validasi dan aturan inventaris`.

### Task 3: Data alat — query & mutasi

**Files:**
- Create: `apps/admin/lib/inventaris/queries.ts`, `apps/admin/lib/inventaris/mutations.ts`
- Test: `apps/admin/lib/inventaris/equipment.db.test.ts`

**Interfaces:**
- Consumes: `equipmentInputSchema`, `summarizeStock`, `CrudResult`/`guarded`/`UserError` dari `@/lib/setting-crud`.
- Produces (`queries.ts`): `type EquipmentRow = EquipmentStock & { name: string; brand: string; active: boolean }`; `listEquipment(): Promise<EquipmentRow[]>` (urut nama lalu merek); `type ProblemRow = { loanId: number; equipmentId: number; equipmentName: string; problemQty: number; problemNote: string; returnedAt: Date; borrowerName: string }`; `listOpenProblems(): Promise<ProblemRow[]>` (terbaru dulu).
- Produces (`mutations.ts`): `createEquipment(input: unknown): Promise<CrudResult<number>>`; `updateEquipment(id: number, input: unknown): Promise<CrudResult>`; `setEquipmentActive(id: number, active: boolean): Promise<CrudResult>`; `deleteEquipment(id: number): Promise<CrudResult>`; `resolveProblem(loanId: number, equipmentId: number, actorId: string): Promise<CrudResult>`.

- [ ] **Step 1: Tes gagal** (`equipment.db.test.ts`, pola `complaints.db.test.ts`: `describe.skipIf(!TEST_DB)`, `truncate … cascade` di `beforeEach`):
  - `createEquipment` dua kali dengan nama+merek sama (beda huruf besar/kecil) → yang kedua `{ error: "Nama itu sudah ada" }`; nama sama merek beda → sukses dua baris.
  - `listEquipment` untuk alat `total 5` dengan satu peminjaman 2 unit belum kembali → `onLoan 2, available 3`.
  - `updateEquipment` menurunkan `total` ke 1 saat 2 unit dipinjam → `{ error: "Jumlah tidak boleh kurang dari 2 yang sedang dipinjam atau bermasalah" }`; ke 2 → sukses.
  - `deleteEquipment` untuk alat yang pernah dipinjam → `{ error: "Alat ini punya riwayat peminjaman. Nonaktifkan saja agar riwayat tetap terbaca." }`; alat tanpa riwayat → terhapus.
  - `resolveProblem` atas baris `problemQty 2` → `available` naik 2 dan `listOpenProblems` tidak lagi memuatnya; dipanggil kedua kali → `{ error: "Alat sudah dipulihkan" }`; atas baris `problemQty 0` → galat yang sama.
  - `setEquipmentActive(id, false)` → baris tetap terbaca di `listEquipment` dengan `active: false`.
- [ ] **Step 2: Jalankan** `pnpm --filter admin test equipment.db` → FAIL.
- [ ] **Step 3: Implementasi** `queries.ts`: satu `SELECT` alat + satu `SELECT` baris `loan_item` join `loan` (kolom `qty`, `problem_qty`, `returned_at is not null`, `resolved_at is not null`) lalu `summarizeStock`. `mutations.ts`: semua pembungkus `guarded("/inventaris", …)`; `updateEquipment` dan `resolveProblem` dalam `db.transaction` dengan `SELECT … FOR UPDATE` baris alat; `deleteEquipment` menangkap galat FK (`23503`) menjadi pesan di Global Constraints.
- [ ] **Step 4: Jalankan** `pnpm --filter admin test` → lulus; `pnpm lint && pnpm typecheck` lulus.
- [ ] **Step 5: Commit** `feat(admin): query dan mutasi data alat`.

### Task 4: Peminjaman & pengembalian

**Files:**
- Modify: `apps/admin/lib/inventaris/queries.ts`, `apps/admin/lib/inventaris/mutations.ts`
- Test: `apps/admin/lib/inventaris/loan.db.test.ts`

**Interfaces:**
- Consumes: `loanInputSchema`, `returnInputSchema`, `loanStatus`, `listEquipment`.
- Produces (`queries.ts`): `type LoanRow = { id: number; borrowerName: string; unitName: string; itemsLabel: string; startedAt: Date; dueAt: Date; returnedAt: Date | null; status: LoanStatus }`; `listLoans(status: LoanStatus): Promise<LoanRow[]>` (Terlambat urut `dueAt` terlama dulu, lainnya terbaru dulu); `type LoanView = LoanRow & { waNumber: string | null; recordedByName: string; returnedByName: string | null; items: { equipmentId: number; equipmentName: string; brand: string; qty: number; problemQty: number; problemNote: string | null; resolvedAt: Date | null }[] }`; `getLoan(id: number): Promise<LoanView | null>`; `listBorrowOptions(): Promise<{ units: { id: number; name: string }[]; equipment: { id: number; name: string; brand: string; available: number }[] }>` (hanya unit & alat aktif, alat dengan `available > 0`).
- Produces (`mutations.ts`): `createLoan(input: unknown, actorId: string): Promise<CrudResult<number>>`; `returnLoan(loanId: number, input: unknown, actorId: string): Promise<CrudResult>`.

- [ ] **Step 1: Tes gagal** (`loan.db.test.ts`):
  - `createLoan` dengan `qty` melebihi stok → `{ error: "Stok Kamera tersedia hanya 3" }` dan tidak ada baris `loan` tertulis.
  - **Dua `createLoan` bersamaan** atas unit terakhir (`Promise.all` dua panggilan, alat `total 1`): tepat satu sukses, satu `{ error: … }`, dan `listEquipment` menunjukkan `available 0` (bukan negatif).
  - Alat nonaktif → ditolak; unit nonaktif → ditolak.
  - `returnLoan` sukses: `returnedAt`, `returnedBy` terisi, `problemQty` tersimpan, `available` berkurang sebanyak `problemQty`.
  - `returnLoan` dua kali (panggilan kedua setelah yang pertama sukses, dan `Promise.all` dua panggilan) → tepat satu sukses, yang lain `{ error: "Transaksi ini sudah dikembalikan" }`, dan `unresolved` sama dengan satu kali `problemQty`.
  - `returnLoan` yang melewatkan satu alat transaksi → `{ error: "Isi semua alat dalam transaksi ini" }`; yang memuat `equipmentId` di luar transaksi → galat yang sama; keduanya tidak mengubah `loan.returned_at`.
  - `returnedAt` lebih awal dari `startedAt` → ditolak.
  - `INSERT`/`UPDATE` SQL langsung yang melanggar check: `problem_qty > qty`, `problem_qty > 0` tanpa catatan, catatan tanpa `problem_qty` → ketiganya ditolak database.
  - Hapus baris `loan` lewat SQL → `loan_item` ikut terhapus dan `available` kembali ke `total`.
  - `listLoans("terlambat")` hanya memuat transaksi `dueAt` lewat dan belum kembali, urut terlama dulu.
- [ ] **Step 2: Jalankan** `pnpm --filter admin test loan.db` → FAIL.
- [ ] **Step 3: Implementasi** `createLoan`: satu `db.transaction` → validasi zod, cek unit & alat aktif, `SELECT … FOR UPDATE` baris alat **urut `id` menaik**, hitung stok di dalam transaksi, bandingkan per baris (galat menyebut nama alat dan angka), `INSERT loan` + `INSERT loanItem`. `returnLoan`: `db.transaction` → `SELECT … FOR UPDATE` baris `loan`, tolak bila `returned_at` terisi, cocokkan himpunan `equipmentId` input dengan isi transaksi (harus sama persis), validasi tiap `problemQty` terhadap `qty` baris, `UPDATE loan` lalu `UPDATE` tiap `loanItem`.
- [ ] **Step 4: Jalankan** `pnpm --filter admin test` → lulus; `pnpm lint && pnpm typecheck` lulus.
- [ ] **Step 5: Commit** `feat(admin): catat peminjaman dan pengembalian alat`.

### Task 5: Halaman data alat

**Files:**
- Create: `apps/admin/app/(app)/inventaris/page.tsx`, `apps/admin/app/(app)/inventaris/_equipment-grid.tsx`, `apps/admin/app/(app)/inventaris/_problem-panel.tsx`, `apps/admin/app/(app)/inventaris/actions.ts`

**Interfaces:**
- Consumes: `listEquipment`, `listOpenProblems`, `createEquipment`, `updateEquipment`, `setEquipmentActive`, `deleteEquipment`, `resolveProblem`.

- [ ] **Step 1:** Skill `frontend-design:frontend-design` sebelum menulis halaman.
- [ ] **Step 2:** `page.tsx`: `await requirePermission("inventaris.kelola")`, muat kedua query paralel (`Promise.all`), judul + penjelasan singkat. `actions.ts`: satu aksi server per mutasi, masing-masing `await requirePermission("inventaris.kelola")` lebih dulu, `actorId` dari sesi.
- [ ] **Step 3:** `_equipment-grid.tsx` (client): `reui/data-grid` kolom Nama, Merek, Jumlah, Dipinjam, Rusak/hilang, Tersedia, status aktif; tombol "Tambah alat" dan ubah per baris lewat `dialog` + `field`/`input`/`reui/number-field`; Nonaktifkan/Aktifkan dan Hapus lewat `alert-dialog`. Galat dari aksi ditampilkan di dialog, bukan `toast` yang hilang. Kosong → `empty`.
- [ ] **Step 4:** `_problem-panel.tsx`: daftar `listOpenProblems` (alat, jumlah `warning-light`, catatan, peminjam, tanggal kembali, tautan ke `/inventaris/peminjaman/<loanId>`) + tombol Pulihkan (`alert-dialog`). Teks bantu panel menyebut urutan untuk alat hilang permanen: **turunkan jumlah di tabel atas lebih dulu, lalu Pulihkan**. Kosong → `empty` dengan teks "Tidak ada alat bermasalah".
- [ ] **Step 5:** `pnpm dev`: sebagai Manajer tambah 2 alat; sisipkan satu peminjaman di DB dev lewat SQL (halaman peminjaman baru ada di Task 6) → kolom Dipinjam dan Tersedia benar; nonaktifkan dan aktifkan; coba turunkan jumlah di bawah yang dipinjam → pesan berisi angka; coba hapus alat berriwayat → pesan nonaktifkan. Periksa tampilan 375 px.
- [ ] **Step 6:** `pnpm lint && pnpm typecheck` lulus. Commit `feat(admin): halaman data alat dan panel rusak/hilang`.

### Task 6: Halaman peminjaman & pengembalian

**Files:**
- Create: `packages/ui/src/components/domain/loan-item-rows.tsx`, `apps/admin/app/(app)/inventaris/peminjaman/page.tsx`, `.../peminjaman/_loan-list.tsx`, `.../peminjaman/baru/page.tsx`, `.../peminjaman/baru/_loan-form.tsx`, `.../peminjaman/baru/actions.ts`, `.../peminjaman/[id]/page.tsx`, `.../peminjaman/[id]/_return-form.tsx`, `.../peminjaman/[id]/actions.ts`
- Modify: `apps/admin/app/(app)/galeri/_demo-forms.tsx` (tambah demo `LoanItemRows`)

**Interfaces:**
- Consumes: `listLoans`, `getLoan`, `listBorrowOptions`, `createLoan`, `returnLoan`, `STATUS_LABELS`.
- Produces: `LoanItemRows` dengan prop `rows: { equipmentId: number | null; qty: number }[]`, `options: { id: number; name: string; brand: string; available: number }[]`, `onChange(rows)`, `max?: number` (default 20) — bentuk tepat prop lain diserahkan ke pembangun, mengikuti `domain/assignment-rows.tsx`.
- [ ] **Step 1:** `loan-item-rows.tsx` di `packages/ui`: per baris `combobox` alat (opsi menampilkan "Nama · Merek" dan sisa stok) + `reui/number-field` jumlah (maks = `available` alat terpilih) + tombol hapus baris; tombol "Tambah alat" sampai `max`. Alat yang sudah dipilih tidak muncul lagi di baris lain. Tambahkan demo ke galeri agar komponen ada di `/galeri` (aturan CLAUDE.md).
- [ ] **Step 2:** `/inventaris/peminjaman`: `requirePermission("peminjaman.catat")`; `tabs` Dipinjam · Terlambat · Dikembalikan lewat `?status=` (nilai tak valid → Dipinjam); `table` kolom peminjam, unit, alat (`itemsLabel`), mulai, rencana kembali, badge status; baris menaut ke detail; tombol "Catat peminjaman"; kosong → `empty`.
- [ ] **Step 3:** `/inventaris/peminjaman/baru`: formulir nama peminjam, unit (`select`), WA (opsional), mulai & rencana kembali (`examples/c-calendar-24` + `reui/time-picker`, default mulai = sekarang WIB), `LoanItemRows`. Sukses → redirect `/inventaris/peminjaman`.
- [ ] **Step 4:** `/inventaris/peminjaman/[id]`: `getLoan` null → `notFound()`. Detail transaksi + pencatat. Belum kembali: formulir pengembalian — waktu kembali (tanggal + jam, default sekarang) dan satu baris per alat dengan `reui/number-field` jumlah bermasalah (maks `qty`) + `textarea` catatan yang **wajib dan baru muncul saat jumlah > 0**. Sudah kembali: ringkasan kendala per alat (badge `warning-light` bila belum dipulihkan, `success-light` bila sudah) tanpa formulir.
- [ ] **Step 5:** `pnpm dev` sebagai SDM Khusus: catat peminjaman 2 alat → muncul di tab Dipinjam; kembalikan dengan 1 alat bermasalah → tab Dikembalikan, dan sebagai Manajer stok di `/inventaris` berkurang lalu kembali setelah Pulihkan. Coba pinjam melebihi stok → pesan menyebut nama alat. Periksa 375 px.
- [ ] **Step 6:** Skill `anthropic-skills:web-design-guidelines` atas semua halaman Inventaris; MCP reui `validate_usage` + `get_audit_checklist` untuk `data-grid`, `number-field`, `time-picker`, `badge`; perbaiki temuan.
- [ ] **Step 7:** `pnpm lint && pnpm typecheck && pnpm --filter admin test` lulus. Commit `feat(admin): halaman peminjaman dan pengembalian alat`.

### Task 7: Verifikasi akses langsung

**Files:**
- Modify: `scripts/verify-access.sh`

- [ ] **Step 1:** Tambah `/inventaris` dan `/inventaris/peminjaman` ke bagian "Tanpa sesi → /masuk". Setelah login:
  - Direktur: `/inventaris`, `/inventaris/peminjaman`, `/inventaris/peminjaman/baru` → `307 …/?akses=ditolak`.
  - SDM Khusus: `/inventaris/peminjaman` dan `/inventaris/peminjaman/baru` → 200; `/inventaris` → ditolak.
  - Manajer: ketiganya → 200.
  - Akun tanpa peran (Staf Unit Lain): semuanya → ditolak.
  - `/inventaris/peminjaman/<id tak dikenal>` → 404.
- [ ] **Step 2:** Jalankan skrip terhadap `pnpm dev` → semua PASS.
- [ ] **Step 3:** Commit `chore: verifikasi akses Inventaris`.
