# Media Planner — Entri, Tiga Tampilan, Kartu Minimal (Tahap 1)

Tanggal: 16 November 2026 · Acuan: spesifikasi §4 (Media Planner), §3.3 (matriks akses), §6.1 (asal kartu); PRD §5, §6 (responsif), §10 (kriteria penerimaan); spec Fondasi (`2026-11-16-fondasi-design.md`).

## Tujuan

Menggantikan perencanaan konten manual dengan satu Planner terpusat (target PRD: 100% konten/kegiatan Media tercatat). Manajer dan SDM Strategi mengisi entri; seluruh unit, termasuk Direktur, melihat jadwal lewat tiga tampilan: **Daftar**, **Kalender pekanan**, **Partisi per orang**. Setiap entri langsung punya Kartu Konten tahap Ide, supaya aturan hapus §4.5 berlaku sejak hari pertama dan modul Kanban tinggal melengkapi kartunya.

**Bukan tujuan putaran ini** (masing-masing dikerjakan bersama modulnya):

- Unduh PDF (§4.4): putaran berikutnya. Rancangan ini menyiapkan jalurnya (lihat "Logika murni").
- Notifikasi penugasan baru/berubah (§4.6, §10.2): modul Notifikasi.
- Tanda "Perlu diperbarui" di laporan harian (§4.6, §5.6): modul Laporan Harian.
- Catatan otomatis "Diubah setelah disetujui" (§4.6), isi kartu (thumbnail, file, caption), penghapusan file kartu: modul Kanban.
- "Jadikan entri Planner" dari Pengajuan SDM (§8.1): modul Layanan.
- Filter selain "Pekerjaan saya saja" (orang, bidang, jenis, kanal): ditunda atas keputusan pengguna.
- Penandaan hari libur di Kalender/Partisi: data hari libur belum ada (modul Absensi).

**Anti-tujuan:**

- Izin yang hanya menyembunyikan tombol. Akses langsung lewat URL atau aksi server harus tetap ditolak.
- Entri tanpa kartu, atau kartu tanpa entri.
- Aturan "masuk periode" dan "pekerjaan saya" ditulis dua kali (sekali untuk layar, sekali untuk PDF nanti).
- Penghapusan entri tahap Review ke atas tanpa konfirmasi dua langkah yang **diperiksa di server**.
- Id penugasan berubah setiap kali entri disimpan. Laporan Harian nanti merujuk penugasan per id dan harus bisa mempertahankan jawaban lama (§5.6).

## Keputusan pengguna

| Topik | Keputusan |
| --- | --- |
| Cakupan | **A**: Planner inti + kartu minimal. PDF di putaran berikutnya; notifikasi, "Perlu diperbarui", dan catatan "Diubah setelah disetujui" ikut modulnya masing-masing. |
| Data & aturan | Disetujui sesuai bagian "Data" dan "Aturan isian" di bawah. |
| Tampilan | Disetujui sesuai bagian "Halaman" di bawah. |
| Filter tambahan | **Dilewati** untuk saat ini. Hanya "Pekerjaan saya saja". |
| Pendekatan | **A**: dirender di server per periode. |
| Hari Minggu | **A**: pekan dihitung Senin–Minggu untuk menentukan entri yang tampil; Kalender 7 hari; Partisi Senin–Sabtu (§4.2), kolom Minggu hanya muncul bila ada tugas di hari Minggu. |

## Approaches

1. **Dirender di server per periode**: dipilih. Halaman server membaca periode/tampilan dari URL, satu query per periode, fungsi murni membentuk data tiap tampilan, aksi server untuk simpan/hapus. Sama dengan pola halaman Setting, izin selalu diperiksa di server, dan PDF nanti memakai query dan fungsi yang sama. Kekurangan: setiap pindah pekan butuh satu kali bolak-balik ke server (tidak terasa di jaringan lokal).
2. **Dimuat sekali, berpindah di klien**: ditolak. Aturan periode/"pekerjaan saya" harus ditulis ulang di server untuk PDF, data membesar seiring waktu, perubahan orang lain baru terlihat setelah dimuat ulang.
3. **API JSON + pengambilan data di klien**: ditolak. Jalur izin jadi dua dan butuh library cache tambahan tanpa manfaat untuk aplikasi seukuran satu unit.

