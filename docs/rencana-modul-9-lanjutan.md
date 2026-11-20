# Rencana Modul 9 — Lanjutan (per sesi)

Status: menunggu pilihan pengguna (20 Nov 2026). Lanjutan dari `docs/rencana-modul-9-pwa-push.md`
yang sudah dieksekusi (belum di-commit, masih di branch `feat/laporan-rekap`). Tanpa subagent.

Nomor item mengikuti daftar sisa pekerjaan di sesi eksekusi.

## Keputusan pengguna yang masih dibutuhkan

| # | Pertanyaan | Dibutuhkan sebelum |
|---|---|---|
| 9 | `REPORT_START_DATE` = `2026-11-01` disengaja (ubah tes) atau dikembalikan ke `2026-12-01`? | Sesi 2 (tes DB harus hijau) |
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

## Sesi 2 — Opus · medium (sesi baru)

Prasyarat: keputusan #9 sudah ada, tes DB hijau.

1. **#13** Aksi pengguna tidak menunggu push: pertimbangkan `after()` dari `next/server`
   (baca `node_modules/next/dist/docs` dulu) dengan fallback untuk skrip/tes yang berjalan
   di luar request; tetap satu pintu di `lib/push/send.ts`.
2. **#7** Tes DB penerima per pemicu §10.2 (planner create/update, tugas manajer, unlock laporan,
   kanban draft→review & kembali, layanan create/reject/approve/cancel termasuk jalur hapus entri
   dan hapus tugas terakhir): mock `notify` lewat `vi.mock("@/lib/push/send")`, periksa audiens.

Verifikasi: `pnpm lint`, `pnpm typecheck`, tes admin dengan `DATABASE_URL=.../itapp_test`.

## Sesi 3 — Opus · high (sesi baru)

1. **#8** Review seluruh branch terhadap `main` (spesifikasi §10.1–§10.2, dua dokumen rencana ini):
   kebenaran penerima, transaksi vs notify, keamanan aksi subscribe, service worker, a11y halaman
   `/notifikasi`. Satu putaran perbaikan untuk temuan Critical/Important, masing-masing dengan tes.
2. **#6a** Uji browser: `next dev --experimental-https`, daftar SW (scope `/`), manifest &
   installability di DevTools, kirim notifikasi uji.

## Setelah keputusan masuk — Sonnet · medium (sesi mana saja)

#1 notifikasi Direktur, #4 penjadwalan cron, #11 overdue sekali per peminjaman,
#14 ganti ikon (Haiku · low, cukup menimpa `lib/brand.tsx`/`public/icon.svg`).
