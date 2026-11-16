# Media Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modul Media Planner Tahap 1: entri (nama, kegiatan, penugasan, kanal, tayang), kartu konten minimal tahap Ide, tiga tampilan (Daftar, Kalender, Partisi), filter "Pekerjaan saya saja", dan hapus sesuai §4.5.

**Architecture:** Halaman server di `apps/admin/app/(app)/planner` membaca parameter URL, menjalankan satu query per periode (`lib/planner/queries.ts`), lalu fungsi murni (`lib/planner/rules.ts`, `views.ts`) membentuk data tiap tampilan. Simpan/hapus lewat aksi server tipis yang memanggil `lib/planner/mutations.ts` (transaksi Drizzle). Aturan murni dan mutasi dites dengan vitest.

**Tech Stack:** Next.js 16.4.5 (App Router, `searchParams` berupa Promise), Drizzle + PostgreSQL, Better Auth (izin dari `@workspace/auth`), zod 4, date-fns 4, vitest 4.1.12, komponen `@workspace/ui` (reui data-grid, event-calendar, domain PartitionGrid/AssignmentRows).

**Spec:** `docs/superpowers/specs/2026-11-16-media-planner-design.md`

## Global Constraints

- Jalankan semua perintah di WSL setelah `. ~/.nvm/nvm.sh`, dari root repo/worktree. Jangan pnpm dari Windows terhadap path `\\wsl.localhost`.
- Baca panduan Next di `apps/admin/node_modules/next/dist/docs/` sebelum menulis halaman/aksi (AGENTS.md); `searchParams` dan `params` adalah Promise.
- Komponen hanya di `packages/ui`; `apps/admin` hanya halaman dan file perakitan `_*.tsx` di folder route (pola `setting/akun/_accounts-client.tsx`, `galeri/_demo-*.tsx`). Komponen baru shadcn/`@reui` hanya lewat `pnpm dlx shadcn@latest add … -c packages/ui` dengan `--dry-run` dulu.
- Warna hanya token `globals.css`; tidak ada warna/ukuran/font hardcode.
- Sebelum Task 6 dan 7: panggil skill `frontend-design:frontend-design`. Setelah Task 7: `anthropic-skills:web-design-guidelines` dan MCP reui `validate_usage` + `get_audit_checklist`.
- Semua tanggal Planner: string ISO `yyyy-MM-dd`, kolom Postgres `date` (mode string). "Hari ini" = tanggal WIB (`Asia/Jakarta`).
- Pekan untuk menentukan entri yang tampil = **Senin–Minggu**. Kalender 7 hari. Partisi Senin–Sabtu, kolom Minggu hanya bila ada penugasan hari Minggu pada data yang ditampilkan.
- Parameter URL `/planner`: `tampilan` (`daftar`|`kalender`|`partisi`, default `daftar`), `tanggal` (`yyyy-MM-dd`, default hari ini WIB), `rentang` (`pekan`|`bulan`, hanya Daftar, default `pekan`), `saya` (`1`|`0`, default `defaultMyWorkOnly(roles)`).
- Staf unit = akun dengan minimal satu peran selain `direktur`.
- Teks UI berbahasa Indonesia.
- Setiap aksi git (commit, dll.) mengikuti bagian "Versioning" CLAUDE.md: cek `git status`/`git log` dulu, jelaskan, verifikasi sesudahnya. Tidak ada push tanpa persetujuan pengguna.

## Review Focus

1. Penugasan yang melintasi batas pekan (mis. Jumat 13 Nov – Selasa 17 Nov) harus muncul di kedua pekan dan terpotong benar di Partisi/Kalender. → tes di Task 4.
2. Parameter URL rusak (`?tanggal=2026-02-30`, `?tanggal=abc`, `?tanggal=a&tanggal=b`, `?tampilan=x`) jatuh ke default, bukan galat 500. → tes di Task 3.
3. Pekan yang melintasi pergantian tahun (Senin 28 Des 2026 – Minggu 3 Jan 2027) dan Daftar bulanan Februari. → tes di Task 3.
4. Entri yang penugasannya memakai akun/jenis/kanal yang **kemudian dinonaktifkan** tetap bisa disimpan tanpa mengubah baris itu; menambah baris baru dengan nilai nonaktif ditolak. → tes di Task 5.
5. Menyimpan atau menghapus entri yang sudah dihapus orang lain menghasilkan pesan "Entri tidak ditemukan", bukan crash. → tes di Task 5.

---

### Task 1: Izin `planner.hapus_terkunci`

**Files:**
- Modify: `packages/auth/src/permissions.ts` (tambah ke `PERMISSIONS` dan ke `ROLE_PERMISSIONS.manajer` saja)
- Test: `packages/auth/src/permissions.test.ts`

**Interfaces:**
- Produces: `Permission` mencakup `"planner.hapus_terkunci"`.

- [ ] **Step 1: Tes gagal.** Di `permissions.test.ts` tambahkan kasus (ikuti gaya tabel yang ada):

```ts
it("hanya manajer yang boleh menghapus entri Planner terkunci", () => {
  expect(can(["manajer"], "planner.hapus_terkunci")).toBe(true)
  for (const role of ["direktur", "sdm_strategi", "sdm_khusus"] as const)
    expect(can([role], "planner.hapus_terkunci")).toBe(false)
  expect(can([], "planner.hapus_terkunci")).toBe(false)
})
```