## Rancangan

### Data (skema Drizzle baru, `packages/db/src/schema/planner.ts`, diekspor dari `schema/index.ts`)

Semua tanggal Planner bertipe `date` (tanpa jam, mode string `yyyy-MM-dd`), sehingga tidak ada geseran zona waktu. "Hari ini" dihitung dalam WIB (Asia/Jakarta).

- **`planner_entry`**: `id` serial; `name` text wajib; `activity_start` dan `activity_end` date opsional (**diisi berdua atau kosong berdua**, selesai ≥ mulai; *keputusan pembangun*); `publish_date` date wajib; `created_by` → user (restrict; akun tidak dihapus, hanya dinonaktifkan); `created_at`, `updated_at` timestamptz.
- **`planner_assignment`**: `id` serial; `entry_id` → entri (cascade); `user_id` → user (restrict); `task_type_id` → task_type (restrict); `start_date` dan `end_date` date **wajib**, selesai ≥ mulai. Indeks `(user_id, start_date, end_date)` dan `(entry_id)`.
- **`planner_entry_channel`**: `entry_id` → entri (cascade), `channel_id` → channel (restrict), PK gabungan.
- **`content_card`** (kartu minimal): `id` serial; `entry_id` → entri (cascade, **unik**); `stage` text wajib, default `ide`, nilai dari konstanta `CONTENT_STAGES = ["ide","draft","review","disetujui","tayang"]` (sama dengan `ContentStage` di `packages/ui/.../domain/content-card.tsx`); `created_at`. Kolom lain (thumbnail, caption, catatan, riwayat) ditambahkan modul Kanban.
- Constraint `CHECK` di database untuk aturan rentang tanggal (selesai ≥ mulai; kegiatan berdua-atau-kosong), selain validasi zod.

### Aturan isian

- Wajib: nama, tanggal tayang, **≥ 1 penugasan**, **≥ 1 kanal**. Tanggal kegiatan opsional.
- Tanggal penugasan **tidak dibatasi** rentang kegiatan (editing/caption biasanya setelah kegiatan). Tanggal tayang juga tidak dibatasi.
- Satu orang boleh punya beberapa penugasan di entri yang sama (§4.1).
- **Pilihan orang**: staf unit aktif, yaitu akun tidak nonaktif yang punya minimal satu peran selain `direktur` (§2 "Staf unit"). Akun nonaktif tidak bisa dipilih untuk baris baru, tetapi baris lama yang sudah memakainya tetap tampil dan tersimpan apa adanya.
- **Jenis penugasan dan kanal nonaktif**: diperlakukan sama. Tidak bisa dipilih untuk baris baru, tetapi nilai lama tetap tersimpan.
- Validasi di server (zod) di aksi simpan; pesan galat per kolom ditampilkan di formulir.
- Siapa pun dengan `planner.ubah` boleh mengubah entri mana pun, termasuk buatan orang lain; §4.1 tidak membatasi pemilik.
- Entri tetap bisa diubah di **semua tahap kartu**, termasuk setelah Disetujui (§4.6).
- Dua orang menyimpan entri yang sama: yang terakhir menyimpan yang dipakai. *Keputusan pembangun*; satu unit kecil, tabrakan jarang.

### Simpan (aksi server)

