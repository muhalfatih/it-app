# Kanban Konten (Putaran 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Papan Kanban `/konten` dan halaman kartu `/konten/[id]`: alur Ide → Draft → Review → Disetujui → Telah Tayang dengan wewenang per perpindahan, pengembalian bercatatan, caption terkunci sejak Review, centang Tayang per kanal, riwayat, komentar, serta sinkron dari perubahan entri Planner.

**Architecture:** Aturan murni di `apps/admin/lib/kanban/rules.ts` (dipakai papan, halaman detail, dan server). Mutasi transaksional di `lib/kanban/mutations.ts` dipanggil aksi server tipis `app/(app)/konten/actions.ts`. Query di `lib/kanban/queries.ts`. Papan merakit `@reui/kanban` (mode `onMove`) + domain `ContentCard`. Pola sama dengan modul Planner.

**Tech Stack:** Next.js 16 (App Router, `params`/`searchParams` Promise), Drizzle + PostgreSQL, `@workspace/auth` (izin), zod 4, vitest 4.1.12, `@workspace/ui` (reui kanban, timeline, badge, frame; shadcn dialog, textarea, checkbox, alert, sonner).

**Spec:** `docs/superpowers/specs/2026-11-17-kanban-konten-design.md`

## Global Constraints

- Semua perintah di WSL setelah `. ~/.nvm/nvm.sh`, dari root repo. Jangan pnpm dari Windows terhadap `\\wsl.localhost`.
- Baca panduan Next di `apps/admin/node_modules/next/dist/docs/` sebelum menulis halaman/aksi (AGENTS.md).
- Komponen hanya di `packages/ui`; `apps/admin` hanya halaman dan file perakitan `_*.tsx` di folder route. Komponen baru hanya lewat `pnpm dlx shadcn@latest add … -c packages/ui` dengan `--dry-run` dulu.
- Warna hanya token `globals.css`.
- Sebelum Task 6: skill `frontend-design:frontend-design`. Setelah Task 7: `anthropic-skills:web-design-guidelines`, MCP reui `get_agent_skill`, `get_component` (kanban, timeline), `validate_usage`, `get_audit_checklist`.
- Tahap: `CONTENT_STAGES = ["ide","draft","review","disetujui","tayang"]` dari `@workspace/db/schema/stages`. Label dari `CONTENT_STAGE_LABEL` (domain content-card).
- Catatan revisi/alasan batal centang: wajib, di-trim, 1–2000 karakter. Komentar: 1–2000 karakter. Caption: maks 5000 karakter (*keputusan pembangun*).
- Link Tayang: hanya `http:`/`https:`; wajib untuk kanal `requiresLink`, opsional untuk lainnya.
- Telah Tayang di papan: `stage_changed_at` ≥ sekarang − 30 hari, kecuali `?tayang=semua`.
- Waktu tampil dalam WIB (`Asia/Jakarta`), format "12 Nov 14.20".
- Teks UI berbahasa Indonesia. Pesan konkurensi persis: "Kartu sudah dipindah orang lain, muat ulang."
- Setiap aksi git mengikuti bagian "Versioning" CLAUDE.md (cek status, jelaskan, verifikasi). Kerja di branch `feat/kanban-konten` dari `main`. Tidak ada push tanpa persetujuan pengguna.

## Review Focus

1. Link Tayang berisi `javascript:alert(1)`, `youtu.be/x` (tanpa skema), atau spasi saja ditolak, karena link dirender sebagai `<a>`. → tes di Task 3.
2. Mencentang kanal yang sudah dicentang (dua tab / klik ganda) memberi pesan "Kanal sudah dicentang", bukan galat 500 dari PK ganda. → tes di Task 4.
3. Catatan revisi berisi spasi saja ditolak seperti catatan kosong. → tes di Task 3 dan Task 4.
4. Akun multi-peran (mis. Manajer + Direktur) di tahap Review mendapat maju ke Disetujui **dan** kembali ke Draft. → tes di Task 3.
5. Kanal yang dinonaktifkan di Setting setelah entri dibuat tetap bisa dicentang di kartu (kanal milik entri). → tes di Task 4.

---

