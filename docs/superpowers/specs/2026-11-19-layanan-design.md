# Layanan: Pengajuan SDM & Pengaduan Internet (Tahap 1)

Tanggal: 19 November 2026 · Acuan: spesifikasi §8 (Layanan), §5A (Tugas dari Manajer), §4.5 (hapus entri Planner), §3.3 (matriks akses), §10.2 (notifikasi); spec Media Planner dan Laporan Harian.

## Tujuan

Pegawai sekolah mana pun, termasuk akun tanpa peran (Staf Unit Lain), bisa:

1. **Mengajukan SDM** ke unit IT & Media untuk sebuah kegiatan, lalu memantau status dan susunan SDM terbaru di "Pengajuan Saya". Manajer menyetujui (sekaligus memilih orang dan satu tindak lanjut), menolak, atau membatalkan.
2. **Mengadukan kendala internet** sebagai catatan evaluasi. Staf unit dan Direktur melihat daftar dan rekap per gedung, per jenis kendala, dan per pekan.

Modul ini menggantikan permintaan lewat WA yang tidak tercatat, dan menutup tautan §5A ("Tugas dari Manajer dari Pengajuan SDM") yang ditunda modul Laporan Harian.

**Bukan tujuan:**

- Notifikasi (pengajuan baru → Manajer; status berubah → pengaju): modul Notifikasi. Di sini cukup tersedia data yang dibutuhkan (status, waktu keputusan, pengaju).
- Login lewat sistem informasi sekolah. Staf unit lain sementara memakai akun lokal yang dibuat Manajer.
- Riwayat pengaduan untuk pengaju (pengaduan tidak punya status).
- Ekspor/PDF rekap pengaduan.

**Anti-tujuan:**

- Satu pengajuan menghasilkan entri Planner **dan** Tugas dari Manajer sekaligus (tugas muncul dua kali di laporan harian).
- Pengajuan berstatus Disetujui tanpa tindak lanjut, atau tindak lanjutnya terhapus diam-diam sehingga pengaju melihat susunan kosong tanpa penjelasan.
- "Pengajuan Saya" menampilkan susunan SDM yang basi setelah Manajer mengubah Planner atau tugas.
- Unit lain bisa melihat pengaduan, pengajuan orang lain, atau rundown orang lain. Semua dicek di server.

## Keputusan pengguna

| Topik | Keputusan |
| --- | --- |
| Isi "SDM 1, SDM 2, dst." oleh pengaju | **A. Jenis tugas saja.** Manajer memilih orangnya saat menyetujui. |
| Tindak lanjut tertaut dihapus | Status **Dibatalkan** beserta **catatan dari Manajer**, terlihat di "Pengajuan Saya". |
| Alur persetujuan, Pengajuan Saya, formulir & rekap pengaduan | Disetujui sesuai rangkuman di percakapan (lihat Rancangan). |
| Pendekatan tautan | **Cara 1**: tautan disimpan sebagai FK, susunan dibaca langsung lewat join, penghapusan dijaga `ON DELETE RESTRICT` sehingga wajib lewat fungsi batal. |

## Approaches

1. **Tautan FK, dibaca langsung, hapus dijaga RESTRICT**: dipilih. Aturan "satu tindak lanjut" dan "batal wajib bercatatan" dijaga database/transaksi; "Pengajuan Saya" selalu terbaru tanpa kode sinkron. Biaya: fungsi hapus Planner dan Tugas dari Manajer ikut disentuh.
2. **Kolom `service_request_id` di entri Planner dan tugas saja**: ditolak sebagai pola utama. Aturan "hanya satu tindak lanjut" tersebar di dua tabel, rawan balapan.
3. **Salin susunan SDM ke pengajuan lalu sinkronkan**: ditolak dengan alasan yang sama seperti di Laporan Harian: setiap jalur ubah wajib ikut menyinkronkan; satu yang luput membuat data salah tanpa tanda.