Bila ada tes snapshot/tabel matriks yang menghitung izin manajer, perbarui juga.

- [ ] **Step 2:** `pnpm --filter @workspace/auth test` → FAIL (tipe/izin belum ada).
- [ ] **Step 3:** Tambahkan `"planner.hapus_terkunci"` setelah `"planner.pdf"` di `PERMISSIONS` dan di daftar `manajer`.
- [ ] **Step 4:** `pnpm --filter @workspace/auth test` → PASS. `pnpm typecheck` → bersih.
- [ ] **Step 5: Commit** `feat(auth): izin hapus entri planner terkunci`.

---

### Task 2: Skema Planner + migrasi

**Files:**
- Create: `packages/db/src/schema/stages.ts` (tanpa impor, seperti `roles.ts`)
- Create: `packages/db/src/schema/planner.ts`
- Modify: `packages/db/src/schema/index.ts` (ekspor keduanya)
- Modify: `packages/db/package.json` (`exports`: tambah `"./schema/stages": "./src/schema/stages.ts"`)
- Create: `packages/db/drizzle/0002_*.sql` (hasil `db:generate`)

**Interfaces:**
- Produces:
  - `CONTENT_STAGES = ["ide","draft","review","disetujui","tayang"] as const`, `type ContentStage`, `LOCKED_STAGES: readonly ContentStage[] = ["review","disetujui","tayang"]` dari `@workspace/db/schema/stages`.
  - Tabel `plannerEntry`, `plannerAssignment`, `plannerEntryChannel`, `contentCard` dari `@workspace/db/schema`.

- [ ] **Step 1: Tulis `stages.ts`** dengan konstanta di atas. Nilai harus sama dengan `ContentStage` di `packages/ui/src/components/domain/content-card.tsx`.
- [ ] **Step 2: Tulis `planner.ts`** sesuai spec bagian "Data":
  - `planner_entry`: `id` serial PK, `name` text not null, `activity_start` date null, `activity_end` date null, `publish_date` date not null, `created_by` text → `user.id` (onDelete restrict), `created_at`, `updated_at` timestamptz default now (`updated_at` dengan `$onUpdate`). CHECK `planner_entry_activity_check`: `(activity_start is null and activity_end is null) or (activity_start is not null and activity_end is not null and activity_end >= activity_start)`.
  - `planner_assignment`: `id` serial PK, `entry_id` → entri (cascade), `user_id` text → user (restrict), `task_type_id` → `task_type` (restrict), `start_date`/`end_date` date not null, CHECK `end_date >= start_date`. Indeks `planner_assignment_user_dates_idx (user_id, start_date, end_date)` dan `planner_assignment_entry_idx (entry_id)`.
  - `planner_entry_channel`: `entry_id` → entri (cascade), `channel_id` → `channel` (restrict), PK `(entry_id, channel_id)`.
  - `content_card`: `id` serial PK, `entry_id` → entri (cascade) **unique**, `stage` text not null default `'ide'`, CHECK `stage in (...)` dari `CONTENT_STAGES`, `created_at`.
  - Semua kolom `date` memakai `{ mode: "string" }`.
- [ ] **Step 3:** `pnpm --filter @workspace/db db:generate` → satu file `0002_*.sql` baru berisi 4 tabel, CHECK, dan indeks. Periksa isinya.
- [ ] **Step 4:** `pnpm --filter @workspace/db db:migrate` (DB dev) lalu `DATABASE_URL=postgres://itapp:itapp@localhost:5432/itapp_test pnpm --filter @workspace/db db:migrate` (DB uji; buat dulu bila belum ada). Keduanya sukses di DB yang sudah berisi data Fondasi.
- [ ] **Step 5:** `pnpm typecheck` → bersih.
- [ ] **Step 6: Commit** `feat(db): skema media planner dan kartu konten minimal`.

---

### Task 3: Aturan murni Planner + vitest di `apps/admin`

**Files:**
- Modify: `apps/admin/package.json` (devDependency `vitest: "4.1.12"`, skrip `"test": "vitest run"`)
- Create: `apps/admin/vitest.config.ts` (environment `node`, include `lib/**/*.test.ts`; alias `@` → root app)
- Create: `apps/admin/lib/planner/types.ts`
- Create: `apps/admin/lib/planner/rules.ts`
- Create: `apps/admin/lib/planner/test-fixtures.ts`: `entry(patch?: Partial<PlannerEntry>): PlannerEntry`, `a(patch?: Partial<PlannerAssignment>): PlannerAssignment`, `staff(id: string, name: string, disabled?: boolean): StaffMember`. Default: entri id 1, "Konten", tanpa kegiatan, tayang `2026-11-19`, tahap `ide`, satu penugasan (`a()`: id 1, userId `"u1"`, "Budi", jenis 1 "Editing", `2026-11-17`–`2026-11-17`), satu kanal. Dipakai di Task 3 dan 4.
- Test: `apps/admin/lib/planner/rules.test.ts`

**Interfaces:**
- Consumes: `defaultMyWorkOnly`, `Permission` dari `@workspace/auth/permissions`; `Role` dari `@workspace/db/schema/roles`; `ContentStage`, `LOCKED_STAGES` dari `@workspace/db/schema/stages` (semua modul murni, aman diimpor di tes).
- Produces (`types.ts`):