- `createEntry`: `requirePermission("planner.ubah")`, validasi, lalu **satu transaksi**: insert entri, penugasan, kanal, dan `content_card` tahap `ide`. Gagal di salah satu langkah = tidak ada yang tersimpan.
- `updateEntry`: `requirePermission("planner.ubah")`, satu transaksi:
  - Penugasan **dibandingkan per id**: baris dengan id lama di-update, baris tanpa id di-insert, id lama yang hilang dihapus. Id baris yang tidak berubah tetap sama (dibutuhkan Laporan Harian, §5.6).
  - Kanal: himpunan diganti.
  - Kartu **tidak** dipindah tahapnya (§4.6). `updated_at` entri diperbarui.
  - Id penugasan yang dikirim klien wajib milik entri itu (tolak bila bukan).
- Setelah berhasil: `revalidatePath("/planner")` dan path entri. Pola galat mengikuti `guarded()` di `apps/admin/lib/setting-crud.ts` (ZodError → pesan).

### Hapus (§4.5)

- Izin baru **`planner.hapus_terkunci`** ditambahkan ke `PERMISSIONS` dan hanya ke peran `manajer`. Tes matriks izin diperbarui.
- Fungsi murni `canDeleteEntry(permissions, stage)`: `ide`/`draft` butuh `planner.ubah`; `review`/`disetujui`/`tayang` butuh `planner.hapus_terkunci`.
- Aksi `deleteEntry(id, confirmName?)`: baca tahap kartu, periksa `canDeleteEntry`. Untuk tahap terkunci, server **mewajibkan `confirmName` sama dengan nama entri** (konfirmasi dua langkah ditegakkan di server, bukan hanya dialog). Hapus entri: penugasan, kanal, dan kartu ikut terhapus lewat cascade.
- UI: tombol Hapus di halaman entri → `AlertDialog` peringatan. Untuk tahap terkunci, langkah kedua meminta mengetik nama konten sebelum tombol aktif.
- Penghapusan file kartu: belum ada file. Modul Kanban menambahkannya ke aksi ini.
- Saat ini semua kartu masih tahap Ide, jadi cabang "terkunci" baru terpakai setelah Kanban ada. Logika dan tesnya tetap dibuat sekarang.

### Logika murni (`apps/admin/lib/planner/`, dengan tes vitest)

Satu modul tanpa db/next, dipakai halaman sekarang dan PDF nanti:

- `resolvePeriod({ tanggal, rentang })`: pekan = **Senin–Minggu** yang memuat `tanggal` (supaya entri yang tanggalnya hanya jatuh di hari Minggu tetap muncul); bulan = bulan kalender. `tanggal` kosong/tidak valid → hari ini (WIB).
- `weekDays(period, entries)`: hari yang ditampilkan Partisi = Senin–Sabtu, **ditambah Minggu hanya bila ada penugasan di hari Minggu** pada data yang sedang ditampilkan.
- `inPeriod(entry, period)`: entri masuk bila rentang kegiatan, **salah satu** rentang penugasan, atau tanggal tayangnya beririsan dengan periode.
- `sortKey(entry)`: `activity_start`, atau bila kosong, tanggal mulai penugasan paling awal; seri → nama.
- `applyMyWork(entries, userId, period)`: entri yang memuat penugasan milik pengguna **yang beririsan dengan periode**. Entri yang hanya ramai oleh rekan di pekan ini, sementara penugasan saya ada di pekan lain, tidak ikut. *Keputusan pembangun.*
- `toListRows(entries)`: baris Daftar.
- `toCalendarEvents(entries, { myWorkUserId? })`: satu event per penugasan (judul "Jenis · Orang — Nama konten") + satu event "Tayang" per entri. **`end` event-calendar eksklusif** → tanggal selesai + 1 hari. Dengan "pekerjaan saya": hanya penugasan pengguna + tayang entri tersebut.
- `toPartitionRows(staff, entries, days, { myWorkUserId? })`: satu baris per orang, sel per hari berisi penugasan aktif hari itu ("Jenis — Nama konten"). Baris = staf unit aktif urut nama, **ditambah** akun nonaktif yang masih punya penugasan di periode itu (supaya tugasnya tidak hilang dari grid). Dengan "pekerjaan saya": hanya baris pengguna.
- `parsePlannerParams(searchParams, roles)`: membaca `tampilan`, `tanggal`, `rentang`, `saya`; nilai tak dikenal → default.

