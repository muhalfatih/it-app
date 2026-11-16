# Spesifikasi Aplikasi Unit IT & Media — Tahap 1

**SIT Insantama** · Disusun: 14 November 2026 · Status: Disetujui Manajer

---

## 1. Gambaran Umum

Aplikasi web untuk mengelola kerja **Unit IT & Media**. Unit ini satu unit yang menaungi dua bidang: **IT** dan **Media**. Aplikasi menggantikan pencatatan manual untuk perencanaan konten, laporan harian, persetujuan konten, absensi, layanan ke unit lain, dan peminjaman alat.

### Cakupan Tahap 1

1. Akun, Peran & Setting
2. Media Planner
3. Laporan Harian (End of Day Report) beserta Rekap
4. Tugas dari Manajer
5. Manajemen Konten (Kanban & Persetujuan)
6. Absensi beserta Rekap
7. Layanan (Pengajuan SDM & Pengaduan Internet)
8. Inventaris & Peminjaman Alat
9. Aplikasi HP (PWA) & Notifikasi

### Di luar Tahap 1

- **Laporan Media Sosial**, berupa impor statistik dari platform dan laporan pekanan. Fitur ini masuk **Tahap 2**. Tahap 1 sudah menyiapkan jembatannya, yaitu link postingan per kanal (lihat 6.5).

---

## 2. Istilah

| Istilah | Arti |
|---|---|
| **Unit** | Unit IT & Media |
| **Staf unit** | Semua anggota unit selain Direktur (Manajer, SDM Strategi, SDM Khusus) |
| **Staf Unit Lain** | Pegawai sekolah di luar unit yang login ke aplikasi |
| **Entri Planner** | Satu konten atau kegiatan di Media Planner |
| **Penugasan** | Satu tugas untuk satu orang di entri Planner, misalnya "Editing" oleh Budi pada 3–7 Nov |
| **Kartu Konten** | Kartu di Kanban Manajemen Konten. Satu entri Planner menghasilkan satu kartu. |
| **T / TL** | Status tugas di laporan harian: **Tuntas** / **Tindak Lanjut** |
| **Tertunda** | Label untuk tugas yang melewati tanggal selesai dan belum Tuntas |
| **Layanan** | Menu untuk unit lain: Pengajuan SDM & Pengaduan Internet |

---

## 3. Akun, Peran & Setting

### 3.1 Login

- Login memakai **akun sistem informasi sekolah** yang sudah ada.
- Akun sistem informasi hanya dipakai untuk membuktikan identitas. **Peran diatur di aplikasi ini.**
- Siapa pun yang login tapi belum diberi peran otomatis menjadi **Staf Unit Lain** dan hanya bisa membuka menu **Layanan**.

> ⚠️ **Perlu dicek ke pengelola sistem informasi:** cara aplikasi lain bisa login memakai akun sistem informasi, apakah lewat SSO/API atau dengan membaca database akun.

### 3.2 Peran

| Peran | Keterangan |
|---|---|
| **Direktur** | Memberi persetujuan akhir konten. Melihat semua data. Tidak mengisi laporan harian. |
| **Manajer** | Mengelola unit, Setting, absensi, penugasan, dan persetujuan tahap Draft → Review |
| **SDM Bidang Strategi** | Mengisi Planner dan memindahkan kartu dari Ide ke Draft |
| **SDM Bidang Khusus** | Pelaksana tugas |
| **Staf Unit Lain** | Hanya bisa membuka menu Layanan |

- Setiap anggota unit diberi tanda **bidang**: IT, Media, atau keduanya.
- Semua staf unit, dari bidang mana pun, bisa ditugaskan di Media Planner dan wajib mengisi laporan harian.

### 3.3 Matriks Akses

