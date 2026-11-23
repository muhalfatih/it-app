# Aplikasi Unit IT & Media — SIT Insantama

Aplikasi kerja internal Unit IT & Media: Media Planner, papan konten, laporan harian, absensi,
pengajuan SDM, pengaduan internet, inventaris, dan notifikasi push. Satu aplikasi web yang
menyesuaikan HP dan laptop, bisa dipasang sebagai ikon di layar utama (PWA).

Acuan kebutuhan ada di `resources/prd_aplikasi-it-dan-media-tahap-1.md` dan
`resources/spesifikasi-aplikasi-unit-it-media-tahap-1.md`.

## Kebutuhan

| Kebutuhan | Versi | Catatan |
|---|---|---|
| Node.js | ≥ 20.9 | mesin pengembangan memakai 26.x lewat nvm (`. ~/.nvm/nvm.sh`) |
| pnpm | 12.21.0 | dipatok di `packageManager`; paling mudah lewat `corepack enable` |
| Docker + Compose | mutakhir | menjalankan Postgres dan penyimpanan S3 |
| PostgreSQL | 17 | lewat `docker compose` (layanan `db`) |
| Penyimpanan S3 | RustFS 1.0.6 | lewat `docker compose` (layanan `rustfs`); unggahan media & rundown |
| HTTPS | wajib di produksi | service worker dan Push API hanya jalan di secure context; `localhost` dikecualikan |
| Browser | Chrome/Edge/Firefox/Safari terbaru | notifikasi iOS butuh **16.4+** dan aplikasi harus dipasang lewat "Tambahkan ke Layar Utama" |

Port yang dipakai: **3000** aplikasi, **5432** Postgres, **9000/9001** RustFS.

Di Windows, jalankan semuanya **di dalam WSL** dengan Node dari nvm. Menjalankan npm/pnpm dari
Windows terhadap path `\\wsl.localhost\...` membuat install gagal.

## Variabel lingkungan

Satu `.env` di root repo dipakai bersama oleh aplikasi (`next.config.ts` memuatnya), `docker
compose`, skrip seed, dan pekerjaan cron:

```bash
cp env.example .env
```

Yang harus diisi sendiri:

| Variabel | Cara mengisi |
|---|---|
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` (minimal 32 karakter) |
| `SIMTAMA_ISSUER`, `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET` | klien SSO Simtama ID; **wajib**, satu-satunya cara masuk |
| `SEED_MANAGER_USERNAME` | username Simtama ID Manajer (hanya satu); `db:seed` menjadikannya Manajer dan melepas Manajer lama |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `pnpm dlx web-push generate-vapid-keys`; tanpa ketiganya push mati dan hanya dicatat di log |

Sisanya sudah berisi nilai bawaan untuk pengembangan lokal. Di produksi, `BETTER_AUTH_URL`,
`APP_ORIGIN`, dan `S3_PUBLIC_URL` harus origin publik `https://…` tanpa path.

## Jalankan semua dengan Docker

```bash
docker network create cloudflare_tunnel           # sekali; network eksternal untuk Cloudflare Tunnel
docker compose up -d --build                      # app + migrasi + Postgres + RustFS, http://localhost:3000
docker compose run --rm migrate pnpm --filter @workspace/auth db:seed   # sekali: akun Manajer awal
```

