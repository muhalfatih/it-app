# Laporan Harian, Tugas dari Manajer, Absensi Minimal (Tahap 1, putaran 1)

Tanggal: 19 November 2026 · Acuan: spesifikasi §5 (Laporan Harian), §5A (Tugas dari Manajer), §7.1–7.2 (Absensi & hari libur), §3.3 (matriks akses), §10.2 (notifikasi); spec Media Planner (`2026-11-16-media-planner-design.md`), terutama id penugasan yang stabil.

## Tujuan

Setiap staf unit (Manajer, SDM Strategi, SDM Khusus; **bukan** Direktur) melaporkan pekerjaannya setiap hari kerja. Daftar tugasnya disusun otomatis dari Tugas Rutin, penugasan Planner, dan Tugas dari Manajer, ditambah tugas input sendiri. Tiap tugas ditandai Tuntas (T) atau Tindak Lanjut (TL), dan skor harian (Tuntas ÷ total) menjadi catatan kinerja yang bisa dipercaya. Manajer bisa memberi tugas di luar Planner kapan saja, mengisi absensi, dan menandai hari libur, karena keduanya menentukan hari mana yang punya laporan dan dihitung.

**Bukan tujuan putaran ini:**

- **Putaran 2:** Rekap per pekan/bulan (§5.7), rata-rata periode, rincian empat sumber per periode, daftar TL/Tertunda, kumpulan Hambatan, tabel ringkasan tim, PDF rekap.
- Notifikasi (tugas baru/berubah, perlu diisi ulang, pengingat 15.45): modul Notifikasi. Putaran ini hanya menyiapkan data yang dibutuhkan (tanda "Perlu diperbarui" yang bisa dihitung, daftar staf yang belum mengirim).
- Tugas dari Manajer yang berasal dari Pengajuan SDM (§8.1) dan sinkronisasi ke "Pengajuan Saya": modul Layanan. Kolom penautnya ditambahkan modul itu.
- Rekap absensi (§7.3).

**Anti-tujuan:**

- Skor hari yang sudah lewat berubah diam-diam karena entri Planner dihapus, Tugas Rutin dinonaktifkan, atau Tugas dari Manajer diedit belakangan.
- Staf bisa mengubah atau menghapus Tugas dari Manajer, mengubah laporan yang sudah terkunci, atau mengubah laporan orang lain. Semua dicek di server.
- Hari libur dihitung 0% karena tidak ada laporan.
- Centang yang sudah diklik hilang karena staf lupa menekan Kirim.
- Laporan yang disembunyikan karena absensi ikut terhapus permanen.

## Keputusan pengguna

| Topik | Keputusan |
| --- | --- |
| Absensi & hari libur | **A**: dibangun sekarang dalam bentuk minimal (isi absensi + hari libur oleh Manajer). |
| Laporan belum dikirim saat terkunci | **Centang yang tersimpan tetap dihitung.** Yang tidak dicentang T dihitung belum tuntas. |
| Pendekatan | **Cara 1**: daftar tugas dihitung saat dibuka; hanya jawaban yang disimpan; dibekukan saat terkunci. |

## Approaches

1. **Dihitung saat dibuka, jawaban disimpan, dibekukan saat terkunci**: dipilih. "Selalu mengikuti tugas yang berlaku saat itu" (§5.2) terpenuhi dengan sendirinya. "Perlu diperbarui" cukup membandingkan daftar saat kirim dengan daftar terkini, sehingga Planner, Setting, dan Tugas dari Manajer tidak perlu kode pemicu. Pembekuan menjaga skor lama.
2. **Baris tugas harian dibuat di depan** (job tiap pagi + sinkron di setiap perubahan sumber): ditolak. Setiap jalur ubah/hapus di tiga modul harus ikut menyinkronkan, dan satu jalur yang luput membuat laporan salah tanpa tanda. Selain itu butuh penjadwal yang belum ada.
3. **Dihitung saat dibuka tanpa pembekuan**: ditolak. Melanggar anti-tujuan pertama.

## Rancangan

### Istilah teknis

