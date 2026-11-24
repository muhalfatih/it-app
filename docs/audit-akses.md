# Audit hak akses per peran (PRD §10, matriks §3.3)

Audit dijalankan 23 Nov 2026 pada commit `4ac6838` (branch `main`).
Acuan: matriks akses `resources/spesifikasi-aplikasi-unit-it-media-tahap-1.md` §3.3
dan kriteria penerimaan PRD §10 "Otorisasi diuji per peran terhadap matriks akses §3.3
(termasuk akses langsung lewat URL/API)".

Bagian 1 sampai 4 adalah hasil audit dan sudah final. Bagian 5 adalah catatan pekerjaan
perbaikan; 5.1 dan 5.2 sudah dikerjakan dan diverifikasi.

## 1. Matriks §3.3 lawan ROLE_PERMISSIONS

`packages/auth/src/permissions.ts` cocok dengan matriks §3.3 untuk keempat peran dan untuk
akun tanpa peran (Staf Unit Lain hanya `layanan.ajukan`). Pemetaan ini sudah terkunci tes di
`packages/auth/src/permissions.test.ts`, yang memuat matriks baris per baris dan memeriksa
bahwa daftar MATRIX mencakup setiap izin tepat sekali, jadi izin baru tidak bisa ditambahkan
tanpa menyentuh tes.

Empat izin Manajer berada di luar bacaan literal matriks, semuanya disengaja:

| Izin | Alasan |
|---|---|
| `kanban.ide_ke_draft` | Usul PRD §9 butir 3: kartu tertahan bila SDM Strategi kosong atau berhalangan |
| `kanban.batal_tayang` | Usul PRD §9 butir 4: salah centang atau link keliru harus bisa dikoreksi |
| `planner.hapus_terkunci` | Hapus entri pada tahap Review ke atas (§4.5, konfirmasi dua langkah) |
| `laporan.buka_kunci` | Buka kunci laporan yang sudah terkunci pukul 10.00 (§5) |

Dua yang pertama masih berstatus usul di PRD dan belum dikonfirmasi Manajer. Kalau nanti
ditolak, cukup hapus dari `ROLE_PERMISSIONS` dan sesuaikan MATRIX di tes.

## 2. Inventaris penjaga

38 `page.tsx`, 20 file aksi server, 3 `route.ts`. Tidak ditemukan halaman, aksi, atau route
tanpa penjaga.

Halaman:

- 36 halaman memakai `requirePermission` dengan izin yang cocok matriks.
- `/laporan/rekap` dan `/absensi/rekap` memakai `requireUser`, lalu memeriksa
  `*.rekap.semua` dan `*.rekap.sendiri` di dalam body dan menolak akun yang tidak punya
  keduanya. Ini benar, karena satu halaman melayani dua baris matriks yang berbeda
  (Semua untuk Direktur dan Manajer, Diri sendiri untuk SDM).
- `/layanan/page.tsx` hanya `redirect("/layanan/sdm")`.
- `/galeri` memakai `requireUser` lalu menolak akun tanpa peran, karena matriks §3.3 tidak
  memuat barisnya dan Staf Unit Lain hanya boleh membuka menu Layanan (§3.1). Pemeriksaannya
  inline seperti di halaman rekap, bukan izin tersendiri, sebab tidak ada izin yang berarti
  "anggota unit" di `PERMISSIONS`.
- `masuk/page.tsx` dan `layout.tsx` teratas memang tanpa penjaga. `(app)/layout.tsx`
  memanggil `requireUser()`.

Akses data orang lain lewat ID di URL:

| Jalur | Penyempitan |
|---|---|
| `/laporan/rekap/[userId]`, `/absensi/rekap/[userId]`, `/laporan/tim/[userId]` | `laporan.rekap.semua` / `absensi.rekap.semua` |
| `/layanan/sdm/[id]` | `getRequestFor` mengembalikan null bila bukan pemilik dan tanpa `layanan.setujui_sdm` (`lib/layanan/queries.ts:115`) |
| `/api/layanan/rundown/[id]` | `getRequestFor` yang sama |
| `/api/media/[id]` | `kanban.lihat`; 401 tanpa sesi, 403 tanpa izin, 404 bila media tidak ada |
| `/konten/[id]`, `/planner/[id]`, `/tugas/[id]`, `/inventaris/peminjaman/[id]` | `requirePermission` sesuai matriks |

