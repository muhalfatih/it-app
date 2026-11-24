# PRD — Aplikasi Unit IT & Media (Tahap 1)

Nov 14, 2026 · @Insantama

## 1. Ringkasan & Latar Belakang

Aplikasi web internal untuk mengelola seluruh kerja Unit IT & Media SIT Insantama: perencanaan konten, laporan harian, tugas, persetujuan konten, absensi, layanan ke unit lain, dan peminjaman alat. Aplikasi dibangun sebagai **web app monorepo** dengan antarmuka berbasis **shadcn/ui bergaya kustom**, dapat dipasang di HP sebagai PWA.

Masalah yang mendasari:

- Pencatatan kerja unit masih manual dan tersebar (chat, catatan, lisan), sehingga sulit ditelusuri.
- Tidak ada gambaran beban kerja per orang — sulit melihat siapa yang longgar dan siapa yang penuh.
- Alur persetujuan konten (Manajer, lalu Direktur) tidak terdokumentasi dan mudah tertahan.
- Laporan harian dan absensi tidak terekap otomatis, sehingga penilaian kinerja memakan waktu.
- Permintaan SDM dari unit lain dan pengaduan internet masuk lewat jalur informal tanpa catatan.
- Peminjaman alat tidak tercatat, stok dan keberadaan alat sulit dipastikan.

Sumber kebutuhan fungsional rinci: dokumen *Spesifikasi Aplikasi Unit IT & Media — Tahap 1* (14 November 2026, disetujui Manajer). PRD ini merangkum spesifikasi tersebut dan menambahkan kebutuhan teknis pengembangan.

## 2. Tujuan & Metrik Sukses

Tujuan Tahap 1: seluruh kerja rutin unit berjalan lewat aplikasi, bukan lagi lewat catatan manual.

| Tujuan | Metrik | Target |
| --- | --- | --- |
| Laporan harian berjalan lewat aplikasi | Staf wajib yang mengisi sebelum batas kunci | ≥ 90% hari kerja, 1 bulan setelah rilis |
| Semua konten melewati alur persetujuan | Konten tayang yang kartunya lengkap sampai "Telah Tayang" | 100% |
| Perencanaan konten terpusat | Konten/kegiatan Media yang tercatat di Planner | 100% |
| Layanan unit lain tercatat | Pengajuan SDM & pengaduan internet lewat aplikasi | 100%, jalur informal ditutup |
| Peminjaman alat tercatat | Transaksi pinjam–kembali lewat aplikasi | 100% |
| Aplikasi dipakai di HP | Staf unit yang memasang PWA & mengaktifkan notifikasi | 100% staf unit |

Angka target perlu dikonfirmasi Manajer saat kickoff; baris dapat diubah langsung di tabel ini.

## 3. Target Pengguna & Peran

Lima peran, diatur di aplikasi (bukan di sistem informasi sekolah). Akun tanpa peran otomatis menjadi Staf Unit Lain.

| Peran | Fokus penggunaan |
| --- | --- |
| **Direktur** | Persetujuan akhir konten (Review → Disetujui), melihat semua data & rekap. Tidak mengisi laporan harian. |
| **Manajer** | Mengelola unit: Setting, peran, absensi, Tugas dari Manajer, persetujuan Draft → Review, persetujuan Pengajuan SDM, inventaris. |
| **SDM Bidang Strategi** | Mengisi Planner, memindahkan kartu Ide → Draft, laporan harian. |
| **SDM Bidang Khusus** | Pelaksana tugas, laporan harian. Planner terbuka dengan filter "Pekerjaan saya saja". |
| **Staf Unit Lain** | Hanya menu Layanan: Pengajuan SDM & Pengaduan Internet. |

- Setiap anggota unit diberi tanda **bidang**: IT, Media, atau keduanya. Semua staf unit bisa ditugaskan di Planner dan wajib mengisi laporan harian.
- Peminjam alat bisa dari unit mana pun dan **tidak perlu login** (dicatat oleh staf unit).
- Matriks akses lengkap per fitur mengikuti §3.3 spesifikasi dan menjadi acuan implementasi otorisasi.

## 4. Ruang Lingkup

**Masuk Tahap 1** — sembilan modul:

1. Akun, Peran & Setting
2. Media Planner (daftar, kalender pekanan, partisi per orang, unduh PDF)
3. Laporan Harian (End of Day Report) beserta Rekap & skor
4. Tugas dari Manajer
5. Manajemen Konten (Kanban & persetujuan berjenjang)
6. Absensi beserta Rekap & hari libur
7. Layanan: Pengajuan SDM & Pengaduan Internet
8. Inventaris & Peminjaman Alat
9. PWA & Notifikasi push