- **Kunci tugas** (`task_key`): string `sumber:id`, dengan sumber `rutin` (routine_task.id), `planner` (planner_assignment.id), `manajer` (manager_task.id), `sendiri` (self_task.id). Dipakai sebagai kunci jawaban. Id penugasan Planner stabil saat entri diedit (spec Planner).
- **Hari laporan** seseorang: tanggal Senin–Sabtu yang bukan hari libur, mulai dari `REPORT_START_DATE` (konstanta tanggal go-live modul) atau tanggal akun dibuat (WIB), mana yang lebih akhir, sampai hari ini. *Keputusan pembangun*: supaya hari sebelum modul dipakai tidak tercatat 0%.
- **Batas kunci** hari D: pukul **10.00 WIB pada hari kerja berikutnya setelah D** (Minggu dan hari libur dilewati).
- **Staf pelapor**: akun aktif dengan izin `laporan.isi`.

### Data (`packages/db/src/schema/report.ts` baru, diekspor dari `schema/index.ts`)

Semua tanggal bertipe `date` mode string (`yyyy-MM-dd`), sama dengan Planner.

- **`holiday`**: `date` date PK; `name` text wajib; `created_at`.
- **`attendance`**: `user_id` → user (cascade), `date`, PK gabungan; `status` text dengan CHECK `hadir|izin|izin_kegiatan|sakit|tanpa_keterangan`; `updated_by` → user; `updated_at`. Tidak ada baris = belum diisi = diperlakukan Hadir (§5.4).
- **`manager_task`**: `id` serial; `title` text wajib; `note` text opsional; `start_date`, `end_date` date wajib (CHECK selesai ≥ mulai); `created_by` → user (restrict); `created_at`, `updated_at`.
- **`manager_task_assignee`**: `task_id` → manager_task (cascade), `user_id` → user (restrict), PK gabungan. Minimal satu orang (validasi zod).
- **`self_task`**: `id` serial; `user_id` → user (cascade); `date`; `title` text wajib; `created_at`. Hanya berlaku untuk tanggal itu. *Keputusan pembangun*: §5.2 menyebut "pekerjaan lain hari itu".
- **`daily_report`**: `user_id`, `date`, PK gabungan;
  - `obstacles` text dan `priorities` text (Hambatan Hari Ini, Prioritas Esok);
  - `submitted_at` timestamptz opsional, dan `submitted_tasks` jsonb opsional (daftar `{key, title}` saat Kirim, untuk "Perlu diperbarui");
  - `unlocked_at` timestamptz opsional (dibuka Manajer), dan `unlocked_by` → user;
  - `frozen` jsonb opsional berisi salinan beku `{tasks: [{key, source, title, status, overdueDays}], obstacles, priorities}`, beserta `frozen_at`;
  - `updated_at`.
  - Baris dibuat saat pertama kali ada isian atau saat dibekukan.
- **`daily_report_answer`**: `user_id`, `date`, `task_key` text, PK gabungan; `status` text CHECK `T|TL`; `updated_at`. Tanpa FK ke sumber, jadi jawaban untuk tugas yang sudah dihapus tinggal diabaikan karena tidak ada lagi di daftar.

Izin baru: **`laporan.buka_kunci`**, hanya untuk Manajer. Hari libur memakai `absensi.isi` yang sudah ada, sesuai menu. Tes matriks izin di `packages/auth` diperbarui.

### Logika murni (`apps/admin/lib/report/rules.ts`, tes vitest)

Tanpa db/next. Input berupa data sumber yang sudah dimuat.

- `isWorkday(date, holidays)`: Senin–Sabtu dan bukan hari libur.
- `lockDeadline(date, holidays)`: `Date` pukul 10.00 WIB pada hari kerja berikutnya.
- `isEditable(report, date, holidays, now)`: `now < lockDeadline` atau laporan sedang dibuka kuncinya (`unlocked_at` terisi dan belum dibekukan ulang).
- `tasksForDay({ userId, date, routine, plannerAssignments, managerTasks, selfTasks, tuntasBefore, holidays })` → daftar `{key, source, title, overdueDays}` dengan urutan bagian Rutin → Planner → Tugas Lain (dari Manajer, lalu input sendiri):
  - Rutin: semua `routine_task` aktif milik orang itu, urut `sort_order`.
  - Planner dan dari Manajer: muncul bila `start_date ≤ date`, **dan** belum ditandai T pada hari laporan sebelum `date` (`tuntasBefore` = himpunan kunci yang pernah berstatus T sebelum `date`), **dan** (`date ≤ end_date` atau belum Tuntas, yaitu Tertunda).
  - Judul Planner: "Jenis — Nama konten".
  - `overdueDays` = jumlah hari kerja setelah `end_date` sampai `date`; 0 bila belum lewat. Label "Tertunda N hari" tampil bila > 0. *Keputusan pembangun*: dihitung dalam hari kerja.
  - Tugas yang ditandai T pada hari D tetap tampil di hari D dan tidak muncul di hari berikutnya. Jawaban T di hari yang disembunyikan absensi tetap dihitung sebagai Tuntas untuk aturan ini, karena datanya tidak dihapus.
