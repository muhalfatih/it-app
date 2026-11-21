# Rencana Modul 9 — PWA & Notifikasi Push

Status: **disetujui untuk dieksekusi di sesi baru** (20 Nov 2026). Belum ada kode yang ditulis.
Acuan: spesifikasi §10.1–§10.2, PRD (Web Push VAPID + cron 15.45 WIB), dan panduan Next **16.4.5**
yang terpasang di `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`.

Keputusan pengguna:
- Eksekusi di sesi baru.
- **Kanban: hanya Manajer.** Transisi `draft → review` memberi tahu Manajer saja.
  Baris §10.2 "Kartu menunggu persetujuan → Direktur" **dilewati** sampai pemicunya ditentukan;
  catat ini sebagai pekerjaan terbuka, jangan diam-diam diabaikan.

Rekomendasi model/effort: **Opus, effort medium** (pola kode sudah mapan, tapi sebarannya lintas
8 file mutasi + DB + service worker + UI, dan salah tempat `notify` tidak tertangkap typecheck).
Bila dipecah: bagian A + B1–B7 cukup Sonnet/medium; B8–B10 (pemicu, cron, tes) Opus/medium.

---

## A. PWA

| Berkas | Isi |
|---|---|
| `apps/admin/app/manifest.ts` | `name` "Unit IT & Media", `short_name` "IT & Media", `start_url: "/"`, `display: "standalone"`, `theme_color`/`background_color` disalin dari token `--primary`/`--background` di `packages/ui/src/styles/globals.css` (manifest tidak bisa membaca CSS — beri komentar satu baris yang menyebut asalnya) |
| `apps/admin/app/icon.tsx` | ikon PNG lewat `ImageResponse` dari `next/og` (sudah ikut Next, **tanpa dependensi baru**) |
| `apps/admin/app/apple-icon.tsx` | idem; Next menyuntik `<link rel="apple-touch-icon">` sendiri — wajib agar ikon iOS tidak jadi tangkapan layar |
| `apps/admin/public/icon.svg` | ikon manifest Android: entri `sizes: "any"` + satu entri `purpose: "maskable"` |
| `apps/admin/next.config.ts` | header untuk berkas service worker: `Cache-Control: no-cache, no-store, must-revalidate` dan `Content-Security-Policy: default-src 'self'; script-src 'self'` |

Asumsi: belum ada aset logo di repo, jadi ikon sementara memakai inisial + warna brand.
Menggantinya nanti cukup menimpa berkas ikon, tanpa perubahan kode.

## B. Notifikasi push

1. **Skema DB** — `packages/db/src/schema/push.ts`:
   tabel `push_subscription` (`endpoint` text primary key, `user_id` text FK `user` `onDelete: "cascade"`,
   `p256dh`, `auth`, `created_at` timestamptz default now), index pada `user_id`.
   Tambahkan `export * from "./push"` di `packages/db/src/schema/index.ts`, lalu
   `pnpm --filter @workspace/db db:generate` → migrasi `0008_*.sql`, dan `db:migrate`.
2. **Dependensi** — `web-push` + `@types/web-push` di `apps/admin` (satu-satunya tambahan).
3. **`apps/admin/lib/push/send.ts`** — `notify(userIds, { title, body, url })`:
   ambil langganan penerima, kirim paralel, **hapus baris saat 404/410**, kegagalan lain hanya dicatat
   (`console.error`) dan tidak boleh menggagalkan aksi pengguna. Satu pintu untuk semua pemanggil.
4. **`apps/admin/lib/push/recipients.ts`** — penerima per peran (`manajer`, `direktur`) dari `user_role`,
   buang akun nonaktif (`disabledAt`), dedupe, dan buang aktor sendiri.
