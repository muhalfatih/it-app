# Operasional: pekerjaan terjadwal (cron)

Empat pekerjaan berkala dijalankan lewat **crontab pengguna di VPS**, bukan infrastruktur baru.
Ada dua cara memasang, sesuai cara aplikasi dijalankan: lewat pnpm/nvm di host (bagian berikut),
atau seluruhnya lewat Docker Compose (bagian "Pasang (VPS dengan Docker saja)").

## Pasang (host dengan pnpm/nvm)

Semua pekerjaan dipanggil lewat `scripts/cron-run.sh`. Pembungkus itu memuat nvm (cron berjalan
dengan PATH minimal sehingga `pnpm` tidak ditemukan tanpa itu) dan menurunkan root repo dari lokasi
berkasnya sendiri, jadi **repo boleh dipasang di direktori mana pun** tanpa mengubah isi crontab.

Ganti `/srv/it-app` dengan lokasi repo di VPS, lalu `crontab -e` sebagai pengguna yang memiliki
repo dan `~/.nvm`:

```cron
CRON_TZ=Asia/Jakarta
MAILTO=""

# Pengingat laporan harian, 15.45 WIB (spesifikasi §10.2)
45 15 * * 1-6 /srv/it-app/scripts/cron-run.sh push:reminder >> $HOME/log/it-app-cron.log 2>&1

# Alat belum dikembalikan melewati jadwal
0 7 * * 1-6 /srv/it-app/scripts/cron-run.sh push:overdue >> $HOME/log/it-app-cron.log 2>&1

# Pembekuan laporan yang lewat batas kunci 10.00 WIB
15 10 * * 1-6 /srv/it-app/scripts/cron-run.sh report:freeze >> $HOME/log/it-app-cron.log 2>&1

# Penyapu media & rundown yatim di S3
0 3 * * * /srv/it-app/scripts/cron-run.sh media:sweep >> $HOME/log/it-app-cron.log 2>&1
```

Siapkan dulu direktori lognya: `mkdir -p $HOME/log`.

`CRON_TZ=Asia/Jakarta` dipakai karena VPS umumnya berjalan di UTC sementara jam 15.45 pada
spesifikasi adalah WIB. Tanggal di dalam kode tetap dihitung sendiri dengan `todayWib()`, jadi
salah set zona hanya menggeser jam pemicunya, bukan tanggal datanya.

## Pasang (VPS dengan Docker saja)

Bila aplikasi berjalan lewat `docker compose` dan host tidak punya pnpm/nvm, cron memanggil layanan
`tasks` (profil `tasks`: tidak ikut `up`, hanya hidup selama pekerjaan berjalan). Layanan ini
memakai alamat internal `db:5432` dan `rustfs:9000`, serta `.env` di root repo. Pengguna crontab
harus boleh menjalankan `docker` (anggota grup `docker`). `-T` wajib karena cron tidak punya TTY.

```cron
CRON_TZ=Asia/Jakarta
MAILTO=""
DC="docker compose -f /srv/it-app/docker-compose.yml run --rm -T tasks pnpm --filter admin"

45 15 * * 1-6 $DC push:reminder >> $HOME/log/it-app-cron.log 2>&1
0 7 * * 1-6   $DC push:overdue  >> $HOME/log/it-app-cron.log 2>&1
15 10 * * 1-6 $DC report:freeze >> $HOME/log/it-app-cron.log 2>&1
0 3 * * *     $DC media:sweep   >> $HOME/log/it-app-cron.log 2>&1
```

Setelah `git pull` yang mengubah kode skrip, bangun ulang image-nya:
`docker compose --profile tasks build tasks`. Uji sekali jalan ke basis data uji:

```bash
docker compose run --rm -T -e DATABASE_URL=postgres://itapp:itapp@db:5432/itapp_test \
  tasks pnpm --filter admin push:reminder
```

## Kenapa `1-6`

`isWorkday()` hanya mengecualikan hari Minggu dan tanggal yang terdaftar sebagai hari libur, jadi
Senin–Sabtu adalah hari kerja. Hari libur tidak perlu diketahui cron: `push:reminder` dan
`report:freeze` sudah memeriksanya sendiri lewat `allHolidays()` dan berhenti tanpa mengirim apa
pun. `media:sweep` tidak bergantung hari kerja, jadi dijalankan setiap hari.

## Prasyarat

- `.env` ada di root repo (skrip memanggil `tsx --env-file=../../.env`), berisi `DATABASE_URL`,
  kredensial S3, dan tiga kunci VAPID. Tanpa kunci VAPID, pekerjaan push tetap berjalan tetapi
  hanya mencatat `Push nonaktif: kunci VAPID belum diset` dan tidak mengirim apa-apa.
- Dependensi sudah terpasang (`pnpm install`) dan migrasi sudah dijalankan.

## Uji sekali jalan

Jalankan persis seperti cron memanggilnya, dari direktori mana pun:

```bash
/srv/it-app/scripts/cron-run.sh push:reminder
```

Keluarannya satu baris stempel waktu diikuti ringkasan skrip, misalnya
`Pengingat laporan: 3 staf diingatkan` atau `Pengingat laporan: 2026-11-22 bukan hari kerja`.
Untuk menguji tanpa menyentuh data produksi, timpa `DATABASE_URL` ke basis data uji:

```bash
DATABASE_URL=postgres://itapp:itapp@127.0.0.1:5432/itapp_test /srv/it-app/scripts/cron-run.sh push:overdue
```

## Catatan

- Kegagalan sungguhan (mis. basis data mati) membuat skrip keluar dengan kode bukan nol dan
  tercatat di berkas log; kegagalan kirim ke satu langganan push sengaja tidak menggagalkan
  pekerjaan, hanya dicatat, dan langganan yang dijawab 404/410 dihapus otomatis.
- `push:overdue` mengirim satu notifikasi per pencatat setiap kali dijalankan, berisi semua
  peminjamannya yang terlambat (keputusan #11, 23 Nov 2026). Pengingat diulang tiap pagi sampai
  alatnya dikembalikan.
- Berkas log tidak dirotasi. Bila nanti membesar, tambahkan satu berkas `/etc/logrotate.d/it-app`
  atau ganti pengalihan log dengan `| logger -t it-app`.