- `dayScore(tasks, answers)` → `{done, total, bySource}`. Tugas tanpa jawaban atau berjawaban TL = belum tuntas. Total 0 → skor tidak ditampilkan (bukan 0%).
- `needsUpdate(report, currentTasks)`: laporan sudah dikirim, belum dibekukan, dan himpunan `{key, title}` terkini berbeda dari `submitted_tasks`. Tugas yang dihapus hilang dari daftar dengan sendirinya (§5.6).
- `reportState(...)` → salah satu dari `libur`, `disembunyikan` (absensi non-Hadir), `terbuka`, `dikirim`, `perlu_diperbarui`, `terkunci`. Dipakai untuk badge.

Tes menutup:
- batas kunci di hari Sabtu (lompat ke Senin), sebelum hari libur, dan tepat pukul 10.00;
- tugas beberapa hari muncul tiap hari, berhenti setelah T, dan Tertunda dengan N hari kerja;
- T di hari tersembunyi tetap menghentikan tugas;
- tugas yang tanggalnya digeser ke depan;
- skor per sumber;
- `needsUpdate` saat judul berubah, tugas ditambah, atau tugas dihapus;
- hari sebelum `REPORT_START_DATE` atau sebelum akun dibuat.

### Pembekuan

- `freezeDue(userIds, now)` (server-only, `apps/admin/lib/report/freeze.ts`): untuk setiap staf dan setiap hari laporan yang batas kuncinya sudah lewat, tidak sedang dibuka kuncinya, dan belum punya `frozen`, hitung `tasksForDay` + jawaban, lalu simpan salinan beku (upsert `daily_report`). Hari dengan absensi non-Hadir juga dibekukan, tetapi tetap dikecualikan dari skor lewat status absensi saat dibaca.
- **Dipanggil saat halaman dibaca**: `/laporan` (untuk diri sendiri) dan `/laporan/tim` (untuk staf yang ditampilkan). Pemindaian dibatasi sejak `frozen_at` terakhir orang itu, jadi biayanya kecil untuk unit sekecil ini.
- `shortcut:` hari yang tidak dibuka siapa pun sampai sumbernya berubah dibekukan dengan data sesudah perubahan. Kalau ternyata bermasalah, tambahkan skrip `scripts/report-freeze.ts` yang dijalankan cron seperti `media-sweep.ts`.
- Salinan beku diperlakukan sebagai kebenaran untuk hari itu: halaman, skor, dan rekap putaran 2 membacanya, bukan menghitung ulang.
- **Buka kunci** (Manajer, `laporan.buka_kunci`): mengisi `unlocked_at`/`unlocked_by` dan mengosongkan `frozen`. Laporan dihitung ulang dari data terkini dan bisa diisi lagi. Saat staf menekan **Kirim**, laporan itu langsung dibekukan lagi dan `unlocked_at` dikosongkan. Kunci tetap terbuka sampai staf mengirim. *Usul yang disampaikan ke pengguna, belum dibantah.*

### Aksi server (`apps/admin/lib/report/mutations.ts` + `app/(app)/laporan/actions.ts`)

Semua memakai pola `guarded()`/`UserError` dari `apps/admin/lib/setting-crud.ts`.

- `setAnswer(date, key, status)`: `laporan.isi`, hanya untuk diri sendiri; tanggal harus hari laporan, laporan `isEditable`, dan kunci ada di `tasksForDay` terkini. Upsert per klik, karena centang yang tersimpan tetap dihitung.
- `saveNotes(date, obstacles, priorities)`: syarat sama.
- `addSelfTask(date, title)`, `renameSelfTask(id, title)`, `deleteSelfTask(id)`: hanya pemilik dan hanya saat laporan hari itu `isEditable`. Hapus juga menghapus jawabannya.
- `submitReport(date)`: menyimpan `submitted_at` dan `submitted_tasks`. Kalau batas kunci sudah lewat (berarti sedang dibuka kuncinya), laporan langsung dibekukan.
- `unlockReport(userId, date)`: `laporan.buka_kunci`; hanya untuk laporan yang sudah terkunci.
- Laporan absensi non-Hadir atau hari libur: semua aksi ubah ditolak.