| Fitur | Direktur | Manajer | SDM Strategi | SDM Khusus | Staf Unit Lain |
|---|---|---|---|---|---|
| Lihat Media Planner | ✅ | ✅ | ✅ | ✅ (awal: "Pekerjaan saya saja") | — |
| Isi/ubah Media Planner | — | ✅ | ✅ | — | — |
| Unduh PDF Planner | ✅ | ✅ | ✅ | ✅ | — |
| Isi Laporan Harian | — | ✅ | ✅ | ✅ | — |
| Rekap Laporan Harian | Semua | Semua | Diri sendiri | Diri sendiri | — |
| Beri/ubah Tugas dari Manajer | — | ✅ | — | — | — |
| Lihat Kanban & komentar | ✅ | ✅ | ✅ | ✅ | — |
| Isi kartu (tahap Ide/Draft) | — | ✅ | ✅ | ✅ | — |
| Ide → Draft | — | — | ✅ | — | — |
| Draft → Review | — | ✅ | — | — | — |
| Review → Disetujui | ✅ | — | — | — | — |
| Centang Tayang per kanal | — | ✅ | ✅ | ✅ | — |
| Isi Absensi | — | ✅ | — | — | — |
| Rekap Absensi | Semua | Semua | Diri sendiri | Diri sendiri | — |
| Ajukan SDM / Pengaduan Internet | ✅ | ✅ | ✅ | ✅ | ✅ |
| Setujui Pengajuan SDM | — | ✅ | — | — | — |
| Lihat daftar & rekap Pengaduan Internet | ✅ | ✅ | ✅ | ✅ | — |
| Kelola data inventaris | — | ✅ | — | — | — |
| Catat pinjam & kembali alat | — | ✅ | ✅ | ✅ | — |
| Setting | — | ✅ | — | — | — |

### 3.4 Menu Setting (khusus Manajer)

| Pengaturan | Isi |
|---|---|
| **Peran & bidang** | Memberi peran dan bidang kepada akun |
| **Daftar penugasan** | Contoh: Take footage, Editing, Caption, Dokumentasi, Desain. Daftar ini juga dipakai di formulir Pengajuan SDM. |
| **Kanal output** | Contoh: YouTube, Instagram, Facebook, WA Grup, TV Display. Setiap kanal punya pilihan **"Wajib link"**. |
| **Tugas rutin** | Diberikan **per orang**, muncul setiap hari kerja |
| **Unit** | Daftar unit untuk dropdown "Unit pengaju" |
| **Gedung** | Daftar gedung untuk dropdown Pengaduan Internet |

Hari libur diatur di menu **Absensi** (lihat 7.2).

---

## 4. Media Planner

### 4.1 Isian Entri

| Kolom | Wajib | Keterangan |
|---|---|---|
| Nama Konten/Kegiatan | ✅ | |
| Tanggal mulai & selesai kegiatan | — | |
| Penugasan | ✅ | Bisa banyak baris. Setiap baris berisi orang, jenis penugasan (dari Setting), dan tanggal mulai–selesai. Satu orang boleh punya dua tugas atau lebih. |
| Kanal output | ✅ | Bisa pilih lebih dari satu (dari Setting) |
| Tanggal tayang | ✅ | Satu tanggal untuk semua kanal |

- Diisi dan diubah oleh **Manajer** dan **SDM Strategi**.
- Setiap entri baru otomatis membuat satu **Kartu Konten** di tahap **Ide** (lihat 6).

### 4.2 Tampilan

1. **Daftar**: diurutkan berdasarkan tanggal kegiatan.
2. **Kalender pekanan**: penugasan tampil di hari-hari dalam rentang tanggalnya, dan **tanggal tayang ditandai dengan ikon khusus**.
3. **Partisi per orang**: baris berisi nama orang, kolom berisi hari Senin–Sabtu. Setiap sel berisi tugas orang itu di hari tersebut. **Sel kosong berwarna abu-abu**, supaya langsung terlihat siapa yang masih longgar.

### 4.3 Filter "Pekerjaan saya saja"

- Untuk SDM Khusus, filter ini **langsung aktif** saat halaman dibuka, tapi **bisa dimatikan** untuk melihat jadwal tim.
- Untuk peran lain, filter ini mati di awal.

### 4.4 Unduh PDF

- Tersedia untuk periode **pekanan** dan **bulanan**, dan bisa diunduh oleh **siapa saja** di unit.
- Bentuk PDF **mengikuti tampilan yang sedang dibuka**: tabel untuk Daftar, kalender untuk Kalender, dan grid untuk Partisi. Filter yang aktif ikut terbawa.
- Kepala PDF berisi logo, nama unit, periode, dan tanggal cetak.

### 4.5 Menghapus Entri

Menghapus entri Planner **ikut menghapus kartu konten beserta semua file-nya**.

| Tahap kartu | Yang boleh menghapus |
|---|---|
| Ide, Draft | Manajer, SDM Strategi |
| Review, Disetujui, Telah Tayang | Manajer saja, dengan **konfirmasi dua langkah** |