**Di luar Tahap 1:**

- **Laporan Media Sosial** (impor statistik platform, laporan pekanan) — Tahap 2. Tahap 1 menyiapkan jembatannya: link postingan per kanal pada centang "Tayang".
- Aplikasi native Android/iOS — digantikan PWA.
- Integrasi dua arah dengan sistem informasi sekolah selain autentikasi.
- Penggajian/fee SDM — aplikasi hanya mencatat persetujuan fee di formulir Pengajuan SDM.

## 5. Kebutuhan Fungsional

Spesifikasi terlampir adalah acuan rinci per modul. Tabel ini merangkum aturan bisnis kunci yang paling menentukan desain teknis; nomor merujuk ke bagian spesifikasi.

| Modul | Aturan kunci |
| --- | --- |
| Akun & Peran (§3) | Login lewat akun sistem informasi sekolah; peran & bidang diatur di aplikasi. Setting dikelola Manajer: daftar penugasan, kanal (dengan opsi "Wajib link"), tugas rutin per orang, unit, gedung. |
| Media Planner (§4) | Entri = nama, penugasan multi-baris (orang + jenis + rentang tanggal), kanal multi-pilih, tanggal tayang. Tiga tampilan: daftar, kalender pekanan, partisi per orang (sel kosong abu-abu). PDF pekanan/bulanan mengikuti tampilan & filter aktif. Entri baru otomatis membuat kartu Kanban tahap Ide; hapus entri ikut menghapus kartu + file (aturan §4.5). |
| Laporan Harian (§5) | Hari kerja Senin–Sabtu; terkunci hari kerja berikutnya pukul 10.00 (Manajer bisa buka kunci). Tugas dari 4 sumber: Rutin, Planner, dari Manajer, input sendiri; status T/TL; tugas multi-hari muncul tiap hari sampai Tuntas, lewat tenggat berlabel "Tertunda N hari". Skor = Tuntas ÷ total; rekap pekanan/bulanan per sumber, PDF. Absensi non-Hadir menyembunyikan laporan dari skor tanpa menghapus. Perubahan tugas memicu tanda "Perlu diperbarui" + notifikasi; jawaban lama tetap terisi. |
| Tugas dari Manajer (§5A) | Dibuat kapan saja atau dari persetujuan Pengajuan SDM. Manajer bebas mengedit; tiap perubahan memicu notifikasi, tanda "Perlu diperbarui", dan sinkron ke "Pengajuan Saya" pengaju. |
| Manajemen Konten (§6) | Alur Ide → Draft → Review → Disetujui → Telah Tayang (diagram di bawah). Pengembalian satu tahap wajib catatan revisi. Isi kartu terkunci sejak Review. File (foto/video) di server unit, bisa diputar langsung di aplikasi. Centang "Tayang" per kanal; kanal "Wajib link" harus diisi link; semua tercentang → otomatis Telah Tayang. Komentar & riwayat perpindahan tercatat. |
| Absensi (§7) | Diisi Manajer untuk semua. Pilihan: Hadir, Izin, Izin Kegiatan, Sakit, Tanpa Keterangan. Manajer menandai hari libur. Rekap: staf melihat diri sendiri, Manajer & Direktur melihat semua. |
| Layanan (§8) | Pengajuan SDM: Diajukan → Disetujui/Ditolak; saat menyetujui Manajer bisa mengubah susunan SDM, lalu memilih satu tindak lanjut (entri Planner ATAU Tugas dari Manajer, tidak keduanya). Pengaduan Internet: tanpa status & tanpa notifikasi lanjutan; rekap per gedung, jenis kendala, pekan — hanya untuk staf unit. |
| Inventaris (§9) | Stok tersedia = jumlah − dipinjam − rusak/hilang. Peminjam tanpa login; pinjam tidak boleh melebihi stok; pengembalian sekaligus per transaksi, kendala dicatat per alat. |
| Notifikasi (§10) | Push notification PWA sesuai daftar §10.2, termasuk pengingat laporan pukul 15.45 WIB. Pengaduan Internet tidak memicu notifikasi. |

&#91;embedded content: alur persetujuan konten · 5 tahap, 2 jalur revisi\]

Setiap panah maju dijaga satu peran; pengembalian selalu satu tahap ke belakang dan wajib catatan revisi.

