# Inventaris & Peminjaman Alat (Tahap 1)

Tanggal: 20 November 2026 · Acuan: spesifikasi §9 (Inventaris & Peminjaman), §3.3 (matriks akses), §10.2 (notifikasi); PRD (aturan kunci inventaris, celah #7 dan #9); spec Layanan dan Laporan Harian.

## Tujuan

Unit IT & Media bisa memastikan keberadaan alat:

1. **Data alat** (nama, merek, jumlah) dikelola Manajer, dengan **stok tersedia** yang terhitung sendiri: jumlah − sedang dipinjam − rusak/hilang yang belum dipulihkan.
2. **Peminjaman** dicatat staf unit (semua kecuali Direktur) untuk peminjam dari unit mana pun. Peminjam **tidak perlu login**; staf yang mencatat tercatat sebagai penanggung jawab.
3. **Pengembalian** sekaligus per transaksi, dengan **jumlah alat bermasalah + catatan** per alat. Jumlah itu menahan stok sampai Manajer memulihkannya.

Modul ini menggantikan peminjaman lisan/WA yang tidak tercatat (PRD: "Peminjaman alat tidak tercatat, stok dan keberadaan alat sulit dipastikan") dan menutup sasaran "Peminjaman alat tercatat 100%".

**Bukan tujuan:**

- Notifikasi jatuh tempo atau pengingat ke peminjam: modul Notifikasi. Di sini cukup tersedia datanya (`due_at`, status Terlambat).
- Halaman publik untuk peminjam mengisi sendiri. §9.2 menetapkan pencatatan oleh staf unit.
- Pengembalian sebagian (§9.3 eksplisit: sekaligus satu transaksi).
- Barcode/QR, foto kondisi alat, riwayat perbaikan, nilai/penyusutan aset, ekspor PDF.
- Reservasi alat untuk tanggal di masa depan (pinjam = alat langsung keluar).

**Anti-tujuan:**

- Stok tersedia bisa negatif, atau dua pencatatan bersamaan sama-sama mengambil unit terakhir.
- Angka rusak/hilang yang tidak cocok dengan catatannya, atau yang jejaknya hilang (tidak tahu dari transaksi mana).
- Teks bebas dipakai sebagai sumber hitungan stok (celah PRD #7).
- Data alat bisa dihapus padahal masih punya riwayat peminjaman, sehingga transaksi lama kehilangan nama alat.
- Manajer menurunkan jumlah alat di bawah yang sedang dipinjam.

## Keputusan pengguna

| Topik | Keputusan |
| --- | --- |
| Kendala saat pengembalian (§9.3 hanya menyebut teks bebas, tapi rumus stok butuh angka — celah PRD #7) | **Angka + catatan wajib.** Per alat: jumlah bermasalah 0–jumlah yang dipinjam, dan bila > 0 catatan wajib. Angka itulah yang mengurangi stok tersedia sampai Manajer memulihkan. |
| Pendekatan pembukuan rusak/hilang | Diserahkan ke pembangun; dipilih **cara 1** di bawah. |

## Approaches

1. **Rusak/hilang tersimpan di baris peminjaman** (`loan_item.problem_qty`, `problem_note`, `resolved_at`), stok dihitung dari situ: **dipilih**. Satu sumber data untuk angka dan catatannya sekaligus, jadi keduanya tidak mungkin melenceng; jejak transaksi penyebab ikut terbawa gratis; "pulihkan" cukup satu penanda. Juga paling sedikit kode: tidak ada kolom tambahan di tabel alat dan tidak ada kode penyelaras. Biaya: stok tersedia selalu lewat satu query agregat, bukan satu kolom yang dibaca langsung.
2. **Kolom hitungan `damaged` di tabel alat**, ditambah saat pengembalian dan dikurangi Manajer: ditolak. Angka itu salinan dari catatan pengembalian; setiap jalur yang lupa menambah atau mengurangi membuat stok salah tanpa tanda, dan jejak "rusak dari transaksi mana" tidak ada. Pola salinan-lalu-sinkron yang sama sudah ditolak di modul Laporan Harian dan Layanan.
3. **Tabel terpisah `equipment_issue`**: ditolak. Isinya persis data yang sudah ada di baris peminjaman (alat, jumlah, catatan, transaksi), jadi satu tabel tambahan tanpa informasi tambahan.

**Status transaksi tanpa kolom status (keputusan pembangun).** Status diturunkan, bukan disimpan: `returned_at` kosong & `due_at` belum lewat → **Dipinjam**; `returned_at` kosong & `due_at` sudah lewat → **Terlambat**; `returned_at` terisi → **Dikembalikan**. Alasan: Terlambat berubah sendiri karena waktu berjalan, jadi kolom status justru harus diperbarui terus-menerus.

## Rancangan

### Alur

```
Catat peminjaman ──▶ Dipinjam ──(due_at terlewat)──▶ Terlambat
                         │                              │
                         └────── isi pengembalian ──────┘
                                        │
                                        ▼
                                  Dikembalikan
                                        │
                        ada alat bermasalah (jumlah > 0)
                                        │
                                        ▼
                        stok tertahan ──Manajer pulihkan──▶ stok kembali
```

### Stok tersedia

Untuk satu alat `e`:

```
tersedia(e) = e.total
            − Σ qty         dari baris peminjaman yang transaksinya BELUM dikembalikan
            − Σ problem_qty dari baris peminjaman yang transaksinya SUDAH dikembalikan
                            dan resolved_at masih kosong
```

Transaksi yang belum dikembalikan sudah dikurangi penuh lewat `qty`, jadi `problem_qty`-nya tidak dihitung dua kali (dan memang baru terisi saat pengembalian). Fungsi hitungnya murni dan diuji unit; query cukup satu `SELECT` dengan dua agregat untuk seluruh daftar alat.

### Basis data (`packages/db/src/schema/inventory.ts`, baru)

`equipment`

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | serial PK | |
| `name` | text not null | 2–80 karakter |
| `brand` | text not null | 1–80 karakter. Wajib karena §9.1 menyebutnya isian; alat tanpa merek diisi `-`. *Keputusan pembangun:* wajib agar kunci unik di bawah tidak berurusan dengan NULL. |
| `total` | integer not null | check `> 0`. Alat yang sudah habis **dinonaktifkan**, bukan diset 0, supaya daftar tidak dipenuhi baris kosong. |
| `active` | boolean not null default true | nonaktif = tidak bisa dipinjam lagi, riwayat tetap terbaca |
| `created_at` | timestamptz | |

Unique index `equipment_name_brand_lower_idx` pada `(lower(name), lower(brand))` — "Kamera / Canon" dan "Kamera / Sony" adalah dua alat berbeda.

`loan`

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | serial PK | |
| `borrower_name` | text not null | 2–80 karakter |
| `unit_id` | int FK `unit` restrict, not null | |
| `wa_number` | text nullable | opsional (§9.2); bila diisi dinormalisasi seperti Layanan: hanya digit dan `+`, 9–16 digit |
| `started_at` | timestamptz not null | tanggal & jam mulai pinjam |
| `due_at` | timestamptz not null | check `due_at > started_at` |
| `returned_at` | timestamptz nullable | check `returned_at >= started_at` |
| `recorded_by` | text FK `user` restrict | staf pencatat |
| `returned_by` | text FK `user` nullable | staf penerima pengembalian |
| `created_at` | timestamptz | |

Tidak ada kolom catatan umum transaksi: §9.2 tidak memintanya, dan catatan kendala sudah ada per alat.

Check `loan_returned_by_with_returned_at`: `(returned_at is null) = (returned_by is null)`.
Index `loan_returned_at_idx` dan `loan_due_at_idx` untuk tab daftar.

`loan_item`

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `loan_id` | int FK `loan` **cascade** | |
| `equipment_id` | int FK `equipment` **restrict** | |
| | | PK `(loan_id, equipment_id)` — satu alat maksimal satu baris per transaksi |
| `qty` | integer not null | check `> 0` |
| `problem_qty` | integer not null default 0 | check `>= 0 and <= qty` |
| `problem_note` | text nullable | 3–500 karakter |
| `resolved_at` | timestamptz nullable | diisi Manajer |
| `resolved_by` | text FK `user` nullable | |

Check constraint:

- `loan_item_note_with_problem`: `(problem_qty > 0) = (problem_note is not null)` — angka tanpa catatan dan catatan tanpa angka sama-sama ditolak database, bukan hanya oleh form.
- `loan_item_resolve_needs_problem`: `problem_qty = 0` ⇒ `resolved_at` dan `resolved_by` null.
- `loan_item_resolved_by_with_at`: `(resolved_at is null) = (resolved_by is null)`.

Index `loan_item_equipment_id_idx` (dipakai query stok).

`problem_qty` hanya boleh terisi saat transaksinya sudah dikembalikan. Aturan lintas tabel ini tidak bisa jadi check constraint, jadi dijaga di satu-satunya jalur tulisnya (`returnLoan`) dan diuji di `*.db.test.ts`.

`ON DELETE RESTRICT` di `equipment_id` memastikan alat yang pernah dipinjam tidak bisa terhapus diam-diam; `cascade` di `loan_id` membuat penghapusan transaksi membersihkan barisnya.

### Aturan (`apps/admin/lib/inventaris/`)

Struktur mengikuti modul lain: `schema.ts` (zod murni, dipakai server & form), `rules.ts` (fungsi murni: hitung stok, label status, normalisasi WA), `queries.ts`, `mutations.ts`, dan tes `rules.test.ts` / `inventaris.db.test.ts`. Normalisasi nomor WA diambil dari transform yang sudah ada di `lib/layanan/schema.ts` — dipindah ke tempat bersama karena dipakai dua modul, bukan disalin.

**Data alat** (`inventaris.kelola`). Pola `setting-crud.ts` (`guarded()` + pesan "Nama itu sudah ada") dengan dua tambahan:

- `total` wajib dan harus `>= dipinjam + rusak belum dipulihkan`. Menurunkannya di bawah itu → `UserError "Jumlah tidak boleh kurang dari N yang sedang dipinjam atau bermasalah"`. Dihitung dalam transaksi yang mengunci baris alat.
- **Hapus** tersedia, tapi hanya berhasil bila alat belum pernah masuk transaksi; FK menolak sisanya → pesan `"Alat ini punya riwayat peminjaman. Nonaktifkan saja agar riwayat tetap terbaca."`

**Catat peminjaman** (`createLoan`, izin `peminjaman.catat`), satu transaksi:

1. Validasi zod: nama peminjam, unit, `started_at`/`due_at`, minimal 1 baris alat, maksimal 20, tidak ada alat ganda, `qty >= 1`. `started_at` tidak boleh lebih dari 5 menit di masa depan (pola sama dengan Pengaduan Internet) — *keputusan pembangun:* ini yang menegakkan anti-tujuan "bukan reservasi"; peminjaman dicatat saat alat benar-benar keluar, bukan dijadwalkan.
2. Unit harus aktif; semua alat harus ada dan **aktif**.
3. `SELECT … FOR UPDATE` baris alat yang dipinjam, **diurutkan `id` menaik** agar dua pencatatan bersamaan tidak saling menunggu (deadlock).
4. Hitung stok tersedia di dalam transaksi itu. `qty > tersedia` → `UserError "Stok <nama> tersedia hanya N"` (menyebut alat dan angkanya, bukan pesan umum).
5. Simpan `loan` + semua `loan_item`.

**Pengembalian** (`returnLoan`, izin `peminjaman.catat`), satu transaksi:

1. Kunci baris `loan`; `returned_at` harus kosong, kalau tidak → `UserError "Transaksi ini sudah dikembalikan"`.
2. Input: `returnedAt` (tanggal & jam) dan satu baris per alat dalam transaksi: `{equipmentId, problemQty, problemNote}`. Semua alat transaksi wajib ada di input (pengembalian sekaligus, §9.3), dan tidak boleh ada alat di luar transaksi.
3. `returnedAt >= started_at` dan tidak lebih dari 5 menit di masa depan.
4. `problemQty` 0–`qty`; `> 0` → `problemNote` wajib 3–500 karakter.
5. Set `returned_at`, `returned_by`, lalu perbarui tiap `loan_item`.

**Pulihkan alat bermasalah** (`resolveProblem`, izin `inventaris.kelola`): kunci baris, `problem_qty > 0` dan `resolved_at` kosong, lalu set `resolved_at`/`resolved_by`. Stok tersedia naik sendiri.

Alat yang **hilang permanen** adalah dua langkah berurutan oleh Manajer: turunkan `total` di data alat, lalu Pulihkan baris itu. Pulihkan sendirian berarti "alat sudah berfungsi lagi" dan tidak mengubah `total`. Urutan ini disengaja: bila dipulihkan dulu, pemeriksaan `total >= dipinjam + bermasalah` tidak lagi menahan penurunan yang keliru. Teks bantu di layar menyebutkan urutannya.

### Halaman (`apps/admin/app/(app)/inventaris/`)

Menu dan izin sudah terdaftar (`apps/admin/lib/menu.tsx`, `packages/auth/src/permissions.ts`); URL di bawah mengikuti yang sudah ada di menu. Direktur tidak punya kedua izin, jadi grup Inventaris tidak muncul untuknya — sesuai §9.2.

| Rute | Izin | Isi |
| --- | --- | --- |
| `/inventaris` | `inventaris.kelola` | **Data alat**: `data-grid` kolom nama, merek, jumlah, dipinjam, rusak/hilang, tersedia; tambah/ubah/nonaktif/hapus. Di bawahnya panel **"Rusak & hilang"**: daftar baris belum dipulihkan (alat, jumlah, catatan, transaksi asal, tanggal) + tombol Pulihkan. |
| `/inventaris/peminjaman` | `peminjaman.catat` | Daftar transaksi dengan tab **Dipinjam · Terlambat · Dikembalikan**; kolom peminjam, unit, alat (ringkas), mulai, rencana kembali, badge status. Terlambat diurut paling lama dulu. Tombol "Catat peminjaman". |
| `/inventaris/peminjaman/baru` | `peminjaman.catat` | Formulir peminjaman. Tiap baris alat menampilkan stok tersedia saat itu; sukses → `/inventaris/peminjaman`. |
| `/inventaris/peminjaman/[id]` | `peminjaman.catat` | Detail transaksi + formulir pengembalian (satu baris per alat: jumlah bermasalah + catatan). Setelah dikembalikan, formulir diganti ringkasan kendala. |

Komponen: semua dari galeri/`packages/ui` yang sudah ada — `reui/data-grid`, `reui/number-field`, `reui/time-picker`, `examples/c-calendar-24` (tanggal), `combobox`, `field`, `input`, `textarea`, `select`, `badge`, `tabs`, `table`, `alert-dialog`, `empty`, `card`, `domain/setting-list` sebagai pola daftar. **Tidak ada komponen baru yang dipasang.** Satu komponen domain baru dirakit dari yang sudah ada: `packages/ui/src/components/domain/loan-item-rows.tsx` (baris alat: `combobox` alat + `number-field` jumlah + tombol hapus baris + sisa stok), mengikuti bentuk `domain/assignment-rows.tsx`. Pekerjaan visual mengikuti CLAUDE.md: skill `frontend-design` sebelum menulis halaman, `web-design-guidelines` atas hasilnya.

## Pengujian

- **Unit (`rules.test.ts`)**: rumus stok tersedia (termasuk transaksi belum dikembalikan tidak dihitung dua kali, baris bermasalah yang sudah dipulihkan tidak lagi menahan stok, alat tanpa transaksi); label status Dipinjam/Terlambat/Dikembalikan di sekitar batas `due_at` (zona WIB); normalisasi nomor WA; validasi pengembalian (jumlah bermasalah di luar rentang, catatan kosong saat jumlah > 0).
- **Database (`inventaris.db.test.ts`, pola `*.db.test.ts` yang ada)**:
  - dua `createLoan` bersamaan atas unit terakhir → satu sukses, satu `UserError`, stok tidak negatif;
  - `qty` melebihi stok tersedia → ditolak, tidak ada baris tertulis;
  - alat nonaktif atau unit nonaktif → ditolak;
  - `returnLoan` dua kali → yang kedua gagal; input yang melewatkan satu alat transaksi → gagal;
  - `problem_qty > qty`, serta angka tanpa catatan dan catatan tanpa angka → ditolak check constraint lewat SQL langsung;
  - baris bermasalah menahan stok; `resolveProblem` memulihkannya; pulihkan dua kali → gagal;
  - menurunkan `total` di bawah dipinjam + bermasalah → ditolak;
  - `DELETE` alat yang punya riwayat lewat SQL langsung → ditolak FK RESTRICT; hapus lewat aksi → pesan "nonaktifkan saja";
  - hapus transaksi → baris `loan_item` ikut terhapus (cascade) dan stok kembali.
- **Otorisasi** per peran untuk setiap rute dan aksi server, termasuk akses langsung lewat URL: Direktur ditolak di kedua halaman; staf dengan `peminjaman.catat` saja ditolak di `/inventaris` dan di `resolveProblem` (kriteria penerimaan PRD).

## Diserahkan ke pembangun

- Urutan migrasi drizzle (tabel `equipment`, `loan`, `loan_item`; tidak ada perubahan tabel lama).
- Di mana normalisasi nomor WA bersama diletakkan setelah dipindah dari `lib/layanan/schema.ts`.
- Penamaan file/fungsi di `lib/inventaris/` dan pesan galat di luar yang disebut di atas.
- Bentuk tepat prop `domain/loan-item-rows.tsx`.
- Tata letak rinci halaman dan bentuk ringkas kolom "alat" di daftar transaksi, mengikuti pola halaman Tugas/Planner yang ada.
- Data awal alat diisi Manajer sebelum uji coba (celah PRD #9); tidak ada seed di kode.