### 4.6 Mengubah Entri Setelah Konten Disetujui

- Mengubah jadwal atau penugasan **tidak memindahkan** kartu dari tahapnya.
- Mengubah daftar kanal hanya menyesuaikan daftar centang "Tayang" di kartu.
- Mengubah nama konten tidak memindahkan kartu, tapi memunculkan catatan otomatis **"Diubah setelah disetujui"** di kartu.
- Perubahan penugasan memicu notifikasi dan tanda "Perlu diperbarui" di laporan harian (lihat 5.6).

---

## 5. Laporan Harian (End of Day Report)

### 5.1 Siapa & Kapan

- Wajib bagi **Manajer, SDM Strategi, dan SDM Khusus**. **Direktur tidak mengisi.**
- **Hari kerja: Senin–Sabtu.** Hari libur nasional dan hari libur lain diatur di Absensi.
- Laporan bisa diisi sampai **hari kerja berikutnya pukul 10.00**. Setelah itu laporan **terkunci**, dan hari itu dihitung **0 dari total tugas**.
- **Manajer bisa membuka kunci** laporan seseorang.

### 5.2 Isi Laporan

Daftar tugas di laporan selalu **mengikuti Media Planner, Tugas Rutin, dan Tugas dari Manajer yang berlaku saat itu**.

| Bagian | Sumber | Keterangan |
|---|---|---|
| **Tugas Rutin** | Setting, per orang | Muncul setiap hari kerja |
| **Planner** | Penugasan di Media Planner | Muncul setiap hari dalam rentang tanggal penugasan |
| **Tugas Lain** | Label **"dari Manajer"** atau **"input sendiri"** | Tugas dari Manajer muncul otomatis (lihat 5A). Tugas input sendiri ditambahkan staf untuk pekerjaan lain hari itu. |
| **Hambatan Hari Ini** | Teks | |
| **Prioritas Esok** | Teks | |

Setiap tugas diberi status **Tuntas (T)** atau **Tindak Lanjut (TL)**.

### 5.3 Tugas yang Berlangsung Beberapa Hari

Aturan ini berlaku untuk tugas Planner dan Tugas dari Manajer:

- Tugas muncul **setiap hari dalam rentang tanggalnya**.
- Begitu ditandai **Tuntas**, tugas tidak muncul lagi di hari-hari berikutnya.
- Kalau sampai tanggal selesai tugas belum Tuntas, tugas **tetap muncul di hari berikutnya** dengan label kuning **"Tertunda N hari"** sampai dituntaskan.

### 5.4 Hubungan dengan Absensi

- Secara default, **semua tugas tampil** setiap hari kerja, karena belum tentu Manajer sempat mengisi absensi.
- Kalau Manajer mengisi absensi seseorang selain **Hadir** (Izin, Izin Kegiatan, Sakit, Tanpa Keterangan), laporan hari itu **disembunyikan dan tidak dihitung di skor**. Laporannya **tidak dihapus permanen**.
- Kalau absensi dikembalikan ke **Hadir**, laporan muncul dan dihitung lagi.
- Pada hari libur (diatur di Absensi), tidak ada laporan.

### 5.5 Skor

```
Skor harian = jumlah tugas Tuntas ÷ total tugas hari itu
```

Contoh: 4 rutin + 5 planner + 2 tugas lain = 11 tugas. Kalau 6 Tuntas, skornya 6/11 = 54,5%.

- Total mencakup semua sumber, termasuk input sendiri.
- Rekap **selalu menampilkan rincian per sumber**: Rutin, Planner, dari Manajer, Input Sendiri. Dengan begitu, penambahan tugas input sendiri yang tidak wajar tetap terlihat.

### 5.6 Mengisi Ulang Setelah Tugas Berubah

Kalau laporan sudah dikirim lalu tugas orang itu berubah (di Planner, Tugas Rutin, atau Tugas dari Manajer):

- Staf mendapat **notifikasi** untuk memperbarui laporan.
- Laporan diberi tanda **"Perlu diperbarui"** sampai dikirim ulang.
- **Jawaban lama tetap terisi.** Staf cukup mengisi tugas yang baru atau berubah.
- Tugas yang dihapus otomatis hilang dari laporan.

### 5.7 Rekap Laporan Harian