```ts
export type IsoDate = string // yyyy-MM-dd
export type PlannerAssignment = {
  id: number; userId: string; userName: string
  taskTypeId: number; taskTypeName: string
  start: IsoDate; end: IsoDate
}
export type PlannerEntry = {
  id: number; name: string
  activityStart: IsoDate | null; activityEnd: IsoDate | null
  publishDate: IsoDate; stage: ContentStage
  assignments: PlannerAssignment[]
  channels: { id: number; name: string }[]
}
export type Period = { kind: "pekan" | "bulan"; start: IsoDate; end: IsoDate } // inklusif
export type PlannerView = "daftar" | "kalender" | "partisi"
export type PlannerParams = { tampilan: PlannerView; tanggal: IsoDate; rentang: "pekan" | "bulan"; saya: boolean }
export type StaffMember = { id: string; name: string; disabled: boolean }
```

- Produces (`rules.ts`):
  - `todayWib(now?: Date): IsoDate`, via `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" })`.
  - `parsePlannerParams(sp: Record<string, string | string[] | undefined>, roles: readonly Role[], now?: Date): PlannerParams`. Nilai array, tidak dikenal, atau tanggal tidak valid → default. `rentang` dipaksa `"pekan"` bila `tampilan !== "daftar"`.
  - `resolvePeriod(p: Pick<PlannerParams, "tanggal" | "rentang">): Period`
  - `shiftPeriod(period: Period, dir: -1 | 1): IsoDate` (tanggal awal periode sebelum/berikutnya, untuk tombol ‹ ›)
  - `rangesOverlap(aStart: IsoDate, aEnd: IsoDate, bStart: IsoDate, bEnd: IsoDate): boolean`
  - `inPeriod(entry: PlannerEntry, period: Period): boolean`
  - `sortKey(entry: PlannerEntry): IsoDate` dan `sortEntries(entries: PlannerEntry[]): PlannerEntry[]` (kunci, lalu nama, `localeCompare("id")`)
  - `applyMyWork(entries: PlannerEntry[], userId: string, period: Period): PlannerEntry[]`
  - `canDeleteEntry(permissions: ReadonlySet<Permission>, stage: ContentStage): boolean`
  - `needsNameConfirm(stage: ContentStage): boolean` (= tahap ada di `LOCKED_STAGES`)

Perbandingan tanggal memakai perbandingan string ISO; aritmetika memakai `date-fns` (`parseISO`, `addDays`, `startOfWeek` dengan `weekStartsOn: 1`, `endOfMonth`, `format`).

- [ ] **Step 1: Pasang vitest.** Edit `package.json`, `pnpm install`, tulis `vitest.config.ts`.
- [ ] **Step 2: Tes gagal** di `rules.test.ts` (fixture kecil `entry({...})` dengan default yang masuk akal):

```ts
it("todayWib memakai WIB, bukan UTC", () => {
  expect(todayWib(new Date("2026-11-15T17:30:00Z"))).toBe("2026-11-16")
})
it("pekan = Senin–Minggu", () => {
  expect(resolvePeriod({ tanggal: "2026-11-18", rentang: "pekan" }))
    .toEqual({ kind: "pekan", start: "2026-11-16", end: "2026-11-22" })
  expect(resolvePeriod({ tanggal: "2026-11-22", rentang: "pekan" }).start).toBe("2026-11-16")
})
it("pekan lintas tahun dan bulan Februari", () => {
  expect(resolvePeriod({ tanggal: "2027-01-01", rentang: "pekan" }))
    .toEqual({ kind: "pekan", start: "2026-12-28", end: "2027-01-03" })
  expect(resolvePeriod({ tanggal: "2027-02-10", rentang: "bulan" }))
    .toEqual({ kind: "bulan", start: "2027-02-01", end: "2027-02-28" })
})
it("shiftPeriod pekan dan bulan", () => {
  const w = resolvePeriod({ tanggal: "2026-11-18", rentang: "pekan" })
  expect(shiftPeriod(w, -1)).toBe("2026-11-09")
  const m = resolvePeriod({ tanggal: "2026-01-31", rentang: "bulan" })
  expect(shiftPeriod(m, 1)).toBe("2026-02-01")
})
it("parsePlannerParams: nilai rusak jatuh ke default", () => {
  const now = new Date("2026-11-18T03:00:00Z")
  for (const tanggal of ["2026-02-30", "abc", ["2026-11-01", "2026-11-02"]])
    expect(parsePlannerParams({ tanggal }, ["manajer"], now).tanggal).toBe("2026-11-18")
  expect(parsePlannerParams({ tampilan: "x" }, ["manajer"], now).tampilan).toBe("daftar")
  expect(parsePlannerParams({ tampilan: "kalender", rentang: "bulan" }, ["manajer"], now).rentang).toBe("pekan")
})
it("parsePlannerParams: default saya per peran, saya=0 mematikan", () => {
  expect(parsePlannerParams({}, ["sdm_khusus"]).saya).toBe(true)
  expect(parsePlannerParams({}, ["sdm_khusus", "sdm_strategi"]).saya).toBe(false)
  expect(parsePlannerParams({ saya: "0" }, ["sdm_khusus"]).saya).toBe(false)
  expect(parsePlannerParams({ saya: "1" }, ["manajer"]).saya).toBe(true)
})
it("inPeriod lewat kegiatan, penugasan, atau tayang saja", () => {
  const w = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
  expect(inPeriod(entry({ activityStart: "2026-11-10", activityEnd: "2026-11-16" }), w)).toBe(true)
  expect(inPeriod(entry({ assignments: [a({ start: "2026-11-13", end: "2026-11-17" })] }), w)).toBe(true)
  expect(inPeriod(entry({ publishDate: "2026-11-22" }), w)).toBe(true) // Minggu
  expect(inPeriod(entry({ publishDate: "2026-11-23" }), w)).toBe(false)
})
it("sortKey: kegiatan, lalu penugasan paling awal", () => {
  expect(sortKey(entry({ activityStart: "2026-11-20", activityEnd: "2026-11-20",
    assignments: [a({ start: "2026-11-01", end: "2026-11-02" })] }))).toBe("2026-11-20")
  expect(sortKey(entry({ activityStart: null, activityEnd: null,
    assignments: [a({ start: "2026-11-05", end: "2026-11-06" }), a({ start: "2026-11-03", end: "2026-11-03" })] }))).toBe("2026-11-03")
})
it("applyMyWork: hanya penugasan saya yang beririsan periode", () => {
  const w = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
  const mine = entry({ id: 1, assignments: [a({ userId: "me", start: "2026-11-17", end: "2026-11-17" })] })
  const otherWeek = entry({ id: 2, assignments: [
    a({ userId: "me", start: "2026-11-30", end: "2026-11-30" }),
    a({ userId: "x", start: "2026-11-17", end: "2026-11-17" })] })
  expect(applyMyWork([mine, otherWeek], "me", w).map((e) => e.id)).toEqual([1])
})
it("canDeleteEntry dan needsNameConfirm per tahap", () => {
  const strategi = permissionsFor(["sdm_strategi"]), manajer = permissionsFor(["manajer"])
  expect(canDeleteEntry(strategi, "draft")).toBe(true)
  expect(canDeleteEntry(strategi, "review")).toBe(false)
  expect(canDeleteEntry(manajer, "tayang")).toBe(true)
  expect(canDeleteEntry(permissionsFor(["sdm_khusus"]), "ide")).toBe(false)
  expect(needsNameConfirm("ide")).toBe(false)
  expect(needsNameConfirm("disetujui")).toBe(true)
})
```