**Penyesuaian cara 1 untuk jalur Tugas dari Manajer (keputusan pembangun, perlu dicek pengguna).** `manager_task` hanya punya satu judul dan tidak punya jenis tugas, dan `manager_task_assignee` berkunci `(task_id, user_id)`. Agar "Dokumentasi oleh Budi" dan "Editing oleh Sari" tetap terbaca per orang, persetujuan jalur ini membuat **satu `manager_task` per baris SDM** (judul `"<Jenis> · <Nama kegiatan>"`, satu orang). Karena itu tautan jalur ini ditaruh di sisi tugas (`manager_task.service_request_id`, banyak tugas → satu pengajuan). Aturan satu tindak lanjut tetap dijaga di `service_request.follow_up` + kunci baris pengajuan (lihat Aturan). Jalur Planner tetap memakai `service_request.planner_entry_id` dengan `ON DELETE RESTRICT`.

## Rancangan

### Status & alur Pengajuan SDM

```
Diajukan ──setujui+tindak lanjut──▶ Disetujui ──batalkan (catatan wajib)──▶ Dibatalkan
    │
    ├──tolak (alasan wajib)──▶ Ditolak
    └──ditarik pengaju──▶ (baris dihapus)
```

- **Diajukan → Disetujui** terjadi dalam satu transaksi bersama pembuatan tindak lanjut. Tidak ada status "disetujui tapi belum ditindaklanjuti".
- **Ditarik pengaju**: hanya selama Diajukan; baris pengajuan dan objek rundown dihapus (tidak ada yang perlu diaudit karena belum diputuskan).
- **Dibatalkan**: hanya dari Disetujui. Susunan SDM terakhir disalin ke pengajuan (snapshot) karena sumbernya ikut terhapus.
- Ditolak dan Dibatalkan bersifat final.

### Basis data (`packages/db/src/schema/service.ts`, baru)

`service_request`

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `id` | serial PK | |
| `activity_name` | text not null | 2–120 karakter |
| `start_date`, `end_date` | date not null | check `end_date >= start_date` |
| `unit_id` | int FK `unit` restrict | |
| `wa_number` | text not null | dinormalisasi: hanya digit dan `+`, 9–16 digit |
| `fee_agreed` | boolean not null | check `= true` |
| `rundown_key`, `rundown_name`, `rundown_mime`, `rundown_size` | nullable | objek di storage, prefix `requests/` |
| `status` | enum `diajukan`/`disetujui`/`ditolak`/`dibatalkan` | default `diajukan` |
| `follow_up` | enum `planner`/`tugas`, nullable | |
| `planner_entry_id` | int FK `planner_entry` **restrict**, nullable, unique | |
| `manager_note` | text nullable | catatan setuju/alasan tolak/catatan batal |
| `cancelled_staff` | jsonb nullable | snapshot `[{name, taskTypeName, start, end}]` |
| `requested_by` | text FK `user` restrict | |
| `decided_by` | text FK `user` nullable | |
| `decided_at`, `cancelled_at` | timestamptz nullable | |
| `created_at`, `updated_at` | timestamptz | |

Check constraint:

- `status = 'diajukan'` ⇒ `follow_up`, `planner_entry_id`, `decided_*` null.
- `status = 'disetujui'` ⇒ `follow_up` not null; `(follow_up = 'planner') = (planner_entry_id is not null)`.
- `status = 'ditolak'` ⇒ `manager_note` not null dan `follow_up` null.
- `status = 'dibatalkan'` ⇒ `manager_note` not null, `planner_entry_id` null, `cancelled_staff` not null.

`service_request_staff` (kebutuhan dari pengaju; tidak berubah setelah diajukan)

| Kolom | Catatan |
| --- | --- |
| `request_id` FK cascade, `position` int | PK `(request_id, position)` |
| `task_type_id` FK `task_type` restrict | |

`manager_task`: tambah `service_request_id` int nullable FK `service_request` restrict, index.

`internet_complaint`