### Task 1: Izin Kanban (PRD #3, #4)

**Files:**
- Modify: `packages/auth/src/permissions.ts`
- Test: `packages/auth/src/permissions.test.ts`

**Interfaces:**
- Produces: `Permission` mencakup `"kanban.batal_tayang"`; `manajer` punya `kanban.ide_ke_draft` dan `kanban.batal_tayang`.

- [ ] **Step 0:** Buat branch `feat/kanban-konten` dari `main` (ikuti aturan Versioning). Commit spec + plan ini sebagai commit pertama (`docs: rancangan dan rencana modul Kanban putaran 1`).
- [ ] **Step 1: Tes gagal** di `permissions.test.ts` (ikuti gaya tabel yang ada, mis. baris `["kanban.lihat", "DMSK"]`):

```ts
it("manajer boleh Ide → Draft dan batal centang Tayang", () => {
  expect(can(["manajer"], "kanban.ide_ke_draft")).toBe(true)
  expect(can(["manajer"], "kanban.batal_tayang")).toBe(true)
  for (const role of ["direktur", "sdm_strategi", "sdm_khusus"] as const)
    expect(can([role], "kanban.batal_tayang")).toBe(false)
  expect(can(["sdm_strategi"], "kanban.ide_ke_draft")).toBe(true)
})
```

Perbarui baris tabel matriks `kanban.ide_ke_draft` bila ada (kini Manajer + SDM Strategi).
- [ ] **Step 2:** `pnpm --filter @workspace/auth test` → FAIL.
- [ ] **Step 3:** Tambah `"kanban.batal_tayang"` setelah `"kanban.tayang"` di `PERMISSIONS`; tambah `kanban.ide_ke_draft` dan `kanban.batal_tayang` ke `manajer`.
- [ ] **Step 4:** `pnpm --filter @workspace/auth test` → PASS; `pnpm typecheck` → lulus.
- [ ] **Step 5:** Commit `feat(auth): izin Kanban Manajer (Ide→Draft, batal centang Tayang)`.

### Task 2: Skema Kanban + migrasi

**Files:**
- Modify: `packages/db/src/schema/planner.ts` (`contentCard`)
- Create: `packages/db/src/schema/kanban.ts`
- Modify: `packages/db/src/schema/index.ts` (`export * from "./kanban"`)
- Create: `packages/db/drizzle/0003_*.sql` (hasil generate)

**Interfaces:**
- Produces (Drizzle): `contentCard.caption` (text null), `contentCard.stageChangedAt` (timestamptz notNull defaultNow), `contentCard.updatedAt` (timestamptz notNull defaultNow, `$onUpdate`);
  `contentCardEvent` { id serial, cardId → contentCard cascade, kind text, fromStage text null, toStage text null, channelId → channel restrict null, note text null, actorId → user restrict notNull, createdAt };
  `contentCardComment` { id serial, cardId cascade, authorId → user restrict, body text notNull, createdAt };
  `contentCardPublication` { cardId cascade, channelId restrict, url text null, checkedBy → user restrict notNull, checkedAt timestamptz defaultNow; PK (cardId, channelId) }.
  Konstanta `CARD_EVENT_KINDS = ["maju","kembali","centang","batal_centang","otomatis","catatan_sistem"] as const` + `type CardEventKind` di `schema/stages.ts` (modul tanpa impor, dipakai rules).
- CHECK: `kind in (...)`; `from_stage`/`to_stage` null atau di `CONTENT_STAGES` (pola `content_card_stage_check`); `kind not in ('kembali','batal_centang') or note is not null`. Indeks `(card_id, created_at)` di event dan comment.

- [ ] **Step 1:** Tulis skema; `pnpm --filter @workspace/db db:generate` → file `0003_*.sql` baru berisi `ALTER TABLE content_card ADD COLUMN …` dan tiga `CREATE TABLE`.
- [ ] **Step 2:** Periksa SQL: kolom baru `content_card` punya default (aman untuk baris lama), tidak ada `DROP`.
- [ ] **Step 3:** `pnpm --filter @workspace/db db:migrate` ke DB dev dan DB uji `_test` → sukses; `pnpm typecheck` → lulus.
- [ ] **Step 4:** Commit `feat(db): skema riwayat, komentar, dan publikasi kartu konten`.