Tes menutup: batas pekan Senin–Minggu, entri yang hanya bertanggal Minggu, kolom Minggu Partisi muncul/tidak, entri yang hanya beririsan lewat penugasan atau tanggal tayang, urutan dengan dan tanpa tanggal kegiatan, `end` eksklusif, "pekerjaan saya" di tiga tampilan, akun nonaktif di Partisi, `canDeleteEntry` per tahap, default `saya` per peran (`defaultMyWorkOnly`), parameter tidak valid.

Query periode (server-only, di samping modul ini): satu query mengambil entri yang beririsan dengan periode beserta penugasan (nama orang, nama jenis), kanal, dan tahap kartu. Perbandingan rentang dilakukan di SQL. Supaya aturan "masuk periode" tidak bercabang, **tes integrasi menjalankan query dan `inPeriod` pada data uji yang sama dan memastikan hasilnya identik**. *Keputusan pembangun.*

### Halaman

**URL `/planner`** (`requirePermission("planner.lihat")`). Parameter, mengikuti menu yang sudah ada (`apps/admin/lib/menu.tsx`):

| Parameter | Nilai | Default |
| --- | --- | --- |
| `tampilan` | `daftar` \| `kalender` \| `partisi` | `daftar` |
| `tanggal` | `yyyy-MM-dd` (hari dalam periode) | hari ini (WIB) |
| `rentang` | `pekan` \| `bulan` (**hanya Daftar**) | `pekan` |
| `saya` | `1` \| `0` | `defaultMyWorkOnly(roles)` |

`saya=0` harus eksplisit supaya SDM Khusus bisa mematikan filternya (§4.3).

```
Media Planner                                    [+ Entri baru]
[ Daftar | Kalender | Partisi ]
[‹] 16–22 Nov 2026 [›] [Hari ini]  [Pekan|Bulan]¹   [■ Pekerjaan saya saja]
──────────────────────────────────────────────────────────────
<isi tampilan>
```

- "Entri baru" hanya untuk pemilik `planner.ubah`. ¹ hanya di Daftar.
- Tab dan navigasi periode mengganti URL (tautan/`router.push`), lalu server merender ulang.
- Periode kosong → komponen `Empty` dengan ajakan membuat entri (bila punya izin).
- `loading.tsx` dengan skeleton.

**Daftar** (`@reui` data-grid):

```
Nama konten        Kegiatan      Penugasan              Kanal       Tayang   Tahap
Video Profil       16–18 Nov     Budi·Take, Budi·Edit…  YT IG       19 Nov   Ide
```

Urut menurut `sortKey`. Penugasan diringkas (orang · jenis), kanal sebagai badge, tahap kartu sebagai badge dengan ikon dari `CONTENT_STAGE_ICON`. Klik baris → `/planner/[id]`.

**Kalender** (`@reui` event-calendar, sudah dirakit di `galeri/_demo-planner.tsx`):

- `view="days"`, **7 hari** (Senin–Minggu), `weekStartsOn={1}`, locale `id`, i18n `EVENT_CALENDAR_I18N_ID`, drag/resize mati, semua event `allDay`. Pengalih tampilan bawaan kalender disembunyikan (`showViewSwitcher={false}`); perpindahan tampilan hanya lewat tab halaman.
- `date` dikendalikan dari `tanggal`; navigasi kalender mengganti URL.
- Bar penugasan satu warna netral (token). Tayang tampil sebagai chip lewat `renderEvent` dengan ikon khusus dan warna `primary` (§4.2). Tidak ada warna per jenis.
- Di HP (`useIsMobile`), tampilan awal **agenda** untuk pekan yang sama.
- Klik event → `/planner/[id]`.

**Partisi** (domain `PartitionGrid`):