| Kolom | Catatan |
| --- | --- |
| `id` serial | |
| `building_id` FK `building` restrict | |
| `room` text not null | 1–80 karakter |
| `issue` enum `a`–`f` | label teks di satu konstanta (spesifikasi §8.2) |
| `started_at` timestamptz not null | tidak boleh lebih dari 5 menit di masa depan |
| `others_affected` enum `ya`/`tidak`/`tidak_tahu` | |
| `description` text nullable | ≤ 1000 karakter |
| `reported_by` FK `user` restrict | |
| `created_at` | |

Index `internet_complaint_started_at_idx`.

### Aturan (`apps/admin/lib/layanan/`)

Struktur mengikuti modul lain: `schema.ts` (zod murni, dipakai server & form), `rules.ts` (fungsi murni), `queries.ts`, `mutations.ts`, dan tes `*.test.ts` / `*.db.test.ts`.

**Mengajukan** (`layanan.ajukan`): validasi zod; unit dan semua jenis tugas harus aktif; minimal 1 baris SDM, maksimal 20; centang fee wajib. Rundown opsional (lihat Lampiran).

**Menarik** (pengaju sendiri, status Diajukan): kunci baris, hapus, lalu hapus objek rundown (gagal hapus objek dicatat saja; penyapu menangkapnya).

**Setujui → Tugas dari Manajer** (`layanan.setujui_sdm`), satu transaksi:
1. `SELECT … FOR UPDATE` pengajuan; harus `diajukan`.
2. Input: daftar baris `{personId, taskTypeId, start, end}` (boleh ditambah/dikurangi/diubah dari kebutuhan pengaju; default tanggal = tanggal kegiatan), catatan opsional. Orang harus dari `listReporters()` (staf unit pengisi laporan), jenis aktif, minimal 1 baris.
3. Untuk tiap baris buat `manager_task` (`title = "<Jenis> · <Nama kegiatan>"`, `service_request_id`, `created_by` = Manajer) + satu `manager_task_assignee`. Lewat fungsi internal yang dipakai bersama `createManagerTask` agar validasi sama.
4. Set `status = disetujui`, `follow_up = tugas`, `manager_note`, `decided_*`.

**Setujui → Entri Planner**: tombol membuka `/planner/baru?pengajuan=<id>`. Form Planner terisi nama kegiatan, tanggal kegiatan, dan baris penugasan (jenis dari kebutuhan, orang kosong, tanggal = tanggal kegiatan), plus kolom tambahan **"Catatan untuk pengaju"**. `createEntry` menerima `requestId` dan catatan opsional; dalam transaksi yang sama ia mengunci pengajuan (harus `diajukan`, kalau tidak: `UserError "Pengajuan sudah diputuskan"`), lalu set `disetujui`, `follow_up = planner`, `planner_entry_id`. Form ditutup = tidak ada perubahan. Halaman ini tetap butuh `planner.ubah` **dan** `layanan.setujui_sdm` bila `pengajuan` diisi.

**Tolak**: kunci, harus `diajukan`, alasan wajib (3–500 karakter).

**Batalkan** (`cancelRequest(tx, requestId, note, actorId)`, fungsi internal):
1. Kunci pengajuan; harus `disetujui`.
2. Ambil susunan terkini (lihat "Susunan SDM") → simpan ke `cancelled_staff`.
3. Jalur Planner: lepas `planner_entry_id` (set null) **sebelum** entri dihapus. Jalur tugas: lepas `service_request_id` dari semua tugas tertaut.
4. Set `dibatalkan`, `manager_note = note`, `cancelled_at`, `decided_by` = pembatal.

