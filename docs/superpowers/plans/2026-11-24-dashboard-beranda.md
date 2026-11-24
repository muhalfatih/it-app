# Rencana: beranda menjadi dashboard

Tanggal: 24 Nov 2026. Isi sudah disetujui pengguna; sesi eksekusi dipilih: sesi baru.
Rekomendasi model: Opus, effort sedang.

## Tujuan

Ganti `apps/admin/app/(app)/page.tsx` (sekarang hanya sapaan dan tombol galeri) dengan dashboard
yang menjawab "apa yang perlu saya kerjakan hari ini". Isi disusun per peran, mengikuti judul
sidebar di `apps/admin/lib/menu.tsx` (Kerja saya, Konten & media, Pantau tim). Bagian yang
izinnya tidak dimiliki akun tidak dimuat dan tidak ditampilkan. Setiap kartu punya link ke
halaman sumbernya.

## Isi yang disetujui

Urutan tampil dari atas:

1. Sapaan + tanggal hari ini; tandai bila hari libur (`holidaySet`).
2. **Perlu tindakan**: hal yang belum beres hari ini milik akun ini (absensi belum diisi,
   laporan belum diisi, tugas lewat tenggat). Kosong = tampilkan keadaan "semua beres".
3. **Kerja saya**
   - Kartu 1: status absensi hari ini + tombol Isi absensi. Izin `absensi.isi`.
   - Kartu 2: laporan harian hari ini (sudah/belum) + skor pekan ini. Izin `laporan.isi`.
   - Kartu 3: tugas dari manajer untuk saya, yang aktif dan dekat tenggat (`managerTasksFor`).
   - Grafik skor laporan saya, 8 pekan (garis). Izin `laporan.rekap.sendiri`.
4. **Konten & media**
   - Kartu 6: jadwal Media Planner pekan ini, ringkas per hari. Izin `planner.lihat`.
5. **Pantau tim** (manajer)
   - Kartu 8: kehadiran tim hari ini (hadir/izin/sakit/belum absen). Izin `absensi.rekap.semua`.
   - Kartu 9: siapa yang belum mengisi laporan hari ini. Izin `laporan.rekap.semua`.
   - Kartu 10: jumlah pengajuan SDM menunggu persetujuan + link. Izin `layanan.setujui_sdm`.
   - Grafik kehadiran tim per hari, 2 pekan (batang bertumpuk per status). Izin `absensi.rekap.semua`.
   - Grafik beban kerja per orang pekan ini (batang horizontal, urut terbanyak, nama lengkap,
     hanya manajer). Izin `planner.lihat` + `absensi.rekap.semua` atau izin manajer yang setara;
     cek matriks di `packages/auth` sebelum memilih.
   - Grafik pengaduan internet per pekan: pakai ulang `WeekChart` dari
     `app/(app)/layanan/internet/rekap/_week-chart.tsx` dan data yang sama dengan halaman itu.
     Izin `pengaduan.lihat`.
6. Link kecil "Galeri komponen" di bawah (galeri tidak ada di sidebar).

Ditunda: kepatuhan laporan tim 4 pekan (butuh query per periode baru), kanban per tahap,
pengajuan saya, alat yang saya pinjam.

## Sumber data (sudah dicek)

- `lib/attendance/queries.ts`: `attendanceFor(date)` → `Map<userId, status>` untuk satu tanggal;
  `attendanceOf(userId, from, to)`. Untuk 2 pekan: 10 panggilan `attendanceFor`, atau tambah
  query rentang bila perlu. "Belum absen" = staf (`listReporters` / `listStaff`) dikurangi map.
- `lib/report/queries.ts`: `loadDay(userId, date)` (status + skor hari ini),
  `loadPeriodDays(userId, start, end)` (panggil sekali untuk 8 pekan lalu kelompokkan per pekan;
  jangan 8× `loadRecap`), `listTeamDay(date)` (status + skor tiap orang hari ini).
- `lib/manager-task/queries.ts`: `managerTasksFor(userId, date)`; tenggat terlewat: lihat logika
  di `lib/push/overdue.ts`.
- `lib/planner/queries.ts`: `listEntriesInPeriod(period)` (dengan penugasan), `listStaff()`.
- `lib/layanan/queries.ts`: `listRequests` untuk antrean persetujuan.
- Halaman rekap pengaduan (`app/(app)/layanan/internet/rekap/page.tsx`) untuk data per pekan.

## File

Tambah:
- `apps/admin/lib/dashboard/queries.ts`: pengumpul data; tiap bagian dimuat hanya bila izinnya ada
  (`user.permissions.has(...)`), dijalankan paralel.
- `apps/admin/lib/dashboard/*.test.ts`: tes fungsi murni (hitungan kehadiran per hari, skor per
  pekan, beban per orang). Vitest hanya mengambil `lib/**/*.test.ts`.
- `packages/ui/src/components/domain/attendance-chart.tsx`, `workload-chart.tsx`,
  `score-chart.tsx`: dirakit dari `@workspace/ui/components/chart` (recharts), pola seperti
  `_week-chart.tsx`.
- Token warna status kehadiran di `packages/ui/src/styles/globals.css` (terang dan gelap):
  hadir = warna utama; sakit dan tanpa keterangan lebih mencolok; daftarkan juga di `@theme`.

Ubah:
- `apps/admin/app/(app)/page.tsx`: pertahankan Alert `?akses=ditolak` yang sudah ada.

## Aturan yang berlaku (dari CLAUDE.md)

- Panggil skill `shadcn` dan `frontend-design:frontend-design` sebelum menulis kode,
  `anthropic-skills:web-design-guidelines` pada hasil.
- Hanya komponen yang ada di galeri/`packages/ui`: `card`, `badge`, `button`, `empty`, `table`,
  `chart`, `@reui/alert`. Tidak memasang komponen baru; bila ternyata perlu, ajukan nama dan
  sumbernya ke pengguna dulu.
- Komponen baru hanya di `packages/ui/src/components/domain/`. Jangan hardcode warna.
- Perintah di WSL: `. ~/.nvm/nvm.sh` dulu. Verifikasi: `pnpm typecheck`, `pnpm lint`,
  `pnpm vitest run` (di `apps/admin`, kecualikan `*.db.test.ts` bila DB uji tidak siap).

## Cek tampilan

`localhost:3000` adalah container Docker (`it-app-app-1`), bukan dev server. Setelah perubahan:
`docker compose up -d --build app` dari root repo (container ini juga terhubung ke tunnel
Cloudflare). Login lewat `demo-id.simtama.net` dilakukan pengguna sendiri. Cek di Chrome dengan
akun manajer; screenshot setelah hidrasi (tunggu ±1 detik).