### Task 3: Aturan murni Kanban

**Files:**
- Create: `apps/admin/lib/kanban/rules.ts`
- Test: `apps/admin/lib/kanban/rules.test.ts`

**Interfaces:**
- Consumes: `Permission` (Task 1), `ContentStage`, `CardEventKind` (Task 2).
- Produces:
  - `type MoveTargets = { forward?: ContentStage; back?: ContentStage }`
  - `allowedMoves(perms: ReadonlySet<Permission>, stage: ContentStage, publishedCount: number): MoveTargets`
  - `canEditContent(perms, stage): boolean` — `kanban.isi` ∧ stage ∈ {ide, draft}
  - `canCheck(perms, stage): boolean` — `kanban.tayang` ∧ stage = disetujui
  - `canUncheck(perms, stage): boolean` — `kanban.batal_tayang` ∧ stage ∈ {disetujui, tayang}
  - `isFullyPublished(channelIds: number[], publishedIds: number[]): boolean` — false bila `channelIds` kosong
  - `publishUrlError(requiresLink: boolean, url: string | null): string | null` — pesan galat atau null
  - `noteSchema` (zod: trim, min 1 "Catatan wajib diisi", max 2000), `commentSchema` (sama, pesan "Komentar wajib diisi"), `captionSchema` (max 5000)
  - `formatWib(d: Date): string` — "12 Nov 14.20"

Tabel `allowedMoves` (izin → tahap):

| stage | forward (izin) | back (izin) |
|---|---|---|
| ide | draft (`ide_ke_draft`) | — |
| draft | review (`draft_ke_review`) | ide (`ide_ke_draft`) |
| review | disetujui (`review_ke_disetujui`) | draft (`draft_ke_review`) |
| disetujui | — (otomatis) | review (`review_ke_disetujui`, **hanya bila `publishedCount === 0`**) |
| tayang | — | — (lewat batal centang) |

- [ ] **Step 1: Tes gagal** `rules.test.ts` (pakai `permissionsFor` dari `@workspace/auth/permissions`):
  - `allowedMoves(permissionsFor(["manajer"]), "ide", 0)` → `{ forward: "draft" }`
  - `allowedMoves(permissionsFor(["sdm_khusus"]), "ide", 0)` → `{}`
  - `allowedMoves(permissionsFor(["manajer"]), "draft", 0)` → `{ forward: "review", back: "ide" }`
  - `allowedMoves(permissionsFor(["direktur"]), "review", 0)` → `{ forward: "disetujui" }`
  - `allowedMoves(permissionsFor(["manajer","direktur"]), "review", 0)` → `{ forward: "disetujui", back: "draft" }` (Review Focus 4)
  - `allowedMoves(permissionsFor(["direktur"]), "disetujui", 0)` → `{ back: "review" }`; dengan `publishedCount` 1 → `{}`
  - `allowedMoves(permissionsFor(["manajer"]), "tayang", 2)` → `{}`
  - `canEditContent(permissionsFor(["sdm_khusus"]), "draft")` true; `"review"` false; `permissionsFor(["direktur"])`, `"ide"` false
  - `canCheck(permissionsFor(["sdm_khusus"]), "disetujui")` true; `"review"` false; direktur false
  - `canUncheck(permissionsFor(["manajer"]), "tayang")` true; `permissionsFor(["sdm_strategi"])` false
  - `isFullyPublished([1,2],[2,1])` true; `([1,2],[1])` false; `([],[])` false; `([1],[1,9])` true
  - `publishUrlError(true, null)` non-null; `(true, "https://youtu.be/x")` null; `(true, "javascript:alert(1)")` non-null; `(true, "youtu.be/x")` non-null; `(true, "   ")` non-null; `(false, null)` null; `(false, "ftp://x")` non-null (Review Focus 1)
  - `noteSchema.safeParse("   ").success` false (Review Focus 3); `"a".repeat(2001)` false
  - `formatWib(new Date("2026-11-12T07:20:00Z"))` → `"12 Nov 14.20"`