Dipanggil dari tiga tempat:
- **Tombol "Batalkan pengajuan"** di detail pengajuan (`layanan.setujui_sdm`, catatan wajib): batalkan, lalu hapus entri Planner (memakai `deleteEntry` termasuk aturan §4.5: Review ke atas butuh ketik nama) atau semua tugas tertaut, dalam transaksi yang sama.
- **`deleteEntry`** (Planner): bila entri tertaut ke pengajuan, `cancelNote` wajib; panggil `cancelRequest` di transaksi yang sama sebelum `DELETE`. Tanpa catatan → `UserError "Isi catatan pembatalan untuk pengaju"`.
- **`deleteManagerTask`**: bila tugas tertaut dan merupakan **tugas tertaut terakhir** pengajuan itu, `cancelNote` wajib dan `cancelRequest` dipanggil. Bila masih ada tugas tertaut lain, tugas dihapus biasa (susunan berkurang, pengajuan tetap Disetujui). `deleteManagerTask` dibungkus transaksi dengan kunci baris pengajuan agar dua penghapusan bersamaan tidak sama-sama mengira "bukan yang terakhir".

`ON DELETE RESTRICT` memastikan jalur hapus mana pun yang lupa memanggil `cancelRequest` gagal dengan error, bukan diam-diam.

**Edit setelah disetujui**: Manajer mengubah orang/tanggal lewat halaman Planner atau Tugas dari Manajer yang sudah ada (tautan dari detail pengajuan). Tidak ada form edit terpisah di Layanan.

### Susunan SDM (dibaca langsung)

`staffFor(requestId)`:
- `follow_up = planner`: `planner_assignment` entri tertaut join `user` & `task_type` → `{name, taskTypeName, start, end}`.
- `follow_up = tugas`: semua `manager_task` dengan `service_request_id` join assignee & `user` → `{name, title, start, end}` (judul tugas memuat jenis, dan bisa diubah Manajer).
- `dibatalkan`: `cancelled_staff`.
- `diajukan`/`ditolak`: kebutuhan pengaju (jenis tugas saja, tanpa nama).

### Lampiran rundown

- Pola sama dengan unggahan Kanban: `startRundownUpload(file)` → presign POST ke key `requests/<uuid>.<ext>`; form klien mengunggah, lalu mengirim `rundownKey` bersama pengajuan. `createRequest` memverifikasi `statObject` (ada, ≤ 10 MB, MIME cocok dengan ekstensi key) sebelum menyimpan.
- Format: PDF, JPG, PNG, WEBP, DOC/DOCX, XLS/XLSX. Maks 10 MB.
- Unduh lewat route `GET /api/layanan/rundown/[id]`: hanya pengaju pemilik atau pemegang `layanan.setujui_sdm`; redirect ke `presignRead` dengan `downloadName`.
- Penyapu yatim (`sweepOrphans`) diperluas ke prefix `requests/` dengan tabel `service_request.rundown_key` sebagai daftar kunci yang dikenal (objek yang diunggah tapi pengajuannya tak pernah dikirim, atau pengajuan ditarik).

### Pengaduan Internet

- `createComplaint` (`layanan.ajukan`): gedung aktif, validasi di atas. Setelah sukses tampilkan pesan dari spesifikasi §8.2.
- Rekap (`pengaduan.lihat`) per **bulan** berdasarkan `started_at` (zona WIB):
  - per pekan: pekan **Senin–Minggu** (pengaduan bisa terjadi hari Minggu, jadi berbeda dari pekan kerja Laporan Harian; keputusan pembangun), label "2–8 Nov";
  - per gedung, per jenis kendala: hitungan, urut terbanyak, baris 0 tidak ditampilkan;
  - daftar pengaduan bulan itu, terbaru dulu.
- Fungsi pengelompokan murni di `rules.ts` (diuji unit), query cukup satu `SELECT` per bulan.

### Halaman (`apps/admin/app/(app)/layanan/`)

Menu dan izin sudah terdaftar di `apps/admin/lib/menu.tsx` dan `packages/auth/src/permissions.ts`.