### Tugas dari Manajer (`apps/admin/lib/manager-task/` + `app/(app)/tugas/`)

- `createManagerTask`, `updateManagerTask`, `deleteManagerTask`: `tugas_manajer.kelola`, validasi zod (judul 2–120 karakter, ≥ 1 staf pelapor aktif, selesai ≥ mulai, catatan opsional). Penerima diganti sebagai himpunan dalam satu transaksi.
- Mulai boleh di masa lalu (mis. mencatat tugas yang sudah berjalan). Laporan yang sudah beku tidak terpengaruh; laporan yang masih terbuka langsung menampilkan perubahan, dan yang sudah dikirim mendapat tanda "Perlu diperbarui" lewat `needsUpdate`.
- Staf tidak punya aksi apa pun untuk tugas ini. Di laporan, tugas tampil dengan badge "dari Manajer" tanpa tombol ubah/hapus.

### Absensi minimal (`apps/admin/lib/attendance/` + `app/(app)/absensi/`)

- `setAttendance(userId, date, status)`: `absensi.isi`; tanggal ≤ hari ini dan bukan hari libur. Memilih Hadir menyimpan `hadir` (laporan muncul lagi dan dihitung, §5.4).
- `addHoliday(date, name)` / `deleteHoliday(date)`: `absensi.isi`. Hari libur boleh ditambahkan untuk tanggal yang sudah lewat. Hari yang belum beku langsung hilang dari laporan; hari yang sudah beku tetap tersimpan, tetapi dikecualikan dari skor karena hari libur dicek saat dibaca. *Keputusan pembangun.*

### Halaman

**`/laporan?tanggal=yyyy-MM-dd`** (`laporan.isi`; default hari ini WIB). Laporan milik sendiri.

```
Laporan Harian
[‹] Rabu, 19 Nov 2026 [›] [Hari ini]          [Dikirim · Perlu diperbarui]
Batas pengisian: Kamis, 20 Nov pukul 10.00
────────────────────────────────────────────────────────────
Tugas Rutin
  Cek server pagi                                  ( T | TL )
Planner
  Editing — Pentas Seni         [Tertunda 2 hari]  ( T | TL )
Tugas Lain
  Rapat vendor     [dari Manajer]                  ( T | TL )
  Rekap foto      [input sendiri]  ✎ 🗑            ( T | TL )
  [+ Tambah tugas sendiri]
Hambatan hari ini   [ textarea ]
Prioritas esok      [ textarea ]
────────────────────────────────────────────────────────────
6 dari 11 tuntas · 54,5%                              [Kirim]
```

- T/TL memakai `toggle-group` (sudah ada). Simpan per klik dengan pembaruan optimistis dan toast bila gagal. Catatan disimpan saat blur.
- Navigasi tanggal hanya melewati hari laporan; tanggal di masa depan tidak bisa dipilih.
- Hari libur, hari dengan absensi non-Hadir, dan hari sebelum hari laporan pertama → komponen `Empty` dengan penjelasan, tanpa formulir.
- Terkunci → baca saja dari salinan beku, ditambah keterangan "Terkunci, hubungi Manajer untuk membuka".
- Badge status dari `reportState` memakai varian `Badge`; Tertunda memakai `@reui` Badge varian `warning-light` (§5.3 "label kuning").
- Kirim selalu bisa ditekan ulang selama laporan terbuka; setelah dikirim, tombol berubah menjadi "Kirim ulang" bila `needsUpdate`.

**`/laporan/tim?tanggal=`** (`laporan.rekap.semua`: Manajer dan Direktur). Satu tabel per tanggal: nama, status (badge), skor hari itu, dan tombol **Buka kunci** (hanya dengan `laporan.buka_kunci`, hanya untuk yang terkunci). Klik nama → laporan orang itu (baca saja) di `/laporan/tim/[userId]?tanggal=`. Halaman ini dibutuhkan untuk buka kunci; rekap periode tetap di putaran 2. Di `apps/admin/lib/menu.tsx`, URL "Rekap tim" diganti menjadi `/laporan/tim` sampai putaran 2. "Rekap & skor" (staf) tetap `/laporan/rekap` dan baru ada di putaran 2, karena laporan harian sudah menampilkan skor hari itu.