- Periode: **per pekan** dan **per bulan**.
- Isi per orang:
  - persentase per hari dan rata-rata periode,
  - rincian empat sumber tugas,
  - daftar tugas berstatus TL atau Tertunda,
  - kumpulan isian Hambatan dalam periode tersebut.
- **Manajer & Direktur** melihat semua orang, plus **tabel ringkasan seluruh tim**. **Staf** hanya melihat dirinya sendiri.
- Rekap bisa diunduh sebagai **PDF**.

---

## 5A. Tugas dari Manajer

- Manajer memberi tugas di luar Planner dan Tugas Rutin lewat menu **"Beri Tugas"** kapan saja, atau dari persetujuan Pengajuan SDM (lihat 8.1).
- Isian: nama tugas, staf (bisa lebih dari satu), tanggal mulai–selesai, dan catatan.
- Tugas muncul di bagian **Tugas Lain** dengan label "dari Manajer", dan mengikuti aturan 5.3.
- **Manajer bisa mengedit kapan saja**: tanggal, orang, nama tugas, atau menghapusnya. Setiap perubahan otomatis:
  1. mengirim notifikasi ke staf yang terdampak,
  2. memicu tanda "Perlu diperbarui" di laporan yang sudah dikirim,
  3. memperbarui daftar SDM dan tanggal di **"Pengajuan Saya"** milik pengaju, kalau tugas berasal dari Pengajuan SDM.
- Staf **tidak bisa** mengubah atau menghapus tugas dari Manajer.
- Tugas **input sendiri** bebas diubah atau dihapus oleh stafnya.

---

## 6. Manajemen Konten (Kanban)

### 6.1 Asal Kartu

- **Satu entri Planner menghasilkan satu kartu**, yang otomatis masuk ke tahap **Ide**.
- Kartu **tidak bisa** dibuat langsung di Kanban.
- Entri Planner dihapus, kartunya ikut terhapus (lihat 4.5).

### 6.2 Tahapan & Wewenang

```
Ide → Draft → Review → Disetujui → Telah Tayang
```

| Perpindahan | Oleh |
|---|---|
| Ide → Draft | SDM Strategi |
| Draft → Review | Manajer |
| Review → Disetujui | Direktur |
| Disetujui → Telah Tayang | Staf mana pun selain Direktur, lewat centang per kanal (6.5) |

### 6.3 Mengembalikan untuk Revisi

- Penyetuju di setiap tahap bisa **mengembalikan kartu satu tahap ke belakang**, misalnya Manajer dari Review ke Draft, atau Direktur dari Disetujui ke Review.
- **Catatan revisi wajib diisi** dan tersimpan di kartu.

### 6.4 Isi Kartu

| Kolom | Keterangan |
|---|---|
| Data dari Planner | Nama, penugasan, kanal, tanggal tayang (hanya dibaca) |
| Thumbnail | Satu gambar |
| Konten | Foto dan/atau video, bisa banyak sekaligus |
| Caption | Teks |

- File disimpan di **server milik unit**.
- Foto dan video bisa **dibuka dan diputar langsung di aplikasi** untuk proses review.
- **Tahap Ide & Draft**: isi kartu terbuka untuk Manajer dan semua staf.
- **Sejak Review**: isi kartu **terkunci**, dan terbuka lagi kalau kartu dikembalikan untuk revisi.

### 6.5 Telah Tayang per Kanal

- Di tahap Disetujui, kartu menampilkan **daftar centang untuk setiap kanal**.
- Kanal yang diatur **"Wajib link"** (misalnya YouTube atau Instagram) harus diisi **link postingannya** saat dicentang.
- Kanal tanpa "Wajib link" (misalnya WA Grup atau TV Display) cukup dicentang.
- Begitu **semua kanal tercentang**, kartu otomatis pindah ke **Telah Tayang**.

> Link postingan menjadi jembatan ke **Laporan Media Sosial (Tahap 2)**. Saat statistik diimpor, sistem bisa mencocokkan statistik ke konten Planner, menandai postingan yang tidak tercatat di Planner, dan menandai konten yang dicentang "Tayang" tapi tidak ditemukan di platform.

### 6.6 Komentar & Riwayat

- Setiap kartu punya **kolom komentar** untuk semua orang di unit, termasuk Direktur. Komentar dipakai untuk masukan ringan tanpa memindahkan kartu.
- Setiap kartu mencatat **riwayat perpindahan tahap**, yaitu siapa dan kapan. Contohnya: "Disetujui oleh Direktur, 12 Nov 14.20". Riwayat juga memuat catatan revisi dan dapat dilihat semua orang di unit.