5. **`apps/admin/lib/push/actions.ts`** — server action `subscribe` / `unsubscribe` dengan `requireUser()`.
6. **`apps/admin/lib/service-worker.js`** — handler `push` (`showNotification`) dan `notificationclick`
   (`clients.openWindow(data.url)`). Didaftarkan dari klien dengan
   `navigator.serviceWorker.register(new URL("../lib/service-worker.js", import.meta.url), { scope: "/", updateViaCache: "none" })`
   sesuai panduan Next 16.4.5 — jangan taruh SW di `public/`.
7. **UI** — hanya komponen yang sudah ada di galeri (`card`, `switch`, `button`, `alert`, `badge`);
   tidak ada komponen baru, jadi tidak perlu persetujuan instalasi:
   - `packages/ui/src/components/domain/push-toggle.tsx` (client; props `publicKey`, `onSubscribe`, `onUnsubscribe`)
   - `apps/admin/app/(app)/notifikasi/page.tsx` — status izin browser, tombol aktifkan/matikan,
     instruksi pasang Android & iOS (§10.1: iOS ≥ 16.4 dan wajib "Tambahkan ke Layar Utama"),
     daftar §10.2 + catatan bahwa Pengaduan Internet tidak memicu notifikasi
   - `apps/admin/lib/menu.tsx`: jadikan `permission` pada `SubItem` opsional (`permission?: Permission`,
     `undefined` = semua peran) agar menu "Notifikasi" tampil juga untuk Staf Unit Lain.
8. **Pemicu** — `notify(...)` dipanggil **setelah transaksi commit**, bukan di dalamnya:

   | §10.2 | Titik kode | Penerima |
   |---|---|---|
   | Penugasan Planner baru/berubah | `lib/planner/mutations.ts` `createEntry`, `updateEntry` | assignee baru/berubah |
   | Tugas Manajer baru/berubah | `lib/manager-task/mutations.ts` `createManagerTask`, `updateManagerTask` | assignee |
   | Laporan perlu diisi ulang | `lib/report/mutations.ts` `unlockReport` | staf pemilik laporan |
   | Kartu masuk Review | `lib/kanban/mutations.ts` `moveCard` (`draft → review`) | **Manajer saja** |
   | Kartu dikembalikan untuk revisi | `moveCard` arah `back` | assignee entri kartu |
   | Pengajuan SDM baru | `lib/layanan/mutations.ts` `createRequest` | Manajer |
   | Status SDM berubah | `rejectRequest`, `approveWithTasks`, `cancelApprovedRequest`, dan `planner.createEntry` dengan `approval` | pengaju |
   | Pengingat laporan 15.45 WIB | skrip baru `apps/admin/scripts/push-reminder.ts` (`push:reminder`) | staf yang `daily_report.submitted_at` masih null hari itu, hari kerja saja (pakai `isWorkday`/`allHolidays` yang sudah ada) |
   | Alat belum dikembalikan melewati jadwal | skrip baru `apps/admin/scripts/push-overdue.ts` (`push:overdue`) | `loan.recordedBy` untuk `due_at < now` dan `returned_at is null` |

   Dua skrip cron mengikuti pola `report:freeze` / `media:sweep` yang sudah berjalan
   (`tsx --env-file=../../.env scripts/...`), bukan infrastruktur baru.
9. **Env** — tambah ke `env.example`: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `VAPID_SUBJECT` (mis. `mailto:...`), dengan komentar cara membuatnya
   (`pnpm dlx web-push generate-vapid-keys`).
10. **Tes** — `lib/push/recipients.test.ts` (dedupe, aktor dibuang, akun nonaktif dibuang) dan
    `lib/push/send.test.ts` (langganan dihapus pada 410; satu endpoint gagal tidak menghentikan sisanya).

## Catatan pengerjaan

- Jalankan di WSL dengan Node dari nvm (`. ~/.nvm/nvm.sh`), perintah dari root repo.
- Uji push lokal butuh HTTPS: `next dev --experimental-https`.
- Setelah selesai: `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- Pekerjaan terbuka: notifikasi "Kartu menunggu persetujuan → Direktur" (§10.2) belum dipasang.