Aksi server:

- Semua memakai `withPermission`, yang menolak dengan `{ error: "Tidak diizinkan" }` sebelum
  fungsi dijalankan (`packages/auth/src/authorize.ts`).
- Aksi laporan selalu memakai id dari sesi, bukan dari klien. `renameSelfTask` dan
  `deleteSelfTask` lewat `ownSelfTask(userId, id)`.
- `saveAttendance(userId, ...)` dan `unlock(userId, ...)` menerima userId dari klien, tapi
  keduanya terbatas pada izin Manajer (`absensi.isi`, `laporan.buka_kunci`), dan memang
  tugas Manajer mengisi absensi serta membuka kunci laporan orang lain.
- `konten/actions.ts` memakai gerbang longgar `kanban.lihat`, tapi setiap mutasi di
  belakangnya punya pemeriksaannya sendiri terhadap tahap di database: `allowedMoves`,
  `canEditContent`, `canCheck`, `canUncheck` di `lib/kanban/rules.ts`. Tabel FLOW di situ
  memetakan satu-satu ke `kanban.ide_ke_draft`, `kanban.draft_ke_review`,
  `kanban.review_ke_disetujui`. Semua mutasi media lewat `lockEditable`, yang menuntut
  `kanban.isi`, jadi Direktur tidak bisa mengisi kartu.
- Dua file aksi berada di luar `apps/admin/app` dan mudah terlewat saat menyapu direktori
  `app/`: `apps/admin/lib/auth-actions.ts` (hanya `signOutAction`) dan
  `apps/admin/lib/push/actions.ts` (`requireUser` plus penyempitan `userId` sesi).

`apps/admin/proxy.ts` bukan gerbang keamanan. Ia hanya meneruskan path asal lewat header agar
`/masuk` bisa kembali ke halaman itu, dan header tersebut selalu ditimpa sehingga nilai
kiriman klien tidak terpakai. Sesi tetap diperiksa di setiap halaman dan aksi.

## 3. Temuan

Tidak ada temuan Critical atau Important di kode aplikasi.

| Tingkat | Temuan | Status |
|---|---|---|
| Important | `scripts/verify-access.sh` tidak bisa lagi membuat sesi. Skrip login lewat `POST /api/auth/sign-in/username`, dan sejak PR #16 jalur itu ada di `ssoOnly.disabledPaths` (`packages/auth/src/sso.ts:45`), jadi hanya blok "tanpa sesi" yang masih jalan. Akibatnya kriteria PRD §10 belum bisa dibuktikan ulang. | Selesai (5.1) |
| Low | `/galeri` terbuka untuk Staf Unit Lain | Ditutup 24 Nov 2026; diuji di `verify-access.sh` |
| Low | Tidak ada tes yang mengunci pemetaan halaman ke izin, jadi halaman baru tanpa penjaga tidak akan tertangkap | Selesai (5.2) |

## 4. Cakupan `verify-access.sh` sekarang

Skrip membuat sesi uji langsung di database dan menandatangani cookie dengan
`BETTER_AUTH_SECRET` (lihat komentar di kepala skrip). Hasil terakhir: 107 PASS, 0 FAIL.

Yang diuji: seluruh blok tanpa sesi (19 path harus 307 ke `/masuk`, `/api/media/1` harus 401),
penutupan `POST /api/auth/sign-in/username` (404), akses langsung per path untuk kelima peran
(SDM Khusus, SDM Strategi, Staf Unit Lain, Direktur, Manajer), penutupan
`POST /api/auth/update-user`, dan penolakan sesi milik akun yang dinonaktifkan. Tiap peran
didahului precheck `GET /` harus 200.