---

## 7. Absensi

### 7.1 Pengisian

- Diisi oleh **Manajer** untuk dirinya sendiri dan semua staf.
- Pilihan: **Hadir, Izin, Izin Kegiatan, Sakit, Tanpa Keterangan**.
- Pengaruhnya ke laporan harian dijelaskan di 5.4.

### 7.2 Hari Libur

- Sabtu adalah hari kerja secara default.
- Manajer bisa menandai tanggal tertentu sebagai **hari libur**, misalnya hari libur nasional. Pada hari libur tidak ada laporan harian dan tidak ada absensi.

### 7.3 Rekap Absensi

- **Staf** melihat rekap absensinya sendiri.
- **Manajer & Direktur** melihat rekap semua orang.

---

## 8. Layanan

Menu **Layanan** menggantikan istilah "Ticketing". Menu ini bisa diakses **semua pegawai sekolah**. Bagi Staf Unit Lain, hanya menu ini yang terlihat.

### 8.1 Pengajuan SDM

**Formulir:**

| Kolom | Wajib | Keterangan |
|---|---|---|
| Nama Kegiatan | ✅ | |
| Tanggal mulai & selesai | ✅ | |
| Unit pengaju | ✅ | Dropdown dari Setting |
| Lampiran rundown | — | File |
| Nomor WA | ✅ | Untuk koordinasi selanjutnya |
| SDM 1, SDM 2, dst. | ✅ minimal 1 | Setiap SDM wajib dipilih tugasnya (dropdown dari daftar penugasan). SDM bisa ditambah sesuai kebutuhan. |
| Persetujuan fee | ✅ | Kotak centang: *"Saya memahami bahwa setiap SDM yang ditugaskan wajib diberikan fee oleh unit pengaju."* |

**Alur:**

```
Diajukan → Disetujui / Ditolak (oleh Manajer)
```

1. Pengajuan baru masuk, dan **Manajer mendapat notifikasi**.
2. Manajer meninjau. Saat menyetujui, Manajer bisa **menambah atau mengurangi SDM, memilih orangnya, dan mengubah tugas masing-masing**.
3. Setelah disetujui, Manajer memilih **salah satu** tindak lanjut:
   - **"Jadikan entri Planner"**: membuka formulir Planner yang sudah terisi nama kegiatan, tanggal kegiatan, dan susunan SDM beserta tugasnya. Semuanya **masih bisa diubah**, dan tanggal tayang wajib diisi.
   - **"Jadikan Tugas dari Manajer"**: setiap SDM langsung mendapat tugas sesuai tanggal kegiatan (lihat 5A).
   - Hanya satu yang bisa dipilih, supaya tugas tidak muncul dua kali di laporan harian.
4. Kalau ditolak, Manajer mengisi alasannya.
5. Setelah itu, **Manajer tetap bisa mengubah** tanggal dan orang kapan saja. Ini dibutuhkan karena unit pengaju sering mengubah rencana di tengah jalan tanpa mengisi ulang formulir.

**Pengajuan Saya (sisi pengaju):**

- Status: Diajukan / Disetujui / Ditolak.
- Nama SDM yang ditugaskan beserta tugas dan tanggalnya. Bagian ini selalu menampilkan susunan terbaru.
- Catatan dari Manajer, termasuk alasan kalau ditolak.
- Pengaju mendapat notifikasi saat status berubah.

### 8.2 Pengaduan Internet

Internet adalah fasilitas tambahan dari lembaga. Karena itu pengaduan **tidak punya alur tindak lanjut atau status**, dan berfungsi sebagai pencatatan dan bahan evaluasi.

**Formulir:**

| Kolom | Wajib | Bentuk |
|---|---|---|
| Gedung | ✅ | Dropdown dari Setting |
| Ruangan/Kelas | ✅ | Teks |
| Jenis Kendala | ✅ | Pilihan a–f (di bawah) |
| Waktu Mulai Terjadi | ✅ | Tanggal & jam |
| Apakah pengguna lain di ruangan mengalami hal yang sama? | ✅ | Ya / Tidak / Tidak tahu |
| Deskripsi Kendala | — | Teks bebas |

**Pilihan Jenis Kendala:**