- [ ] **Step 3:** `pnpm --filter admin test` → FAIL (modul belum ada).
- [ ] **Step 4:** Tulis `types.ts` dan `rules.ts` dengan tanda tangan di atas.
- [ ] **Step 5:** `pnpm --filter admin test` → PASS; `pnpm --filter admin typecheck` → bersih.
- [ ] **Step 6: Commit** `feat(admin): aturan periode dan pekerjaan saya untuk planner`.

---

### Task 4: Pembentuk data tiga tampilan

**Files:**
- Create: `apps/admin/lib/planner/views.ts`
- Test: `apps/admin/lib/planner/views.test.ts`

**Interfaces:**
- Consumes: tipe dari `types.ts`; `rangesOverlap`, `sortEntries`, `applyMyWork` dari `rules.ts`; tipe `CalendarEvent` dari `@workspace/ui/components/reui/event-calendar/event-calendar-types`; tipe `PartitionRow` dari `@workspace/ui/components/domain/partition-grid`.
- Produces:
  - `type PlannerEventData = { entryId: number; kind: "tugas" | "tayang" }`
  - `type ListRow = { id: number; name: string; activity: string | null; assignments: string; channels: string[]; publishDate: IsoDate; stage: ContentStage }`. `activity` dan `assignments` berupa teks siap tampil, contoh `"16–18 Nov"` dan `"Budi · Take footage, Budi · Editing"`.
  - `toListRows(entries: PlannerEntry[]): ListRow[]`, terurut `sortEntries`.
  - `toCalendarEvents(entries: PlannerEntry[], opts?: { myWorkUserId?: string }): CalendarEvent<PlannerEventData>[]`. Event tugas: id `t-<assignmentId>`, judul `"<Jenis> · <Orang> — <Nama konten>"`. Event tayang: id `p-<entryId>`, judul `"Tayang: <Nama konten>"`. Semua `allDay: true`, `start` = `new Date(y, m-1, d)` dari tanggal mulai, **`end` = tanggal selesai + 1 hari** (eksklusif). Dengan `myWorkUserId`: hanya tugas milik orang itu ditambah event tayang dari entri yang memuat tugas itu.
  - `weekDays(period: Period, rows: PartitionRow[]): { key: IsoDate; label: string }[]`. Senin–Sabtu, ditambah Minggu bila ada item di kunci hari Minggu. Label contoh `"Sen 16"` (locale `id`).
  - `toPartitionRows(staff: StaffMember[], entries: PlannerEntry[], period: Period, opts?: { myWorkUserId?: string }): PartitionRow[]`. Satu baris per staf aktif urut nama, ditambah staf nonaktif yang punya penugasan di periode. `items[dayKey]` = penugasan aktif hari itu, `{ id: "t-<id>", label: "<Jenis> — <Nama konten>", href: "/planner/<entryId>" }`, untuk ketujuh hari periode. Dengan `myWorkUserId`: hanya baris orang itu.

- [ ] **Step 1: Tes gagal** di `views.test.ts`:

```ts
it("event tugas: end eksklusif, judul lengkap", () => {
  const [ev] = toCalendarEvents([entry({ name: "Video Profil", assignments: [
    a({ id: 7, userName: "Budi", taskTypeName: "Editing", start: "2026-11-18", end: "2026-11-20" })] })])
  expect(ev).toMatchObject({ id: "t-7", title: "Editing · Budi — Video Profil", allDay: true })
  expect(ev.start).toEqual(new Date(2026, 10, 18))
  expect(ev.end).toEqual(new Date(2026, 10, 21))
})
it("event tayang ada satu per entri", () => {
  const evs = toCalendarEvents([entry({ id: 3, publishDate: "2026-11-19" })])
  expect(evs.filter((e) => e.data?.kind === "tayang")).toHaveLength(1)
})
it("kalender pekerjaan saya: hanya tugas saya + tayang entrinya", () => {
  const evs = toCalendarEvents([
    entry({ id: 1, assignments: [a({ id: 1, userId: "me" }), a({ id: 2, userId: "x" })] }),
    entry({ id: 2, assignments: [a({ id: 3, userId: "x" })] }),
  ], { myWorkUserId: "me" })
  expect(evs.map((e) => e.id).sort()).toEqual(["p-1", "t-1"])
})
it("partisi: penugasan lintas pekan terpotong di periode", () => {
  const w = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
  const [row] = toPartitionRows([staff("u1", "Budi")],
    [entry({ assignments: [a({ userId: "u1", start: "2026-11-13", end: "2026-11-17" })] })], w)
  expect(Object.keys(row.items).filter((k) => row.items[k].length)).toEqual(["2026-11-16", "2026-11-17"])
})
it("partisi: staf nonaktif muncul hanya bila punya tugas di periode", () => {
  const w = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
  const rows = toPartitionRows([staff("u1", "Ani"), staff("u2", "Budi", true), staff("u3", "Cici", true)],
    [entry({ assignments: [a({ userId: "u2", start: "2026-11-16", end: "2026-11-16" })] })], w)
  expect(rows.map((r) => r.personId)).toEqual(["u1", "u2"])
})
it("partisi pekerjaan saya: hanya baris saya", () => {
  const w = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
  expect(toPartitionRows([staff("u1", "Ani"), staff("me", "Saya")], [], w, { myWorkUserId: "me" })
    .map((r) => r.personId)).toEqual(["me"])
})
it("weekDays: Minggu hanya bila ada tugas Minggu", () => {
  const w = resolvePeriod({ tanggal: "2026-11-16", rentang: "pekan" })
  const none = toPartitionRows([staff("u1", "Ani")], [], w)
  expect(weekDays(w, none).map((d) => d.key)).toHaveLength(6)
  const sunday = toPartitionRows([staff("u1", "Ani")],
    [entry({ assignments: [a({ userId: "u1", start: "2026-11-22", end: "2026-11-22" })] })], w)
  expect(weekDays(w, sunday).at(-1)?.key).toBe("2026-11-22")
})
it("toListRows terurut dan teks ringkas", () => {
  const rows = toListRows([
    entry({ id: 2, name: "B", activityStart: "2026-11-20", activityEnd: "2026-11-20" }),
    entry({ id: 1, name: "A", activityStart: "2026-11-16", activityEnd: "2026-11-18" }),
  ])
  expect(rows.map((r) => r.id)).toEqual([1, 2])
  expect(rows[0].activity).toBe("16–18 Nov")
})
```

- [ ] **Step 2:** `pnpm --filter admin test` → FAIL.
- [ ] **Step 3: Tambah `href?: string` ke `PartitionItem`** di `packages/ui/src/components/domain/partition-grid.tsx`. Item dengan `href` dirender sebagai `<a href>` dengan kelas tautan dari token (mis. `underline-offset-4 hover:underline`, fokus terlihat). `packages/ui` tidak mengimpor `next/link`.
- [ ] **Step 4:** Tulis `views.ts`.
- [ ] **Step 5:** `pnpm --filter admin test` → PASS; `pnpm typecheck` → bersih.
- [ ] **Step 6: Commit** `feat(admin): data daftar, kalender, dan partisi planner`.

---

### Task 5: Query, validasi, dan mutasi (dengan tes DB uji)

**Files:**
- Create: `apps/admin/lib/planner/schema.ts` (zod murni, juga dipakai formulir klien)
- Create: `apps/admin/lib/planner/queries.ts` (server-only)
- Create: `apps/admin/lib/planner/mutations.ts` (server-only)
- Modify: `apps/admin/lib/setting-crud.ts` (tambah `export class UserError extends Error {}`; `guarded` mengembalikan `{ error: error.message }` untuk `UserError`)
- Test: `apps/admin/lib/planner/planner.db.test.ts` (pola `packages/auth/src/accounts.db.test.ts`: `describe.skipIf(!TEST_DB)`, impor dinamis, `truncate ... cascade` di `beforeEach`)