Antarlayanan memakai jaringan internal compose (`db:5432`, `rustfs:9000`). Hanya `app` (3000) dan
RustFS (9000 API, wajib terjangkau browser; 9001 konsol) yang dibuka ke host, semuanya di
`127.0.0.1`. Untuk membuka port lain, hapus `#` pada blok `ports:` layanan itu di
`docker-compose.yml` (templatnya ada di kepala berkas). `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ditanam saat
build: setelah mengubahnya, jalankan ulang dengan `--build`.

## Pasang pertama kali (pengembangan di host)

Buka dulu port `db` (`127.0.0.1:5432:5432`) di `docker-compose.yml`; `pnpm dev` memakai port 3000
yang sama dengan layanan `app`, jadi jangan jalankan keduanya bersamaan.

```bash
pnpm install
docker compose up -d db rustfs rustfs-init        # Postgres, RustFS, dan init bucket + CORS
pnpm --filter @workspace/db db:migrate            # migrasi skema
pnpm --filter @workspace/auth db:seed             # akun Manajer awal + contoh data Setting
pnpm dev                                          # http://localhost:3000
```

Masuk dengan `SEED_MANAGER_USERNAME` dari `.env`, lalu ganti kata sandi. Akun lain dibuat Manajer
dari halaman Setting. Seed-nya idempoten: aman dijalankan ulang.

## Perintah sehari-hari

Semua dari root repo:

| Perintah | Kegunaan |
|---|---|
| `pnpm dev` | server pengembangan |
| `pnpm build` | build produksi |
| `pnpm lint` | ESLint seluruh paket |
| `pnpm typecheck` | `tsc --noEmit` seluruh paket |
| `pnpm test` | Vitest seluruh paket |
| `pnpm --filter @workspace/db db:generate` | buat migrasi dari perubahan skema |
| `pnpm --filter @workspace/db db:migrate` | terapkan migrasi |

Komponen UI hanya ditambah lewat shadcn CLI ke paket bersama, mis.
`pnpm dlx shadcn@latest add dialog -c packages/ui`. Lihat `CLAUDE.md` untuk aturan lengkapnya.

## Tes yang menyentuh basis data

Berkas `*.db.test.ts` dilewati otomatis kecuali `DATABASE_URL` menunjuk basis data yang namanya
berakhiran `_test`. Siapkan sekali:

```bash
docker compose exec db createdb -U itapp itapp_test
DATABASE_URL=postgres://itapp:itapp@127.0.0.1:5432/itapp_test \
  pnpm --filter @workspace/db db:migrate
```

Lalu jalankan:

```bash
DATABASE_URL=postgres://itapp:itapp@127.0.0.1:5432/itapp_test pnpm test
```

## Produksi (VPS)

### Dengan Docker (disarankan)

VPS hanya butuh Docker Engine + plugin Compose (x86 maupun ARM). Contoh di bawah memakai dua
subdomain: `app.domainmu` (aplikasi) dan `files.domainmu` (RustFS, dijangkau browser untuk unggah
dan unduh).

1. Clone repo (mis. ke `/srv/it-app`), lalu `cp env.example .env` dan isi. Yang berbeda dari lokal:
   - `BETTER_AUTH_URL` dan `APP_ORIGIN` = `https://app.domainmu`, `S3_PUBLIC_URL` = `https://files.domainmu`.
   - `BETTER_AUTH_SECRET` baru; `POSTGRES_PASSWORD`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` diganti nilai
     acak yang kuat. `POSTGRES_PASSWORD` tanpa `@ : / ?` karena dipakai di URL koneksi.
   - `DATABASE_URL` dan `S3_ENDPOINT` boleh dibiarkan; compose menimpanya dengan alamat internal.
2. Minta admin Simtama mendaftarkan redirect `https://app.domainmu/api/auth/callback/simtama`.
3. Jalankan (network `cloudflare_tunnel` dibuat sekali; compose menolak `up` bila belum ada):

   ```bash
   docker network create cloudflare_tunnel
   docker compose up -d --build
   docker compose run --rm migrate pnpm --filter @workspace/auth db:seed   # hanya untuk basis data baru
   ```