| Rute | Izin | Isi |
| --- | --- | --- |
| `/layanan` | `layanan.ajukan` | Redirect ke `/layanan/sdm` |
| `/layanan/sdm` | `layanan.ajukan` | Formulir pengajuan; sukses → `/layanan/sdm/saya` |
| `/layanan/sdm/saya` | `layanan.ajukan` | Daftar pengajuan milik sendiri: nama, tanggal, unit, badge status |
| `/layanan/sdm/[id]` | pemilik atau `layanan.setujui_sdm` | Detail: data pengajuan, rundown, status, catatan Manajer, susunan SDM. Untuk Manajer: tombol Setujui (dua pilihan), Tolak, Batalkan, tautan ke entri/tugas. Untuk pemilik saat Diajukan: Tarik pengajuan. |
| `/layanan/sdm/[id]/tugas` | `layanan.setujui_sdm` | Form setujui → Tugas dari Manajer (baris orang + jenis + tanggal) |
| `/layanan/sdm/persetujuan` | `layanan.setujui_sdm` | Daftar semua pengajuan dengan tab status, Diajukan dulu (terlama di atas) |
| `/layanan/internet` | `layanan.ajukan` | Formulir pengaduan + pesan terima kasih |
| `/layanan/internet/rekap` | `pengaduan.lihat` | Rekap bulanan (pekan: `chart`; gedung & jenis: `table`) + daftar |

Komponen (semua sudah ada di `packages/ui`, tidak memasang komponen baru): `field`, `input`, `textarea`, `select`, `combobox`, `checkbox`, `radio-group`, `reui/date-selector`, `reui/time-picker`, `domain/assignment-rows` (baris SDM; komponen belum punya mode "jenis saja", jadi tambah satu prop, mis. `fields="type"`, di file domain tersebut untuk formulir pengaju; form setujui → tugas dan Planner memakai mode lengkap), `domain/media-upload` atau `reui/file-type` untuk rundown, `table`, `tabs`, `badge`, `chart`, `alert-dialog`, `empty`, `card`. Pekerjaan visual mengikuti aturan CLAUDE.md (skill `frontend-design` sebelum, `web-design-guidelines` sesudah).

Dialog hapus yang sudah ada (`planner/_delete-entry.tsx`, hapus di `/tugas`) menampilkan textarea **"Catatan pembatalan untuk pengaju"** (wajib) bila item berasal dari pengajuan; query detail entri/tugas menyertakan `serviceRequestId`.

Akun tanpa peran: halaman `/` hanya berisi sapaan dan sidebar (`menuFor`) sudah hanya menampilkan Layanan, jadi tidak perlu redirect.

## Pengujian

- Unit (`rules.test.ts`): normalisasi nomor WA, pengelompokan rekap per pekan Senin–Minggu di WIB (termasuk pengaduan tengah malam dan hari Minggu), per gedung/jenis, transisi status yang diizinkan.
- Database (`layanan.db.test.ts`, pola `*.db.test.ts` yang ada):
  - setujui → tugas membuat N tugas tertaut; setujui dua kali bersamaan → hanya satu menang;
  - setujui lewat `createEntry` dengan `requestId` pada pengajuan yang sudah diputuskan → gagal, entri tidak tercipta;
  - `deleteEntry` entri tertaut tanpa catatan → gagal; dengan catatan → Dibatalkan + snapshot;
  - `DELETE` langsung entri/tugas tertaut di SQL → ditolak FK RESTRICT;
  - hapus tugas tertaut bukan yang terakhir → pengajuan tetap Disetujui; yang terakhir → wajib catatan;
  - check constraint status menolak kombinasi tidak sah;
  - pemilik lain / akun tanpa izin tidak bisa membaca detail atau rundown.
- Otorisasi per peran untuk setiap rute dan aksi server, termasuk akses langsung lewat URL (kriteria penerimaan PRD).

## Diserahkan ke pembangun

- Nama dan bentuk tepat prop tambahan `assignment-rows` untuk mode "jenis saja".
- Penamaan file/fungsi di `lib/layanan/`, pesan error di luar yang disebut.
- Urutan migrasi drizzle (tabel baru + kolom `manager_task.service_request_id`).
- Tata letak rinci halaman, mengikuti pola halaman Planner/Tugas yang ada dan aturan visual proyek.