**Interfaces:**
- Consumes: `db` (`@workspace/db/client`), operator (`@workspace/db/orm`), tabel dari Task 2, `inPeriod`/`canDeleteEntry`/`needsNameConfirm` (Task 3), `Permission`.
- Produces:
  - `entryInputSchema` (zod) → `EntryInput`:
    ```ts
    { name: string            // trim, 2–120 karakter
      activityStart: IsoDate | null; activityEnd: IsoDate | null // berdua atau kosong, end >= start
      publishDate: IsoDate
      assignments: { id?: string; personId: string; taskTypeId: string; start: IsoDate; end: IsoDate }[] // min 1, end >= start
      channelIds: number[] }  // min 1, unik
    ```
    Bentuk `assignments` sama dengan `Assignment` dari `AssignmentRows` (start/end wajib). Pesan galat dalam bahasa Indonesia, mis. "Nama konten minimal 2 karakter", "Tambahkan minimal satu penugasan", "Pilih minimal satu kanal", "Tanggal tayang wajib diisi", "Setiap penugasan wajib punya orang, jenis, dan tanggal".
  - `listEntriesInPeriod(period: Period): Promise<PlannerEntry[]>`. Filter SQL = aturan `inPeriod` (kegiatan, `exists` penugasan, atau tayang beririsan), lalu memuat penugasan (nama orang, nama jenis), kanal, dan tahap kartu dalam ≤ 4 query.
  - `getEntry(id: number): Promise<PlannerEntry | null>`
  - `listStaff(): Promise<StaffMember[]>`: akun dengan peran selain `direktur`, urut nama.
  - `listFormOptions(): Promise<{ people: (Option & { active: boolean })[]; taskTypes: (Option & { active: boolean })[]; channels: { id: number; name: string; active: boolean }[] }>`. `Option` = `{ value: string; label: string }`, dengan `active` = staf tidak nonaktif / baris Setting `active`.
  - `createEntry(raw: unknown, userId: string): Promise<{ id: number }>`: satu transaksi berisi entri, penugasan, kanal, dan `content_card` tahap `ide`.
  - `updateEntry(id: number, raw: unknown): Promise<void>`: satu transaksi. Penugasan dibandingkan per id: id berupa angka = baris lama dan wajib milik entri ini (kalau bukan, `UserError("Penugasan tidak valid")`); id lain atau kosong = baris baru. Update, insert, atau hapus seperlunya. Kanal diganti. Tahap kartu tidak disentuh.
  - `deleteEntry(id: number, permissions: ReadonlySet<Permission>, confirmName?: string): Promise<void>`: cek `canDeleteEntry`. Tahap terkunci wajib `confirmName?.trim() === name`, kalau tidak `UserError("Ketik nama konten persis untuk menghapus")`.
  - Aturan nilai nonaktif (dicek di create dan update): orang, jenis, dan kanal pada baris **baru** atau baris yang **nilainya berubah** wajib aktif. Kalau tidak, `UserError("<Orang/Jenis/Kanal> sudah dinonaktifkan")`. Baris lama yang tidak berubah lolos. Orang wajib staf unit (peran selain direktur).
  - Entri tidak ada (update/delete) → `UserError("Entri tidak ditemukan")`.

- [ ] **Step 1: Tes gagal** di `planner.db.test.ts`. Seed per tes: satu manajer (lewat `createAccount` dari `@workspace/auth/accounts`), dua staf `sdm_khusus`, satu jenis penugasan, dua kanal. Kasus:
  - `createEntry` membuat 1 baris `content_card` tahap `ide` untuk entri itu; input tanpa kanal ditolak dan **tidak ada** baris entri yang tertinggal.
  - `updateEntry` mempertahankan id penugasan yang tidak berubah, menghapus yang dibuang, memberi id baru untuk baris `…-baru-0`; id penugasan milik entri lain ditolak.
  - Staf dinonaktifkan setelah entri dibuat: `updateEntry` dengan baris yang sama tetap sukses; menambah baris baru untuk staf itu ditolak "sudah dinonaktifkan". Hal yang sama untuk kanal nonaktif.
  - `deleteEntry` tahap `ide` oleh izin `sdm_strategi` sukses dan kartu ikut hilang. Setelah `update content_card set stage='review'`: izin `sdm_strategi` ditolak; izin `manajer` tanpa `confirmName` ditolak; dengan nama yang benar sukses.
  - `updateEntry`/`deleteEntry` untuk id yang tidak ada → "Entri tidak ditemukan".
  - `listEntriesInPeriod` dan `inPeriod` sepakat. Buat 5 entri (hanya kegiatan di periode, hanya penugasan lintas batas, hanya tayang hari Minggu, sepenuhnya sebelum periode, sepenuhnya sesudah periode). Id hasil query harus sama dengan `entries.filter(e => inPeriod(e, period))` dari `getEntry` setiap entri.
  - `listStaff` tidak memuat akun yang hanya direktur dan tidak memuat akun tanpa peran.
- [ ] **Step 2:** `createdb`/`itapp_test` sudah dimigrasi (Task 2), lalu `DATABASE_URL=postgres://itapp:itapp@localhost:5432/itapp_test pnpm --filter admin test` → FAIL. Tanpa URL uji, tes ini dilewati (skip) dan tes lain tetap PASS.
- [ ] **Step 3:** Tulis `schema.ts`, `UserError` + `guarded`, `queries.ts`, `mutations.ts`.
- [ ] **Step 4:** Perintah Step 2 → PASS. `pnpm --filter admin test` (tanpa URL uji) → PASS dengan tes DB di-skip. `pnpm typecheck` → bersih.
- [ ] **Step 5: Commit** `feat(admin): query dan mutasi planner dengan kartu ide`.

---

### Task 6: Halaman `/planner` (tiga tampilan)

Panggil `frontend-design:frontend-design` sebelum mulai.