4. Pasang HTTPS di depan aplikasi. Port aplikasi dan RustFS terikat ke `127.0.0.1`, jadi tidak
   terbuka ke internet tanpa tunnel atau proxy.

   **Cloudflare Tunnel di Docker (disarankan):** container `cloudflared` ikut network
   `cloudflare_tunnel` (di compose-nya: `networks: [cloudflare_tunnel]` + `cloudflare_tunnel:
   {external: true}`). Di dasbor Cloudflare (Public Hostname), arahkan:

   | Hostname | Service |
   |---|---|
   | `app.domainmu` | `http://it-app-web:3000` |
   | `files.domainmu` | `http://it-app-files:9000` |

   Alias `it-app-*` unik per proyek, jadi aman berbagi network dengan proyek lain; `db` tidak ikut
   network ini. Batas unggahan lewat Cloudflare 100 MB per permintaan (paket Free).

   **Alternatif, reverse proxy di host.** Contoh `Caddyfile` (sertifikat otomatis):

   ```caddyfile
   app.domainmu {
     reverse_proxy 127.0.0.1:3000
   }
   files.domainmu {
     reverse_proxy 127.0.0.1:9000
   }
   ```

   Memakai nginx: naikkan `client_max_body_size` di blok `files.domainmu` agar unggahan video lolos.
5. Pasang cron: bagian "Pasang (VPS dengan Docker saja)" di `docs/operasional-cron.md`.

Memperbarui ke versi baru:

```bash
git pull
docker compose up -d --build                      # migrasi baru dijalankan otomatis oleh layanan migrate
docker compose --profile tasks build tasks        # image pekerjaan cron
```

Memindahkan data dari server lama (basis data dan file tidak ikut `git`):

```bash
# server lama
docker compose exec -T db pg_dump -U itapp -Fc itapp > itapp.dump
# server baru, setelah `docker compose up -d db`
docker compose exec -T db pg_restore -U itapp -d itapp --clean --if-exists < itapp.dump
```

Isi bucket disalin dengan klien S3 apa pun (mis. `aws s3 sync` dari endpoint lama ke endpoint baru)
dengan port 9000 dibuka sementara, atau dengan menyalin volume `rustfsdata`.

### Dengan pnpm di host

Aplikasi berjalan di host dengan pnpm/nvm; Postgres dan RustFS tetap di Docker Compose (buka port
`db` di `docker-compose.yml`).

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @workspace/db db:migrate            # setiap kali ada migrasi baru
pnpm --filter admin start                         # port 3000
```

Letakkan di belakang reverse proxy ber-HTTPS (mis. Cloudflare Tunnel atau nginx). HTTPS bukan
pilihan: tanpa itu service worker tidak terdaftar dan notifikasi push tidak jalan.

`APP_ORIGIN` menentukan satu-satunya origin yang diizinkan CORS bucket. Setelah mengubahnya,
jalankan ulang `docker compose up -d rustfs-init`.

Pekerjaan berkala (pengingat laporan 15.45 WIB, alat terlambat, pembekuan laporan, penyapu media)
dijadwalkan lewat crontab: lihat **`docs/operasional-cron.md`**.

## Struktur

| Lokasi | Isi |
|---|---|
| `apps/admin` | aplikasi Next.js: halaman, layout, route, aksi server, logika domain di `lib/` |
| `apps/admin/scripts` | skrip berkala (`push:reminder`, `push:overdue`, `report:freeze`, `media:sweep`) |
| `packages/ui` | `@workspace/ui`: **semua** komponen dan token tema |
| `packages/db` | skema Drizzle dan migrasi |
| `packages/auth` | Better Auth, peran, izin, seed |
| `scripts` | `cron-run.sh` (pembungkus cron) dan `verify-access.sh` (verifikasi otorisasi lewat URL) |

## Dokumen lain

- `docs/operasional-cron.md` — pekerjaan terjadwal di VPS
- `AKUN-UJI.md` — akun uji dan cara memverifikasi akses
- `CLAUDE.md` / `AGENTS.md` — aturan kerja di repo ini (shadcn, peletakan komponen, versioning)
- `docs/superpowers/specs`, `docs/superpowers/plans` — spesifikasi dan rencana per modul
