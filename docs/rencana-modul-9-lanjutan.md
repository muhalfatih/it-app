# Rencana Modul 9 — Lanjutan (per sesi)

Status (21 Nov 2026): Sesi 3 selesai kecuali sisa uji browser #6a yang butuh langkah pengguna. Lanjutan dari `docs/rencana-modul-9-pwa-push.md`
yang sudah dieksekusi (belum di-commit, masih di branch `feat/laporan-rekap`). Tanpa subagent.

Nomor item mengikuti daftar sisa pekerjaan di sesi eksekusi.

## Keputusan pengguna yang masih dibutuhkan

| # | Pertanyaan | Dibutuhkan sebelum |
|---|---|---|
| ~~9~~ | ✅ Diputuskan 20 Nov 2026: `REPORT_START_DATE` tetap `2026-11-01`; `report.db.test.ts` mematok tanggal akun uji ke 1 Des agar tidak bergantung jam asli. | — |
| 1 | Pemicu "Kartu menunggu persetujuan → Direktur"? | Kapan saja; sesi tersendiri |
| 4 | Aplikasi produksi berjalan di mana (Docker Compose, VPS + crontab, …)? | Penjadwalan cron |
| 11 | `push:overdue`: sekali per peminjaman (kolom + migrasi) atau cukup sekali sehari? | Kapan saja |
| 14 | Logo tersedia? | Kapan saja |

Langkah pengguna sendiri: buat kunci VAPID (`pnpm dlx web-push generate-vapid-keys`) dan isi `.env`
(#3); uji di HP Android/iOS (#6b).

---

## Sesi 1 — Sonnet · medium (sesi baru)

Konteks: berkas push ada di `apps/admin/lib/push/`, `apps/admin/lib/service-worker.js`,
`apps/admin/app/(app)/notifikasi/`, `packages/ui/src/components/domain/push-toggle.tsx`.

1. **#2** Tambah `PushToggle` (`@workspace/ui/components/domain/push-toggle`) ke `/galeri`
   dengan `register`/`onSubscribe`/`onUnsubscribe` tiruan (tanpa SW sungguhan).
2. **#10** `packages/auth/src/accounts.db.test.ts`: impor db secara malas di dalam
   `describe.skipIf(!TEST_DB)` seperti pola `apps/admin/lib/*/*.db.test.ts`, agar `pnpm test`
   dari root tidak berhenti di `@workspace/auth`.
3. **#12** Saat keluar (`lib/auth-actions.ts` `signOutAction` + tombol keluar di sidebar):
   hapus baris `push_subscription` perangkat ini dan `subscription.unsubscribe()` di browser.
4. **#5** Commit ke branch baru `feat/pwa-push` (jelaskan kondisi git + dampak dulu, tunggu
   konfirmasi; `apps/admin/lib/report/rules.ts` milik pengguna tidak ikut kecuali diminta).

Verifikasi: `pnpm lint`, `pnpm typecheck`, tes admin.

## Sesi 2 — Opus · medium (sesi baru) ✅ selesai 21 Nov 2026

Hasil: commit `c2b199b` di `feat/pwa-push` (belum di-push). `notify()` memakai `after()` di dalam
request dan kirim langsung di luar request (dibuktikan `send.test.ts`); tes audiens push ditambahkan
di `planner`, `manager-task`, `report`, `kanban`, `layanan` `*.db.test.ts`. Verifikasi: lint,
typecheck, dan tes admin terhadap `itapp_test` hijau (30 file, 342 tes).

Prasyarat: keputusan #9 sudah ada, tes DB hijau.

1. **#13** Aksi pengguna tidak menunggu push: pertimbangkan `after()` dari `next/server`
   (baca `node_modules/next/dist/docs` dulu) dengan fallback untuk skrip/tes yang berjalan
   di luar request; tetap satu pintu di `lib/push/send.ts`.
2. **#7** Tes DB penerima per pemicu §10.2 (planner create/update, tugas manajer, unlock laporan,
   kanban draft→review & kembali, layanan create/reject/approve/cancel termasuk jalur hapus entri
   dan hapus tugas terakhir): mock `notify` lewat `vi.mock("@/lib/push/send")`, periksa audiens.

Verifikasi: `pnpm lint`, `pnpm typecheck`, tes admin dengan `DATABASE_URL=.../itapp_test`.

## Sesi 3 — Opus · high (sesi baru) ✅ 21 Nov 2026 (kecuali sisa #6a)

1. **#8** Review seluruh branch terhadap `main` (spesifikasi §10.1–§10.2, dua dokumen rencana ini):
   kebenaran penerima, transaksi vs notify, keamanan aksi subscribe, service worker, a11y halaman
   `/notifikasi`. Satu putaran perbaikan untuk temuan Critical/Important, masing-masing dengan tes.
2. **#6a** Uji browser: `next dev --experimental-https`, daftar SW (scope `/`), manifest &
   installability di DevTools, kirim notifikasi uji.

### Hasil review (#8)

**Critical — diperbaiki.** `lib/push/send.ts` memakai `import webpush from "web-push"`, tetapi
web-push 4 adalah ESM tanpa default export. Akibatnya dua hal, keduanya terbukti:
- `pnpm push:reminder` / `push:overdue` mati di impor
  (`SyntaxError: ... does not provide an export named 'default'`) — kedua skrip cron belum pernah
  benar-benar dijalankan sebelumnya;