- [ ] **Step 2:** `pnpm --filter admin test lib/kanban/rules` → FAIL.
- [ ] **Step 3:** Implementasi. `allowedMoves` sebagai satu tabel data (bukan rangkaian `if`). `publishUrlError` memakai `new URL()` di dalam try + cek `protocol`.
- [ ] **Step 4:** Tes → PASS.
- [ ] **Step 5:** Commit `feat(admin): aturan murni alur Kanban`.

### Task 4: Mutasi Kanban (tes DB uji)

**Files:**
- Create: `apps/admin/lib/kanban/mutations.ts`
- Test: `apps/admin/lib/kanban/kanban.db.test.ts` (pola dan guard `TEST_DB` dari `lib/planner/planner.db.test.ts`; buat entri lewat `createEntry` Planner)

**Interfaces:**
- Consumes: Task 2 tabel, Task 3 aturan, `UserError` dari `@/lib/setting-crud`, `Permission`.
- Produces:
  - `type Actor = { id: string; permissions: ReadonlySet<Permission> }` (cocok dengan `CurrentUser`)
  - `moveCard(cardId: number, from: ContentStage, to: ContentStage, actor: Actor, note?: string): Promise<void>`
  - `saveCaption(cardId: number, caption: string, actor: Actor): Promise<void>`
  - `checkChannel(cardId: number, channelId: number, url: string | null, actor: Actor): Promise<{ stage: ContentStage }>`
  - `uncheckChannel(cardId: number, channelId: number, reason: string, actor: Actor): Promise<{ stage: ContentStage }>`
  - `addComment(cardId: number, body: string, actor: Actor): Promise<void>`
  - `reconcileCardAfterEntryUpdate(tx: Tx, entryId: number, change: { oldName: string; newName: string; oldChannelIds: number[]; newChannelIds: number[] }, actorId: string): Promise<void>` (dipakai Task 5)

Setiap mutasi: validasi id (pola `assertEntryId`), satu transaksi, `select … for update` baris kartu, periksa aturan terhadap tahap **di DB**. Setiap perubahan tahap juga menyetel `stageChangedAt = now`. Galat pengguna lewat `UserError`:
- kartu tidak ada → "Kartu tidak ditemukan"
- tahap DB ≠ `from` → "Kartu sudah dipindah orang lain, muat ulang."
- tujuan tidak di `allowedMoves` → "Anda tidak berwenang memindahkan kartu ini"
- mundur tanpa catatan valid → pesan `noteSchema`
- kanal bukan milik entri → "Kanal tidak valid"; sudah dicentang → "Kanal sudah dicentang"; belum dicentang saat batal → "Kanal belum dicentang"

Event yang dicatat: `moveCard` → `maju`/`kembali` (+note); `checkChannel` → `centang` (+channelId), lalu bila lengkap → `otomatis` disetujui→tayang; `uncheckChannel` → `batal_centang` (+note, channelId), lalu bila tahap tayang → `otomatis` tayang→disetujui.

- [ ] **Step 1: Tes gagal** `kanban.db.test.ts` (akun: manajer, sdm_strategi, direktur, sdm_khusus; dua kanal, satu `requiresLink: true`):
  - `moveCard` ide→draft oleh sdm_strategi: tahap `draft`, satu event `maju` dengan `actorId`.
  - `moveCard` draft→ide tanpa catatan → reject; dengan catatan → event `kembali` berisi note.
  - `moveCard` dengan `from` basi (kartu sudah draft, kirim from `ide`) → reject "Kartu sudah dipindah orang lain, muat ulang."
  - `moveCard` review→disetujui oleh sdm_khusus → reject "Anda tidak berwenang…".
  - `saveCaption` di tahap review → reject; di draft → tersimpan.
  - `checkChannel` kanal `requiresLink` tanpa URL → reject; kanal kedua dengan URL → tahap `tayang` + event `otomatis`.
  - `checkChannel` dua kali kanal yang sama → reject "Kanal sudah dicentang" (Review Focus 2).
  - `checkChannel` setelah kanal di-set `active=false` di tabel `channel` → sukses (Review Focus 5).
  - `uncheckChannel` oleh manajer di `tayang` dengan alasan → tahap `disetujui`, publikasi terhapus, event `batal_centang` + `otomatis`; alasan `"   "` → reject (Review Focus 3); oleh sdm_khusus → reject.
  - `moveCard` disetujui→review oleh direktur saat ada publikasi → reject.
  - `addComment` oleh direktur → tersimpan.
  - `deleteEntry` (Planner) entri berkartu yang punya event/komentar/publikasi → semua terhapus.