Batas: blok "pengajuan milik orang lain" dilewati bila tabel `service_request` kosong, dan
cookie tanpa awalan `__Secure-` hanya cocok untuk http.

`apps/admin/lib/app-guards.test.ts` memindai `apps/admin/app` dan `apps/admin/lib`: setiap
`page.tsx` harus memanggil `requirePermission`/`requireUser`, dan setiap ekspor file
`"use server"` harus dibungkus `withPermission`/`action`. Pengecualian eksplisit ada di
kepala tes. Pemindai hanya memeriksa keberadaan penjaga, bukan kecocokan izinnya dengan matriks.

## 5. Sisa pekerjaan

Rencana sudah disetujui pengguna pada 23 Nov 2026. Rekomendasi model Sonnet 5.5 effort medium:
keputusan sulitnya sudah selesai, sisanya penulisan skrip bash, dokumen, dan satu tes
pemindai statis.

### 5.1 Perbaiki `scripts/verify-access.sh` dengan sesi uji buatan (selesai)

Keputusan: buat baris sesi langsung di database untuk akun per peran, lalu tandatangani
cookie seperti better-auth. Hanya untuk uji, jalur login produksi tidak diubah.

Fakta yang sudah diverifikasi dari `node_modules`, bukan tebakan:

- Nilai cookie sesi: `<token>.<tanda_tangan>`, dengan tanda tangan
  `base64(HMAC-SHA256(token, secret))` memakai base64 standar berpadding.
  Sumber: `signCookieValue` di
  `node_modules/.pnpm/better-call@1.4.5_zod@4.6.7/node_modules/better-call/dist/crypto.mjs`.
- Pemverifikasi memotong di titik terakhir, lalu menolak tanda tangan yang panjangnya bukan
  44 karakter atau tidak diakhiri `=`. Sumber: `getSignedCookie` di `dist/context.mjs:43-48`
  paket yang sama. Keluaran `openssl dgst -sha256 -hmac "$secret" -binary | openssl base64 -A`
  pas dengan syarat itu.
- Nama cookie: `better-auth.session_token`. Awalan `__Secure-` hanya dipakai bila protokolnya
  https, jadi di `http://localhost:3000` tanpa awalan. Sumber:
  `node_modules/.pnpm/better-auth@1.7.25_*/node_modules/better-auth/dist/cookies/index.mjs:23,28,49`.
- `secret` adalah `BETTER_AUTH_SECRET` apa adanya, karena `betterAuth()` di
  `packages/auth/src/server.ts` tidak mengoper `secret` sendiri. Sumber:
  `dist/context/create-context.mjs:71`.
- `session.cookieCache` tidak diaktifkan di `server.ts`, jadi sesi selalu dibaca dari tabel
  `session`. Artinya cukup menyisipkan baris sesi, tanpa perlu memalsukan cookie `session_data`.
- Base64 standar memakai `A-Za-z0-9+/=`, semuanya aman di header `Cookie` dan tidak berubah
  saat `decodeURIComponent`, jadi percent-encoding seperti `signCookieValue` boleh dilewati.
  Kalau ternyata ditolak, tiru persis `signCookieValue` dengan meng-encode seluruh nilai.

Kolom yang perlu diisi:

- `session`: `id`, `token` (unik), `expires_at`, `created_at`, `updated_at`, `user_id`.
  Semua `notNull`. Lihat `packages/db/src/schema/auth.ts:38`.
- `user`: `id` (text, primary key), `name`, `email` (notNull unik), `username` (unik).
  `unit_id` dan `bidang` boleh null. Lihat `packages/db/src/schema/auth.ts:14`.
- `user_role`: `user_id` + `role`, primary key gabungan, tanpa constraint "hanya satu
  Manajer" di level database. Aturan satu Manajer ada di `packages/auth/src/accounts.ts`.