## 6. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
| --- | --- |
| Responsif | Satu web app untuk HP dan laptop; tampilan Planner (kalender, partisi) tetap terpakai di layar HP. |
| PWA | Dapat dipasang ke layar utama; notifikasi push Android & iOS (iOS ≥ 16.4, wajib "Tambahkan ke Layar Utama" — perlu sosialisasi). |
| Performa | Halaman utama terbuka < 3 detik pada jaringan sekolah; pemutaran video review tanpa unduh penuh (streaming/range request). |
| Penyimpanan file | File konten (foto/video) di server milik unit. Batas ukuran unggah per file dan format yang didukung **perlu ditetapkan** (lihat §9 Pertanyaan Terbuka). |
| Keamanan | Otorisasi server-side mengikuti matriks akses §3.3 spesifikasi; file konten tidak dapat diakses tanpa login; data pengaduan & pengajuan hanya untuk pihak yang berhak. |
| Backup | Backup basis data dan file terjadwal; prosedur pulih dicoba sebelum rilis. |
| Zona waktu | Seluruh aturan jam (kunci 10.00, pengingat 15.45) mengikuti WIB. |
| Kompatibilitas | Browser evergreen (Chrome, Safari, Edge, Firefox) versi 2 tahun terakhir. |
| Audit | Riwayat perpindahan kartu, catatan revisi, dan log buka-kunci laporan tersimpan dan tidak dapat diubah pengguna. |

## 7. Arsitektur Teknis: Monorepo

Satu monorepo **pnpm workspaces + Turborepo** menampung aplikasi dan paket bersama, agar komponen UI, skema data, dan konfigurasi dipakai bersama tanpa duplikasi, serta siap menampung aplikasi Tahap 2 (Laporan Media Sosial) tanpa restrukturisasi. Struktur paket digambarkan di bawah.

| Lapisan | Pilihan | Catatan |
| --- | --- | --- |
| Framework | Next.js (App Router) + TypeScript | Satu aplikasi `apps/web` untuk semua peran; route group per modul. |
| UI | Tailwind CSS + shadcn/ui | Komponen di `packages/ui`, gaya kustom (lihat §8). |
| Basis data | PostgreSQL + ORM (Drizzle/Prisma) | Skema & migrasi di `packages/db`. |
| Autentikasi | Adapter ke akun sistem informasi sekolah | Mekanisme (SSO/API/baca database) menunggu jawaban pengelola — risiko #1 di §9. Dibungkus satu paket `packages/auth` agar mudah diganti. |
| File | Server milik unit (disk lokal / MinIO) | Streaming video untuk review; akses lewat endpoint ter-otorisasi. |
| Notifikasi push | Web Push (VAPID) + service worker PWA | Jadwal pengingat 15.45 WIB lewat cron server. |
| PDF | Render server-side dari tampilan aktif | Planner (3 bentuk) dan rekap laporan. |
| Deployment | Server unit (self-hosted), Docker | File wajib di server unit, maka aplikasi ikut self-hosted. |

&#91;embedded content: struktur monorepo · 2 aplikasi, 4 paket bersama\]

Aplikasi hanya merakit; logika UI, data, dan autentikasi hidup di paket bersama sehingga Tahap 2 tinggal menambah aplikasi.

## 8. Desain & UI: shadcn/ui dengan Gaya Kustom

Semua antarmuka dibangun dari komponen **shadcn/ui** yang disalin ke `packages/ui` dan di-tema ulang — bukan tampilan bawaan shadcn.

**Prinsip gaya kustom:**

- Satu set **design token** (CSS variables: warna, radius, tipografi, spacing) di preset Tailwind bersama; identitas warna SIT Insantama sebagai warna utama. Token adalah satu-satunya sumber warna — tidak ada nilai heks langsung di komponen.
- Tema terang sebagai default; tema gelap opsional bila token sudah stabil.
- Komponen shadcn yang di-tema ulang dipakai konsisten: `Table`, `Calendar`, `Card` (Kanban), `Dialog`, `Form`, `Select`, `Badge` (label T/TL, "Tertunda", status), `Checkbox` (centang Tayang), `Toast` (notifikasi dalam aplikasi).
- Komponen domain dibangun di atasnya dan tinggal di `packages/ui`: grid partisi per orang (sel kosong abu-abu), kartu konten Kanban, baris penugasan multi-entry, pemutar media review.
- Target sentuh ≥ 44 px, fokus keyboard terlihat, kontras WCAG AA — aplikasi dipakai harian di HP.

**Keluaran desain:** tema token + galeri komponen ter-tema disepakati **sebelum** pengembangan modul dimulai, agar tiap modul tinggal merakit.

## 9. Risiko & Pertanyaan Terbuka