- [ ] **Step 2:** `DATABASE_URL=… pnpm --filter admin test lib/kanban` → FAIL.
- [ ] **Step 3:** Implementasi `mutations.ts`.
- [ ] **Step 4:** Tes → PASS; `pnpm typecheck` lulus.
- [ ] **Step 5:** Commit `feat(admin): mutasi alur Kanban, centang Tayang, dan komentar`.

### Task 5: Sinkron perubahan entri Planner ke kartu (§4.6)

**Files:**
- Modify: `apps/admin/lib/planner/mutations.ts` (`updateEntry`)
- Modify: `apps/admin/app/(app)/planner/actions.ts` (pemanggil `updateEntry`)
- Modify: `apps/admin/lib/kanban/mutations.ts` (implementasi `reconcileCardAfterEntryUpdate`)
- Test: `apps/admin/lib/kanban/kanban.db.test.ts`, sesuaikan pemanggilan di `apps/admin/lib/planner/planner.db.test.ts`

**Interfaces:**
- Consumes: `reconcileCardAfterEntryUpdate` (Task 4).
- Produces: `updateEntry(id: number, raw: unknown, actorId: string, version?: string): Promise<void>` (urutan parameter berubah; semua pemanggil diperbarui).

Perilaku `reconcileCardAfterEntryUpdate` (dalam transaksi `updateEntry`, setelah kanal ditulis):
1. Hapus publikasi untuk kanal yang tidak ada lagi di `newChannelIds`.
2. Kartu `disetujui` dan `isFullyPublished(new, publikasi tersisa)` → `tayang` + event `otomatis` note "Kanal dihapus di Planner".
3. Kartu `tayang` dan ada kanal baru tanpa publikasi → `disetujui` + event `otomatis` note "Kanal ditambah di Planner".
4. `oldName !== newName` dan tahap ∈ {disetujui, tayang} → event `catatan_sistem` note `Diubah setelah disetujui: "<lama>" → "<baru>"`.

`updateEntry` membaca `name` lama di select `for update` yang sudah ada.

- [ ] **Step 1: Tes gagal** di `kanban.db.test.ts`:
  - kartu `disetujui`, kanal A tercentang, B belum; `updateEntry` buang B → tahap `tayang`, ada event `otomatis`.
  - kartu `tayang`; `updateEntry` tambah kanal C → tahap `disetujui`.
  - kartu `disetujui`; ubah nama → event `catatan_sistem` berisi nama lama dan baru; kartu tetap `disetujui`.
  - kartu `draft`; ubah nama → tidak ada event baru.
  - kartu `disetujui`; kanal A tercentang lalu dibuang dari entri → publikasi A terhapus.
- [ ] **Step 2:** Tes → FAIL.
- [ ] **Step 3:** Implementasi; perbarui `saveEntry` di `planner/actions.ts` (`updateEntry(id, input, user!.id, version)`) dan pemanggilan di `planner.db.test.ts`.
- [ ] **Step 4:** `pnpm --filter admin test` (semua) → PASS; `pnpm typecheck` lulus.
- [ ] **Step 5:** Commit `feat(admin): sinkron perubahan entri Planner ke kartu konten`.

### Task 6: Papan `/konten`

**Files:**
- Create: `apps/admin/lib/kanban/types.ts`, `apps/admin/lib/kanban/queries.ts`
- Create: `apps/admin/app/(app)/konten/page.tsx`, `apps/admin/app/(app)/konten/_board.tsx`, `apps/admin/app/(app)/konten/actions.ts`
- Modify: `packages/ui/src/components/domain/content-card.tsx` (prop `progress?: string`, mis. "2/3 kanal")
- Test: tambahan di `kanban.db.test.ts` untuk `listBoard`