Kondisi database `itapp` saat audit: hanya satu akun, `muhalfatih` dengan peran `manajer`.
Tidak ada akun untuk empat peran lain, jadi skrip harus membuat akun uji sendiri.

Yang perlu dikerjakan:

1. Ganti blok login dengan fungsi yang membuat akun uji plus baris sesi lewat
   `docker compose exec -T db psql`, menandatangani cookie dengan openssl, dan mengembalikan
   string cookie. Helper `status()` yang ada tidak perlu diubah, karena `curl -b` menerima
   string `nama=nilai`, bukan hanya nama file.
2. Peran Manajer memakai akun manajer yang sudah ada, supaya tidak ada dua Manajer sekaligus.
   Empat peran lain memakai akun uji berawalan `uji-akses-`, dihapus di `trap EXIT`; hapus
   baris `user` saja sudah cukup karena sesi dan peran ikut terhapus lewat cascade.
3. Hapus variabel `VERIFY_*_USERNAME` dan `VERIFY_*_PASSWORD`. Yang dibaca hanya
   `BETTER_AUTH_SECRET` dari `.env` di root repo.
4. Perluas ke kelima peran, termasuk SDM Strategi yang sekarang belum diuji. Izin per peran
   diambil dari matriks §3.3; untuk SDM Strategi berarti `/planner/baru` boleh 200,
   sedangkan `/absensi`, `/tugas`, `/inventaris`, dan `/setting/*` harus ditolak.
5. Tambahkan precheck per peran: `GET /` harus 200. Kalau tanda tangan cookie salah,
   kegagalannya langsung terbaca sebagai satu pesan jelas, bukan deretan FAIL.
6. Tambahkan assertion `POST /api/auth/sign-in/username` harus 404, yang mengunci penutupan
   jalur login dari PR #16.

Risiko yang perlu diketahui: skrip menulis baris `user` dan `session` ke database `itapp`
yang dipakai dev server. Kalau skrip mati paksa sebelum `trap EXIT` jalan, akun berawalan
`uji-akses-` bisa tertinggal dan perlu dihapus manual.

### 5.2 Tes pemindai penjaga (selesai)

Tambahkan satu tes yang memindai `apps/admin/app` dan memastikan setiap `page.tsx` serta
setiap aksi server punya penjaga, dengan daftar pengecualian eksplisit untuk
`masuk/page.tsx`, `layout.tsx` teratas, dan `(app)/layanan/page.tsx` yang hanya redirect.
Ini yang mencegah audit ini basi ketika halaman baru ditambahkan.

Catatan teknis:

- `apps/admin/vitest.config.ts` memakai `include: ["lib/**/*.test.ts"]`, jadi file tes harus
  berada di `apps/admin/lib/`, misalnya `apps/admin/lib/app-guards.test.ts`. File di
  `apps/admin/app/` tidak akan dijalankan.
- Pola tes otorisasi yang sudah ada dan bisa dicontoh:
  `apps/admin/lib/inventaris/actions-auth.test.ts`, yang me-mock `@workspace/auth/session`
  dan menguji penolakan aksi per peran tanpa database.

### 5.3 Verifikasi

```sh
pnpm lint
pnpm typecheck
```

Vitest dijalankan langsung per paket, karena `pnpm test` dari root melewati tes yang butuh
database:

```sh
cd apps/admin && DATABASE_URL=postgres://itapp:itapp@127.0.0.1:5432/itapp_test pnpm vitest run
cd packages/auth && DATABASE_URL=postgres://itapp:itapp@127.0.0.1:5432/itapp_test pnpm vitest run
```

Lalu skrip verifikasi untuk kelima peran:

```sh
BASE_URL=http://localhost:3000 scripts/verify-access.sh
```

Semua perintah dijalankan di dalam WSL dengan Node dari nvm (`. ~/.nvm/nvm.sh` lebih dulu).

Catatan lingkungan: `docker-compose.yml` sengaja diubah untuk membuka port 5432 agar vitest
bisa menyentuh database uji. Perubahan itu jangan ikut di-commit.