- a. Wifi #INSANTAMA tidak muncul/tidak terbaca
- b. Tidak bisa terhubung ke #INSANTAMA
- c. Username atau password salah/tidak tahu
- d. Terhubung ke #INSANTAMA tetapi tidak bisa akses internet sama sekali
- e. Terhubung ke #INSANTAMA tetapi akses internet lambat
- f. Bisa akses internet, namun tidak dapat mengakses website atau aplikasi tertentu

**Setelah dikirim:**

- Pengaju melihat pesan umum: *"Terima kasih, pengaduan Anda sudah kami terima dan akan menjadi bahan evaluasi layanan internet sekolah."*
- Tidak ada status dan tidak ada notifikasi lanjutan.

**Sisi unit:**

- Daftar pengaduan dan **rekap per gedung, per jenis kendala, dan per pekan**.
- Bisa dilihat oleh **seluruh staf unit (IT & Media), Manajer, dan Direktur**. Unit lain tidak bisa melihat.

---

## 9. Inventaris & Peminjaman Alat

### 9.1 Data Inventaris

- Isian: **nama alat, merek, jumlah**.
- Dikelola oleh **Manajer** (tambah, ubah, hapus).
- **Stok tersedia** = jumlah − sedang dipinjam − rusak/hilang.

### 9.2 Peminjaman

- Dicatat oleh **semua staf unit selain Direktur**.
- Peminjam bisa berasal dari unit mana saja, termasuk staf unit sendiri, dan **tidak perlu login**.

| Kolom | Wajib |
|---|---|
| Nama lengkap peminjam | ✅ |
| Unit | ✅ |
| Nomor WA | — |
| Tanggal & jam mulai pinjam | ✅ |
| Tanggal & jam rencana pengembalian | ✅ |
| Daftar alat & jumlahnya | ✅ (merujuk ke data inventaris, dan tidak bisa melebihi stok tersedia) |

### 9.3 Pengembalian

1. Klik transaksi di daftar peminjaman.
2. Isi tanggal & jam pengembalian.
3. Kalau ada alat yang bermasalah atau hilang, tulis kendalanya per alat.
4. Simpan. Status berubah menjadi **Dikembalikan**.

- Pengembalian dilakukan **sekaligus untuk satu transaksi**, tidak sebagian.
- Alat yang dilaporkan rusak atau hilang **mengurangi stok tersedia** sampai statusnya diperbaiki Manajer di data inventaris.

---

## 10. Aplikasi HP & Notifikasi

### 10.1 Bentuk Aplikasi

- Satu **aplikasi web** yang menyesuaikan layar HP dan laptop.
- Bisa **dipasang sebagai ikon di layar HP** (Progressive Web App / PWA), tanpa aplikasi native Android/iOS.
- **Syarat iPhone:** notifikasi hanya berfungsi di iOS 16.4 ke atas, dan aplikasi harus dipasang lewat "Tambahkan ke Layar Utama". Syarat ini perlu disosialisasikan ke staf.

### 10.2 Daftar Notifikasi

| Kejadian | Penerima |
|---|---|
| Penugasan baru atau berubah di Media Planner | Staf yang ditugaskan |
| Tugas dari Manajer baru atau berubah | Staf yang terdampak |
| Laporan harian perlu diisi ulang | Staf terkait |
| **Pengingat mengisi laporan, pukul 15.45 WIB** | Staf yang belum mengirim laporan hari itu |
| Kartu masuk Review | Manajer |
| Kartu menunggu persetujuan | Direktur |
| Kartu dikembalikan untuk revisi | Staf yang ditugaskan di entri tersebut |
| Pengajuan SDM baru | Manajer |
| Status Pengajuan SDM berubah | Pengaju |
| Alat belum dikembalikan melewati jadwal | Staf yang mencatat peminjaman |

Pengaduan Internet **tidak** memicu notifikasi.

---

## 11. Hal yang Masih Perlu Ditindaklanjuti

| No | Hal | Penanggung jawab |
|---|---|---|
| 1 | Memastikan cara login lewat sistem informasi sekolah (SSO/API atau database) | Manajer × pengelola sistem informasi |
| 2 | Mengisi data awal Setting: daftar penugasan, kanal (beserta "Wajib link"), tugas rutin per orang, unit, gedung | Manajer |
| 3 | Mengisi data awal inventaris alat | Manajer |
| 4 | Merancang Laporan Media Sosial (Tahap 2): platform, format file impor, isi laporan pekanan | Manajer |