**Interfaces:**
- Consumes: Task 3 (`allowedMoves`), Task 4 mutasi.
- Produces:
  - `type BoardCard = { id: number; entryId: number; stage: ContentStage; name: string; publishDate: IsoDate; channels: { id: number; name: string }[]; assignees: { id: string; name: string }[]; publishedCount: number }`
  - `listBoard(opts: { allPublished: boolean }): Promise<BoardCard[]>` — urut `publishDate` naik lalu nama; tahap `tayang` disaring `stage_changed_at >= now() - interval '30 days'` di SQL kecuali `allPublished`.
  - Aksi server (semua `withPermission("kanban.lihat", …)` + `guarded`, mengembalikan `CrudResult`; revalidate `/konten`, `/konten/${id}`, `/planner`): `moveCardAction(cardId, from, to, note?)`, `saveCaptionAction(cardId, caption)`, `checkChannelAction(cardId, channelId, url)`, `uncheckChannelAction(cardId, channelId, reason)`, `addCommentAction(cardId, body)`.

- [ ] **Step 1: Tes gagal** `listBoard`: kartu `tayang` dengan `stage_changed_at` 31 hari lalu tidak muncul; muncul dengan `allPublished: true`; kartu `ide` lama tetap muncul.
- [ ] **Step 2:** Tes → FAIL; implementasi `queries.ts`; tes → PASS.
- [ ] **Step 3:** Panggil skill `frontend-design:frontend-design`, MCP reui `get_agent_skill` dan `get_component` kanban.
- [ ] **Step 4:** `page.tsx`: `requirePermission("kanban.lihat")`, baca `searchParams.tayang === "semua"`, kirim kartu + `[...user.permissions]` ke `_board.tsx`.
- [ ] **Step 5:** `_board.tsx` (client), mengikuti `galeri/_demo-kanban.tsx`:
  - `Kanban` mode `onMove`: tolak bila `overContainer` bukan `allowedMoves(perms, stage, publishedCount).forward/back` (toast "Perpindahan ini tidak diizinkan"). Maju → pindah optimistis lalu `moveCardAction`; galat → kembalikan + toast pesan server. Mundur → `Dialog` catatan revisi (Textarea + Field), kirim baru setelah dikonfirmasi; batal → kartu tetap di tempat.
  - Kepala kolom: ikon `CONTENT_STAGE_ICON`, label, jumlah. Kolom Telah Tayang: tautan "Lihat semua" → `/konten?tayang=semua` (atau "30 hari terakhir" → `/konten` saat semua).
  - Kartu: `ContentCard` (`locked` untuk review/disetujui/tayang, `progress` untuk disetujui), dapat dibuka ke `/konten/[id]` lewat tautan yang bisa difokus keyboard.
  - `useIsMobile()`: jangan render handle seret; kartu hanya tautan.
  - Kolom kosong: teks singkat `text-muted-foreground`.
- [ ] **Step 6:** `pnpm dev`, masuk sebagai Manajer: seret ide→draft berhasil dan bertahan setelah muat ulang; seret draft→review→ide memunculkan dialog; seret ke Telah Tayang ditolak; ubah tahap di tab lain lalu seret di tab lama → kartu kembali + toast pesan konkurensi. Masuk sebagai SDM Khusus: semua seretan ditolak.
- [ ] **Step 7:** `pnpm lint && pnpm typecheck` lulus. Commit `feat(admin): papan Kanban konten`.

### Task 7: Halaman kartu `/konten/[id]`

**Files:**
- Modify: `apps/admin/lib/kanban/types.ts`, `apps/admin/lib/kanban/queries.ts` (`getCard`)
- Create: `apps/admin/app/(app)/konten/[id]/page.tsx` dan file perakitan `_*.tsx` di folder itu (aksi tahap, caption, tayang, riwayat, komentar)
- Test: tambahan di `kanban.db.test.ts` untuk `getCard`