- Kolom Senin–Sabtu (+ Minggu bila ada tugas, lihat `weekDays`), sel kosong abu-abu (sudah ada).
- `PartitionItem` diberi `href` opsional supaya item bisa diklik ke entri. Ini perubahan kecil di `packages/ui/src/components/domain/partition-grid.tsx`.
- Tanggal tayang tidak ditampilkan di Partisi (bukan tugas orang).
- Di HP: geser horizontal dengan kolom nama sticky (sudah ada).

**Formulir `/planner/baru`** (`planner.ubah`) dan **`/planner/[id]`** (`planner.lihat`; bisa diubah hanya dengan `planner.ubah`, selain itu baca saja):

- Halaman penuh, bukan dialog: nama (Input), rentang kegiatan (date picker rentang, bisa dikosongkan), penugasan (domain `AssignmentRows`), kanal (pilihan ganda dari Setting), tanggal tayang (date picker). Galat per kolom memakai `Field`.
- `/planner/[id]` menampilkan tahap kartu (badge) dan tombol Hapus sesuai `canDeleteEntry`.
- Id entri tidak ada → `notFound()`.
- `AssignmentRows` sekarang membolehkan tanggal kosong; validasi wajib terjadi di zod, dengan galat yang tampil di baris terkait.

### Perangkat

PRD §6: Planner harus tetap terpakai di HP. Kalender di HP = agenda, Partisi = geser horizontal dengan kolom nama sticky, Daftar = data-grid dengan geser horizontal, formulir satu kolom (`AssignmentRows` sudah responsif).

### Aturan proyek yang berlaku

- Sebelum menulis kode tampilan: skill `frontend-design:frontend-design`; setelahnya: `anthropic-skills:web-design-guidelines` (CLAUDE.md "Pekerjaan visual").
- Komponen dari shadcn/`@reui` lewat CLI dengan `-c packages/ui` dan `--dry-run`; `validate_usage` dan `get_audit_checklist` MCP reui setelah merakit. Tidak ada komponen di `apps/admin/components`.
- Warna hanya dari token `globals.css`.

### Kualitas

- Tes vitest untuk modul murni `apps/admin/lib/planner/` (daftar kasus di atas). vitest ditambahkan sebagai devDependency `apps/admin` dengan versi yang sama dengan `packages/auth` (4.1.12) dan skrip `test`. *Keputusan pembangun.*
- Tes izin di `packages/auth` diperbarui untuk `planner.hapus_terkunci`.
- Tes integrasi ringan (pola `accounts.db.test.ts`):
  - query periode dan `inPeriod` menghasilkan entri yang sama;
  - simpan entri membuat kartu `ide` dalam transaksi yang sama;
  - update mempertahankan id penugasan yang tidak berubah;
  - hapus menghapus kartu;
  - hapus tahap terkunci tanpa izin atau tanpa `confirmName` yang benar ditolak.
- `scripts/verify-access.sh` diperluas: `/planner` tanpa `planner.lihat` (Staf Unit Lain) ditolak, `/planner/baru` tanpa `planner.ubah` ditolak.
- Migrasi bisa dijalankan di DB yang sudah berisi data Fondasi.

## Diserahkan ke pembangun

- Nama kolom/fungsi detail.
- Pilihan ikon tayang.
- Komponen pilihan ganda kanal (checkbox group vs combobox multi).
- Bentuk ringkasan penugasan di Daftar.
- Tata letak toolbar di HP.
- Cara `PartitionGrid` merender tautan (elemen `<a>` atau render prop; `packages/ui` tidak mengimpor `next/link`).
- Batas panjang nama konten.
- Isi seed contoh untuk pengembangan.

## Pertanyaan terbuka (tidak menghalangi)

- Arsip/pencarian entri lama di luar periode: belum diminta; Daftar bulanan dipakai sebagai gantinya.
- Cara modul Notifikasi/Laporan Harian nanti mendeteksi "penugasan berubah": diputuskan bersama modul itu. Id penugasan yang stabil sudah disiapkan di sini.