Risiko terbesar adalah mekanisme login — arsitektur autentikasi tidak bisa final sebelum terjawab.

| # | Hal | Dampak | Tindak lanjut |
| --- | --- | --- | --- |
| 1 | Mekanisme login ke sistem informasi sekolah (SSO/API atau baca database) belum pasti | Memblokir desain `packages/auth` | Manajer × pengelola sistem informasi; siapkan cadangan akun lokal bila integrasi tidak memungkinkan |
| 2 | Batas ukuran & format file video belum ditetapkan | Menentukan kapasitas server dan UX unggah | Tetapkan bersama Manajer sebelum modul Kanban dibangun |
| 3 | Ide → Draft hanya oleh SDM Strategi | Kartu tertahan bila posisi kosong/berhalangan | Selesai 24 Nov 2026: Manajer juga boleh memindahkan (spesifikasi §3.3 dan §6.2) |
| 4 | Centang "Tayang" tidak bisa dibatalkan | Salah centang/link keliru tak terkoreksi | Selesai 24 Nov 2026: Manajer boleh membatalkan centang kanal dengan alasan wajib (spesifikasi §3.3 dan §6.5) |
| 5 | Laporan terkunci pukul 10.00, tapi absensi non-Hadir bisa diisi belakangan | Staf izin bisa terlanjur kena skor 0 | Pastikan: absensi non-Hadir yang diisi kapan pun tetap menyembunyikan laporan hari itu dari skor |
| 6 | Rangkap peran belum diatur (mis. SDM Strategi sekaligus Khusus) | Model data peran | Konfirmasi: satu akun satu peran, atau multi-peran |
| 7 | Inventaris tidak punya kolom jumlah rusak/hilang (§9.1 vs §9.3) | Rumus stok tersedia tak bisa dihitung | Tambahkan kolom jumlah rusak/hilang per alat di data inventaris |
| 8 | Notifikasi iOS butuh ≥ 16.4 + pasang ke layar utama | Staf iPhone bisa tak menerima notifikasi | Sosialisasi + halaman panduan pemasangan di aplikasi |
| 9 | Data awal Setting & inventaris belum diisi | Aplikasi kosong saat rilis | Manajer mengisi sebelum uji coba (daftar penugasan, kanal + "Wajib link", tugas rutin, unit, gedung, alat) |

## 10. Kriteria Penerimaan

Tahap 1 diterima bila seluruh butir berikut lulus uji bersama Manajer memakai data nyata unit:

- [ ] Login dengan akun sistem informasi berhasil; akun tanpa peran hanya melihat menu Layanan.
- [ ] Entri Planner baru otomatis memunculkan kartu Ide; hapus entri menghapus kartu + file sesuai aturan §4.5 (konfirmasi dua langkah untuk tahap Review ke atas).
- [ ] Tiga tampilan Planner benar, filter "Pekerjaan saya saja" aktif default untuk SDM Khusus, dan PDF mengikuti tampilan + filter aktif.
- [ ] Laporan harian: terkunci pukul 10.00 hari kerja berikutnya; skor dan rincian 4 sumber benar pada rekap pekanan & bulanan; label "Tertunda N hari" muncul; absensi non-Hadir menyembunyikan laporan dari skor dan kembali saat diubah ke Hadir.
- [ ] Perubahan tugas (Planner/Rutin/Manajer) memicu notifikasi + tanda "Perlu diperbarui" dengan jawaban lama tetap terisi.
- [ ] Alur Kanban dan wewenang per perpindahan sesuai §6.2; pengembalian wajib catatan revisi; kartu terkunci sejak Review; semua kanal tercentang (link terisi untuk kanal "Wajib link") memindahkan kartu ke Telah Tayang.
- [ ] Video konten dapat diputar langsung di aplikasi untuk review.
- [ ] Pengajuan SDM: tindak lanjut hanya satu (Planner ATAU Tugas dari Manajer); perubahan oleh Manajer tersinkron ke "Pengajuan Saya"; pengaduan internet terekap per gedung/jenis/pekan tanpa status.
- [ ] Peminjaman tidak bisa melebihi stok tersedia; alat rusak/hilang mengurangi stok sampai dipulihkan Manajer.
- [ ] PWA terpasang di Android & iOS; seluruh notifikasi §10.2 terkirim, termasuk pengingat 15.45 WIB.
- [ ] Otorisasi diuji per peran terhadap matriks akses §3.3 (termasuk akses langsung lewat URL/API).
- [ ] Backup & pulih data dicoba sekali sebelum rilis.