**Interfaces:**
- Consumes: Task 3 (`allowedMoves`, `canEditContent`, `canCheck`, `canUncheck`, `formatWib`), aksi server Task 6.
- Produces: `getCard(id: number): Promise<CardDetail | null>` dengan
  `CardDetail = BoardCard & { caption: string | null; activity: { start: IsoDate; end: IsoDate } | null; assignments: { personName: string; taskTypeName: string; start: IsoDate; end: IsoDate }[]; channels: { id: number; name: string; requiresLink: boolean; publication: { url: string | null; checkedByName: string; checkedAt: Date } | null }[]; events: { id: number; kind: CardEventKind; fromStage: ContentStage | null; toStage: ContentStage | null; channelName: string | null; note: string | null; actorName: string; createdAt: Date }[] (terbaru dulu); comments: { id: number; authorName: string; body: string; createdAt: Date }[] (terlama dulu); lastReturnNote: string | null }`.
  `lastReturnNote` = note event `kembali` terbaru, hanya bila tahap sekarang = `toStage` event itu dan tidak ada event `maju` sesudahnya.

- [ ] **Step 1: Tes gagal** `getCard`: id tidak ada → `null`; setelah draft→review→draft (kembali dengan catatan "Perbaiki judul") → `lastReturnNote === "Perbaiki judul"`; setelah maju lagi → `null`; urutan events terbaru dulu.
- [ ] **Step 2:** Implementasi → tes PASS.
- [ ] **Step 3:** `page.tsx`: `requirePermission("kanban.lihat")`; `params.id` bukan bilangan bulat positif atau kartu tidak ada → `notFound()`. Susunan (sketsa di spec "Halaman"):
  - Kepala: tautan kembali ke `/konten`, nama, `Badge` tahap (+ ikon kunci bila terkunci), tombol dari `allowedMoves` (kembalikan membuka `Dialog` catatan wajib).
  - `Alert` catatan revisi bila `lastReturnNote`.
  - Data Planner baca saja + tautan "Buka di Planner" → `/planner/[entryId]`.
  - Caption: `Textarea` + Simpan bila `canEditContent`, selain itu teks baca saja.
  - Tayang per kanal (tahap disetujui/tayang): `Checkbox` + input link bila `requiresLink` (input link opsional untuk kanal lain); baris tercentang menampilkan link (`<a target="_blank" rel="noopener noreferrer">`), pencentang, `formatWib`; tombol Batalkan bila `canUncheck` → `Dialog` alasan wajib. Target sentuh ≥ 44 px.
  - Riwayat: `@reui` timeline (cek API via MCP `get_component timeline`), tiap item "<aksi> oleh <nama>, <formatWib>" + catatan.
  - Komentar: daftar + `Textarea` + Kirim.
  - Semua aksi: toast galat dari server, `router.refresh()` setelah berhasil.
- [ ] **Step 4:** `pnpm dev`, jalankan alur penuh dengan akun tiap peran: Ide → Draft (SDM Strategi) → Review (Manajer) → kembali ke Draft (Manajer, catatan tampil di Alert, caption terbuka) → Review → Disetujui (Direktur) → centang kanal tanpa link ditolak, dengan link diterima → semua tercentang → Telah Tayang → Manajer batalkan satu → Disetujui. Riwayat mencatat semuanya. Tampilan HP (lebar 375 px) terpakai.
- [ ] **Step 5:** Skill `anthropic-skills:web-design-guidelines` pada `konten/**`; MCP reui `validate_usage` + `get_audit_checklist` untuk kanban & timeline; perbaiki temuan.
- [ ] **Step 6:** `pnpm lint && pnpm typecheck && pnpm --filter admin test` lulus. Commit `feat(admin): halaman kartu konten (tahap, caption, tayang, riwayat, komentar)`.

### Task 8: Verifikasi akses langsung

**Files:**
- Modify: `scripts/verify-access.sh`

- [ ] **Step 1:** Tambah `/konten` dan `/konten/1` ke daftar "Tanpa sesi → /masuk"; setelah login SDM Khusus, `GET /konten` → `200`; `GET /konten/999999` → `404`.
- [ ] **Step 2:** Jalankan skrip terhadap `pnpm dev` → semua PASS.
- [ ] **Step 3:** Commit `chore: verifikasi akses Kanban`.