- Turbopack menolak modulnya, jadi setiap halaman/aksi yang mengimpor `send.ts` gagal kompilasi
  (jejak impor di `.next/dev/logs/next-development.log`: `app/(app)/layanan/sdm/[id]/actions.ts`
  → `lib/layanan/mutations.ts` → `lib/push/send.ts`). Push praktis mati di dev.

Perbaikan: impor bernama (`sendNotification`, `setVapidDetails`; keduanya aman dipanggil lepas —
`sendNotification` sudah `bind`, `setVapidDetails` memakai variabel modul), ditambah tes penjaga di
`lib/push/send.test.ts` yang menolak bentuk default import (bundler Vite/Next menambalnya, jadi
hanya pemeriksaan sumber yang bisa menangkap regresi ini). Kedua skrip cron lalu dijalankan
terhadap `itapp_test`: berjalan sampai selesai.

Selain itu satu komentar `lib/menu.tsx` kehilangan kata (`Tanpa  =` → ``Tanpa `permission` =``).

**Temuan lain.** (a) dan (c) ikut diperbaiki 21 Nov 2026 atas permintaan pengguna; (b), (d), (e) dibiarkan.

| # | Temuan | Catatan |
|---|---|---|
| a | Keluar lewat `/ganti-kata-sandi` memakai `signOutAction` biasa, jadi baris `push_subscription` dan langganan browser tidak dilepas: notifikasi akun itu masih sampai ke perangkat tersebut | ✅ Diperbaiki: `app/ganti-kata-sandi/_sign-out.tsx` (client) memakai `signOutWithPush`, sama seperti sidebar. Konsekuensinya tombol keluar di halaman itu kini butuh JS (sebelumnya form POST) |
| b | `subscribe` memakai `onConflictDoUpdate` pada `endpoint`: pengguna login yang mengetahui endpoint perangkat orang lain bisa memindahkannya ke akunnya sendiri | Sengaja (perangkat berganti akun). Endpoint tidak pernah ditampilkan aplikasi, jadi tidak terjangkau tanpa kebocoran dari luar |
| c | `notificationclick` selalu `clients.openWindow`, jadi membuka jendela/tab baru walau aplikasi sudah terbuka | ✅ Diperbaiki: `openOrFocus()` di `lib/service-worker.js` memakai `clients.matchAll` + `focus()` lalu `navigate()`, dan jatuh kembali ke `openWindow` bila klien belum dikendalikan SW |
| d | `push:overdue` mengirim satu notifikasi per peminjaman | Keputusan #11 masih terbuka |
| e | Header service worker di `next.config.ts` (rencana bagian A) tidak dipasang | Tidak diperlukan: SW di-bundle lewat `new URL(..., import.meta.url)` (bukan `public/sw.js`), didaftarkan `updateViaCache: "none"`, dan Next sendiri mengirim `Service-Worker-Allowed` |

**Diperiksa dan sesuai.** Penerima tiap pemicu §10.2 (baris Direktur memang masih terbuka, #1);
semua `notify` dipanggil setelah commit, tidak ada yang di dalam transaksi; `updateEntry` hanya
memberi tahu baris penugasan yang baru atau berubah; `push-reminder` memakai aturan yang sama
dengan `assertWritable` (hari kerja, `firstReportDay`, absen selain "hadir" dilewati).

### Uji browser (#6a) — bagian otomatis selesai

Dari server dev yang berjalan (http://localhost:3000; `--experimental-https` tidak diperlukan untuk
uji desktop karena `localhost` sudah dianggap secure context):
- `/manifest.webmanifest` → 200, `name`/`short_name`/`start_url`/`display: standalone` benar,
  `theme_color` `#16505e` dan `background_color` `#fcfefe` ikut token brand;
- `/icon` → 200 `image/png` 512, `/apple-icon` → 200 `image/png` 180, `/icon.svg` → 200;
  ketiganya bisa diambil **tanpa login**, syarat agar prompt pasang Android bisa memuat ikon;
- `<head>` memuat `<link rel="manifest">`, `<link rel="icon" sizes="512x512">`, dan
  `<link rel="apple-touch-icon" sizes="180x180">`;
- `/notifikasi` kompilasi bersih setelah perbaikan Critical di atas.

**Sisa #6a (butuh pengguna):** masuk dengan akun uji di browser lalu (1) pastikan service worker
terdaftar dengan scope `/` di DevTools → Application → Service workers, (2) periksa Manifest &
installability di panel yang sama, (3) isi kunci VAPID di `.env` (#3) dan kirim satu notifikasi uji.
Tanpa kunci VAPID, `PushToggle` sengaja menampilkan "Notifikasi belum disiapkan di server".

Perbaikan (a) dan (c) belum pernah dijalankan di browser: keduanya ikut diuji di langkah ini
(klik notifikasi uji harus memakai jendela yang sudah terbuka, dan tombol keluar di
`/ganti-kata-sandi` harus menghapus baris `push_subscription` perangkat itu).

## Setelah keputusan masuk — Sonnet · medium (sesi mana saja)

#1 notifikasi Direktur, #4 penjadwalan cron, #11 overdue sekali per peminjaman,
#14 ganti ikon (Haiku · low, cukup menimpa `lib/brand.tsx`/`public/icon.svg`).