**`/tugas`** (`tugas_manajer.kelola`): data-grid `@reui` berisi judul, staf (badge), rentang tanggal, dan status per staf (Tuntas/belum, dari jawaban). Ada tombol "Beri tugas". `/tugas/baru` dan `/tugas/[id]` adalah formulir halaman penuh: judul (`Input`), staf (`combobox` multi), rentang tanggal (date picker rentang seperti Planner), catatan (`textarea`), dan Hapus dengan `AlertDialog`.

**`/absensi?tanggal=`** (`absensi.isi`): daftar staf pelapor untuk satu tanggal dengan pilihan status per orang (`select`), default kosong = Hadir. Pada hari libur tampil `Alert` dan isian dimatikan. **`/absensi/libur`**: daftar hari libur, tambah (tanggal + nama), hapus. Pola mengikuti halaman Setting (`SettingList`), dengan tanggal sebagai kolom tambahan.

Semua halaman: tanpa `loading.tsx` (alasan sama dengan Planner), id tidak dikenal → `notFound()`.

### Perangkat

Laporan diisi terutama dari HP sore hari: satu kolom, T/TL dengan target sentuh ≥ 44 px, tombol Kirim lengket di bawah layar. Halaman tim, tugas, dan absensi memakai tabel dengan geser horizontal di HP.

### Aturan proyek yang berlaku

- Sebelum menulis kode tampilan: skill `frontend-design:frontend-design`; setelahnya: `anthropic-skills:web-design-guidelines`.
- Komponen yang sudah ada dipakai: `toggle-group`, `textarea`, `select`, `combobox`, `badge`, `empty`, `alert`, `alert-dialog`, `field`, `calendar`/date picker, `@reui` data-grid, domain `SettingList`. **Tidak ada komponen baru yang perlu dipasang.** Kalau ternyata butuh, harus diajukan dulu ke pengguna (CLAUDE.md).
- Warna hanya dari token `globals.css`.

### Kualitas

- Tes vitest untuk `lib/report/rules.ts` (daftar kasus di atas).
- Tes izin `packages/auth` untuk `laporan.buka_kunci`.
- Tes integrasi (pola `planner.db.test.ts`):
  - `setAnswer` ditolak untuk laporan terkunci, laporan orang lain, kunci yang tidak ada di daftar, dan hari libur/absensi non-Hadir;
  - `freezeDue` membekukan, lalu menghapus entri Planner tidak mengubah salinan beku;
  - buka kunci → kirim → beku lagi;
  - Tugas dari Manajer yang diedit memicu `needsUpdate` pada laporan yang sudah dikirim;
  - staf tidak bisa memanggil aksi Tugas dari Manajer.
- `scripts/verify-access.sh` diperluas: `/laporan` untuk Direktur dan Staf Unit Lain ditolak; `/tugas` dan `/absensi` untuk non-Manajer ditolak; `/laporan/tim` untuk SDM ditolak.
- Migrasi bisa dijalankan di DB yang sudah berisi data Planner/Kanban.

## Diserahkan ke pembangun

- Nama fungsi, kolom, teks tombol dan toast.
- Nilai `REPORT_START_DATE` (konstanta di kode; tanyakan ke pengguna saat rilis).
- Cara memuat `tuntasBefore` secara efisien (satu query jawaban T per orang untuk kunci Planner/Manajer).
- Bentuk status per staf di daftar `/tugas`.
- Tata letak halaman tim di laptop.

## Pertanyaan terbuka (tidak menghalangi)

- Modul Notifikasi: memakai `needsUpdate` dan daftar staf yang belum mengirim; pemicu "tugas berubah" kemungkinan berupa event dari aksi Planner/Tugas dari Manajer.
- Modul Layanan: kolom `source_request_id` di `manager_task` dan sinkronisasi ke "Pengajuan Saya" (§5A butir 3).
- Putaran 2: rekap periode dan PDF. Pustaka PDF dipilih bersama PDF Planner yang juga masih tertunda.