**Files:**
- Create: `apps/admin/app/(app)/planner/page.tsx` (server)
- Create: `apps/admin/app/(app)/planner/loading.tsx`
- Create: `apps/admin/app/(app)/planner/_toolbar.tsx` (klien: tab, navigasi periode, Pekan/Bulan, sakelar "Pekerjaan saya saja", tombol "Entri baru")
- Create: `apps/admin/app/(app)/planner/_list-view.tsx` (klien, data-grid)
- Create: `apps/admin/app/(app)/planner/_calendar-view.tsx` (klien, event-calendar)
- Modify: `apps/admin/lib/menu.tsx` hanya bila tautan menu perlu disesuaikan (`/planner?tampilan=kalender|partisi` sudah benar)

**Interfaces:**
- Consumes: `requirePermission("planner.lihat")` (`@workspace/auth/session`); `parsePlannerParams`, `resolvePeriod`, `shiftPeriod`, `applyMyWork` (Task 3); `toListRows`, `toCalendarEvents`, `toPartitionRows`, `weekDays` (Task 4); `listEntriesInPeriod`, `listStaff` (Task 5); `PartitionGrid` dengan `href` (Task 4).
- Produces: `buildPlannerHref(params: PlannerParams, patch: Partial<PlannerParams>): string` di `apps/admin/lib/planner/rules.ts` (murni; tambahkan tesnya ke `rules.test.ts`: `saya` selalu ditulis eksplisit `1`/`0`, `rentang` hanya ditulis untuk `daftar`).

- [ ] **Step 1: Tes gagal** untuk `buildPlannerHref` di `rules.test.ts`:

```ts
it("buildPlannerHref menulis saya eksplisit dan rentang hanya untuk daftar", () => {
  const p = { tampilan: "kalender", tanggal: "2026-11-16", rentang: "pekan", saya: false } as const
  expect(buildPlannerHref(p, {})).toBe("/planner?tampilan=kalender&tanggal=2026-11-16&saya=0")
  expect(buildPlannerHref(p, { tampilan: "daftar", rentang: "bulan" }))
    .toBe("/planner?tampilan=daftar&tanggal=2026-11-16&rentang=bulan&saya=0")
})
```

- [ ] **Step 2:** `pnpm --filter admin test` → FAIL. Tulis `buildPlannerHref` → PASS.
- [ ] **Step 3: `page.tsx`.** Alurnya: `await searchParams` → `requirePermission("planner.lihat")` → `parsePlannerParams(sp, user.roles)` → `resolvePeriod` → `listEntriesInPeriod`. Kalau `saya`, terapkan `applyMyWork(entries, user.id, period)`. Lalu render toolbar dan satu tampilan:
  - Daftar: `toListRows` → `_list-view`. Kolom: Nama konten, Kegiatan, Penugasan, Kanal (badge), Tayang, Tahap (badge + ikon `CONTENT_STAGE_ICON`/`CONTENT_STAGE_LABEL`). Baris bisa diklik/dibuka dengan keyboard → `/planner/<id>`. Pakai i18n `DATA_GRID_I18N_ID`.
  - Kalender: `toCalendarEvents(entries, { myWorkUserId })` → `_calendar-view`. Props `view="days"`, `dayCount={7}`, `weekStartsOn={1}`, `date` = awal periode, `onDateChange` → `router.push(buildPlannerHref(..., { tanggal }))`. Juga `interactions={{ drag: false, resize: false }}`, `locale={id}`, `i18n={EVENT_CALENDAR_I18N_ID}`, `<EventCalendarNav showViewSwitcher={false} />`, dan `onEventClick` → `/planner/<entryId>`. `renderEvent` memberi event `tayang` ikon lucide dan warna `var(--primary)`; event tugas memakai satu warna token netral. Di HP (`useIsMobile`): `view="agenda"`, `agendaDayCount={7}`. Tinggi eksplisit pada root kalender.
  - Partisi: `toPartitionRows(staff, entries, period, { myWorkUserId })` + `weekDays` → `PartitionGrid`.
  - Kalau periode kosong: `Empty` dengan teks "Belum ada entri di periode ini", ditambah tombol "Entri baru" untuk pemilik `planner.ubah`.
  - `metadata.title = "Media Planner"`.
  - `loading.tsx`: `Skeleton` seukuran toolbar + area tampilan.
- [ ] **Step 4: `_toolbar.tsx`.** Tab berupa tautan `buildPlannerHref`. Tombol ‹/› memakai `shiftPeriod`, tombol "Hari ini" memakai `todayWib()`. Judul periode, mis. "16–22 Nov 2026" atau "November 2026". Pekan/Bulan hanya untuk Daftar. Sakelar `saya` (Switch + label). "Entri baru" → `/planner/baru` bila `canEdit`.
- [ ] **Step 5: Verifikasi manual** dengan `pnpm dev`, masuk sebagai manajer, dan beberapa entri contoh. Periksa:
  - ketiga tampilan, tombol ‹ › dan "Hari ini";
  - Pekan/Bulan di Daftar;
  - `saya=1`/`0`;
  - lebar 375px (kalender tampil sebagai agenda, partisi bisa digeser).
- [ ] **Step 6:** `pnpm lint && pnpm typecheck && pnpm --filter admin test` → bersih.
- [ ] **Step 7: Commit** `feat(admin): halaman planner daftar, kalender, partisi`.

---

### Task 7: Formulir entri dan hapus

**Files:**
- Create: `apps/admin/app/(app)/planner/actions.ts` (`"use server"`)
- Create: `apps/admin/app/(app)/planner/_entry-form.tsx` (klien)
- Create: `apps/admin/app/(app)/planner/_delete-entry.tsx` (klien)
- Create: `apps/admin/app/(app)/planner/baru/page.tsx`
- Create: `apps/admin/app/(app)/planner/[id]/page.tsx`

**Interfaces:**
- Consumes: `withPermission`, `getCurrentUser` (`@workspace/auth/session`); `guarded`, `CrudResult` (`@/lib/setting-crud`); `createEntry`, `updateEntry`, `deleteEntry`, `getEntry`, `listFormOptions`, `entryInputSchema` (Task 5); `canDeleteEntry`, `needsNameConfirm` (Task 3); `AssignmentRows` (domain).
- Produces:
  - `saveEntry(id: number | null, input: EntryInput): Promise<CrudResult & { id?: number }>`. Dibungkus `withPermission("planner.ubah")`. Kalau `id === null` → create, kalau tidak → update. Lalu `revalidatePath("/planner")` dan `revalidatePath("/planner/<id>")`.
  - `removeEntry(id: number, confirmName?: string): Promise<CrudResult>`. Dibungkus `withPermission("planner.ubah")`. Izin lengkap diambil dari `getCurrentUser()` lalu diteruskan ke `deleteEntry`. Setelah sukses, klien diarahkan ke `/planner`.

- [ ] **Step 1: Halaman `baru/page.tsx`.** Panggil `requirePermission("planner.ubah")` dan `listFormOptions()`, lalu render `_entry-form` kosong.
- [ ] **Step 2: Halaman `[id]/page.tsx`.**
  - `await params`, lalu `requirePermission("planner.lihat")`.
  - `getEntry(Number(id))`. Kalau id bukan angka atau entri tidak ada → `notFound()`.
  - `canEdit = user.permissions.has("planner.ubah")`.
  - Render `_entry-form` (baca saja bila `!canEdit`) dan badge tahap kartu.
  - Render `_delete-entry` bila `canDeleteEntry(user.permissions, entry.stage)`.
- [ ] **Step 3: `_entry-form.tsx`.** Isi kolom:
  - Nama: `Input`.
  - Rentang kegiatan: date picker rentang yang bisa dikosongkan, memakai pola `Calendar`+`Popover` yang sudah dipakai `AssignmentRows`, atau reui date-selector dengan `DATE_SELECTOR_I18N_ID`.
  - Penugasan: `AssignmentRows`. Pilihan orang/jenis hanya yang `active`, ditambah nilai yang sudah dipakai entri ini.
  - Kanal: pilihan ganda (checkbox group atau combobox multi; keputusan pembangun) berisi kanal aktif ditambah kanal entri ini.
  - Tanggal tayang.

  Validasi klien memakai `entryInputSchema.safeParse`, dengan galat per kolom lewat `Field`. Tombol Simpan memanggil `saveEntry`. Galat server ditampilkan di `Alert`, sukses di toast `sonner`. Entri baru → `router.push("/planner/<id>")`. Mode baca saja: semua kontrol `disabled`, tanpa tombol Simpan.
- [ ] **Step 4: `_delete-entry.tsx`.** `AlertDialog` peringatan bahwa kartu konten beserta filenya ikut terhapus. Bila `needsNameConfirm(stage)`, langkah kedua adalah `Input` "Ketik nama konten", dan tombol Hapus baru aktif saat isinya persis sama. Panggil `removeEntry`.
- [ ] **Step 5: Verifikasi manual** (`pnpm dev`):
  - buat entri → kartu `ide` ada di DB (`select * from content_card`);
  - ubah entri dengan menghapus satu baris dan menambah satu baris → id baris lain tetap;
  - sebagai SDM Khusus, halaman `[id]` baca saja dan tidak ada tombol Hapus;
  - setelah `update content_card set stage='review'`, sebagai SDM Strategi tidak ada tombol Hapus, sebagai Manajer ada konfirmasi dua langkah.
- [ ] **Step 6:** Skill `anthropic-skills:web-design-guidelines` pada `planner/**`, dan MCP reui `validate_usage` + `get_audit_checklist` untuk data-grid dan event-calendar. Perbaiki temuan.
- [ ] **Step 7:** `pnpm lint && pnpm typecheck && pnpm --filter admin test && pnpm build` → bersih.
- [ ] **Step 8: Commit** `feat(admin): formulir entri planner dan hapus bertahap`.

---

### Task 8: Verifikasi akses langsung

**Files:**
- Modify: `scripts/verify-access.sh`

- [ ] **Step 1:** Di blok "Tanpa sesi", tambahkan `/planner` → `/masuk`.
- [ ] **Step 2:** Di blok SDM Khusus, tambahkan:
  - `GET /planner` → `200`;
  - `GET /planner/baru` → `307 $BASE_URL/?akses=ditolak`.
- [ ] **Step 3:** Tambahkan blok opsional "Staf Unit Lain" dengan `VERIFY_OTHER_USERNAME`/`VERIFY_OTHER_PASSWORD`. Bila variabelnya diisi, cek `GET /planner` → ditolak. Bila tidak, blok dilewati dengan pesan `SKIP`.
- [ ] **Step 4:** Jalankan skrip terhadap `pnpm dev` dengan akun uji → semua `PASS`.
- [ ] **Step 5: Commit** `chore: verifikasi akses planner`.
