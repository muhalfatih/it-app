# Laporan Harian, Tugas dari Manajer, Absensi Minimal (Putaran 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staf unit mengisi laporan harian `/laporan` (T/TL per tugas dari Rutin, Planner, Tugas dari Manajer, dan input sendiri; Hambatan; Prioritas; Kirim). Laporan terkunci dan dibekukan pukul 10.00 WIB hari kerja berikutnya. Manajer memberi tugas di `/tugas`, membuka kunci di `/laporan/tim`, mengisi absensi `/absensi`, dan menandai hari libur `/absensi/libur`.

**Architecture:** Aturan murni (tanggal, daftar tugas, skor, status) di `apps/admin/lib/report/rules.ts`. Daftar tugas dihitung dari sumber setiap dibaca; hanya jawaban yang disimpan; hari yang lewat batas kunci dibekukan ke `daily_report.frozen` saat dibaca (`freezeDue`). Mutasi di `lib/{report,manager-task,attendance}/mutations.ts`, dipanggil aksi server tipis di folder route. Pola sama dengan Planner/Kanban.

**Tech Stack:** Next.js 16 (App Router, `params`/`searchParams` Promise), Drizzle + PostgreSQL, `@workspace/auth`, zod 4, date-fns, vitest 4.1.12, `@workspace/ui` (toggle-group, textarea, select, combobox, badge, reui badge, empty, alert, alert-dialog, field, calendar, reui data-grid, domain SettingList).

**Spec:** `docs/superpowers/specs/2026-11-19-laporan-harian-design.md`

## Global Constraints

- Semua perintah di WSL setelah `. ~/.nvm/nvm.sh`, dari root repo. Jangan pnpm dari Windows terhadap `\\wsl.localhost`.
- Baca panduan Next di `apps/admin/node_modules/next/dist/docs/` sebelum menulis halaman/aksi (AGENTS.md).
- Komponen hanya di `packages/ui`; `apps/admin` hanya halaman dan file perakitan `_*.tsx` di folder route. **Tidak ada komponen baru**; bila ternyata butuh, berhenti dan ajukan ke pengguna (nama + sumber).
- Warna hanya token `globals.css`. Tertunda = `@reui` Badge `warning-light`.
- Sebelum Task 8: skill `frontend-design:frontend-design`. Setelah Task 10: `anthropic-skills:web-design-guidelines`, MCP reui `validate_usage` + `get_audit_checklist` (data-grid).
- Tanggal `yyyy-MM-dd` (tipe `IsoDate` dari `lib/planner/types`), "hari ini" = `todayWib()` dari `lib/planner/rules`.
- Hari kerja: Senin–Sabtu, bukan `holiday`. Batas kunci: 10.00 WIB (= 03.00 UTC) hari kerja berikutnya.
- `REPORT_START_DATE = "2026-12-01"` di `lib/report/rules.ts` (placeholder; dikonfirmasi pengguna saat rilis).
- Kunci tugas: `rutin:<id>`, `planner:<id>`, `manajer:<id>`, `sendiri:<id>`. Status jawaban: `"T" | "TL"`.
- Staf pelapor: akun aktif yang punya izin `laporan.isi` (peran `manajer`, `sdm_strategi`, `sdm_khusus`).
- Validasi teks: judul tugas (manajer/sendiri) trim 2–120; catatan tugas ≤ 2000; Hambatan/Prioritas ≤ 2000; nama hari libur trim 2–80.
- Teks UI berbahasa Indonesia. Pesan: "Laporan sudah terkunci", "Tugas tidak ada di laporan hari ini", "Hari ini bukan hari laporan".
- Galat aksi lewat `guarded()`/`UserError` (`lib/setting-crud.ts`). Halaman tanpa `loading.tsx`; id tidak dikenal → `notFound()`.
- Setiap aksi git mengikuti bagian "Versioning" CLAUDE.md. Kerja di branch `feat/laporan-harian` dari `main`. Tidak ada push tanpa persetujuan pengguna.

## Review Focus

1. Laporan Sabtu terkunci Senin 10.00, dan bila Senin libur → Selasa 10.00; Sabtu libur tidak punya laporan. → tes di Task 3.
2. Staf menandai T kemarin (masih sebelum 10.00) pada tugas beberapa hari: tugas itu langsung hilang dari laporan hari ini tanpa menunggu pembekuan. → tes di Task 7.
3. Klik T lalu TL cepat (dua tab): jawaban terakhir menang, bukan galat PK ganda. → tes di Task 7.
4. Absensi Sakit setelah jawaban terisi, lalu dikembalikan ke Hadir: jawaban kembali utuh dan dihitung. → tes di Task 7.
5. Tanggal dari klien yang dimanipulasi (besok, hari Minggu, sebelum `REPORT_START_DATE`) ditolak di setiap aksi ubah. → tes di Task 7.

---

### Task 1: Izin buka kunci + branch

**Files:**
- Modify: `packages/auth/src/permissions.ts`
- Test: `packages/auth/src/permissions.test.ts`

**Interfaces:**
- Produces: `Permission` mencakup `"laporan.buka_kunci"`, hanya di `manajer`.

- [ ] **Step 0:** Buat branch `feat/laporan-harian` dari `main` (aturan Versioning). Commit spec + plan ini: `docs: rancangan dan rencana Laporan Harian putaran 1`.
- [ ] **Step 1: Tes gagal**: baris tabel `["laporan.buka_kunci", "M"]` di matriks yang ada, ditambah:

```ts
it("hanya Manajer yang boleh membuka kunci laporan", () => {
  expect(can(["manajer"], "laporan.buka_kunci")).toBe(true)
  for (const role of ["direktur", "sdm_strategi", "sdm_khusus"] as const)
    expect(can([role], "laporan.buka_kunci")).toBe(false)
})
```

- [ ] **Step 2:** `pnpm --filter @workspace/auth test` → FAIL.
- [ ] **Step 3:** Tambah `"laporan.buka_kunci"` setelah `"laporan.rekap.sendiri"` di `PERMISSIONS` dan ke daftar `manajer`.
- [ ] **Step 4:** Tes → PASS; `pnpm typecheck` → lulus.
- [ ] **Step 5:** Commit `feat(auth): izin buka kunci laporan harian`.

### Task 2: Skema + migrasi

**Files:**
- Create: `packages/db/src/schema/report.ts`
- Modify: `packages/db/src/schema/index.ts` (`export * from "./report"`)
- Create: `packages/db/drizzle/0005_*.sql` (hasil generate)

**Interfaces:**
- Produces (Drizzle), persis kolom spec bagian "Data":
  - `holiday` { date PK, name, createdAt };
  - `attendance` { userId → user cascade, date, status, updatedBy → user restrict, updatedAt; PK (userId, date) };
  - `managerTask` { id serial, title, note null, startDate, endDate, createdBy → user restrict, createdAt, updatedAt `$onUpdate` };
  - `managerTaskAssignee` { taskId → managerTask cascade, userId → user restrict; PK };
  - `selfTask` { id serial, userId → user cascade, date, title, createdAt; indeks (userId, date) };
  - `dailyReport` { userId → user cascade, date, obstacles text default "", priorities text default "", submittedAt null, submittedTasks jsonb null `$type<{key:string;title:string}[]>()`, unlockedAt null, unlockedBy → user null, frozen jsonb null `$type<FrozenReport>()`, frozenAt null, updatedAt; PK (userId, date) };
  - `dailyReportAnswer` { userId → user cascade, date, taskKey text, status text, updatedAt; PK (userId, date, taskKey) }.
  - Di `schema/stages.ts` (modul tanpa impor): `ATTENDANCE_STATUSES = ["hadir","izin","izin_kegiatan","sakit","tanpa_keterangan"] as const`, `type AttendanceStatus`, `ANSWER_STATUSES = ["T","TL"] as const`, `type AnswerStatus`, `TASK_SOURCES = ["rutin","planner","manajer","sendiri"] as const`, `type TaskSource`, `type FrozenReport = { tasks: { key: string; source: TaskSource; title: string; status: AnswerStatus | null; overdueDays: number }[]; obstacles: string; priorities: string }`.
- CHECK: `attendance.status` dan `daily_report_answer.status` di daftar konstanta (pola `content_card_stage_check`); `manager_task.end_date >= start_date`.

- [ ] **Step 1:** Tulis skema; `pnpm --filter @workspace/db db:generate` → `0005_*.sql` berisi tujuh `CREATE TABLE`, tanpa `ALTER`/`DROP` pada tabel lama.
- [ ] **Step 2:** `pnpm --filter @workspace/db db:migrate` ke DB dev dan DB `_test` → sukses; `pnpm typecheck` → lulus.
- [ ] **Step 3:** Commit `feat(db): skema laporan harian, tugas manajer, absensi, hari libur`.

### Task 3: Aturan tanggal laporan

**Files:**
- Create: `apps/admin/lib/report/rules.ts`
- Test: `apps/admin/lib/report/rules.test.ts`

**Interfaces:**
- Consumes: `IsoDate` (`lib/planner/types`), `todayWib` (`lib/planner/rules`).
- Produces:
  - `REPORT_START_DATE: IsoDate`
  - `isWorkday(date: IsoDate, holidays: ReadonlySet<IsoDate>): boolean`
  - `nextWorkday(date, holidays): IsoDate`
  - `lockDeadline(date, holidays): Date`, yaitu `nextWorkday` pukul 03.00Z
  - `firstReportDay(accountCreatedAt: Date): IsoDate` = max(`REPORT_START_DATE`, `todayWib(accountCreatedAt)`)
  - `isReportDay(date, holidays, first: IsoDate, today: IsoDate): boolean`: hari kerja ∧ first ≤ date ≤ today
  - `workdaysBetween(after: IsoDate, upTo: IsoDate, holidays): number`: jumlah hari kerja di (after, upTo]

- [ ] **Step 1: Tes gagal**, dengan `H = new Set(["2026-12-07"])` (Senin libur):
  - `isWorkday("2026-12-05", H)` (Sabtu) true; `"2026-12-06"` (Minggu) false; `"2026-12-07"` false
  - `lockDeadline("2026-12-05", H).toISOString()` → `"2026-12-08T03:00:00.000Z"` (Review Focus 1)
  - `lockDeadline("2026-12-02", new Set()).toISOString()` → `"2026-12-03T03:00:00.000Z"`
  - `lockDeadline("2026-12-05", new Set())` → `"2026-12-07T03:00:00.000Z"`
  - `firstReportDay(new Date("2026-11-01T00:00:00Z"))` → `REPORT_START_DATE`; `firstReportDay(new Date("2026-12-09T20:00:00Z"))` → `"2026-12-10"` (WIB)
  - `isReportDay("2026-12-03", H, "2026-12-01", "2026-12-02")` false (masa depan); `("2026-11-30", …)` false; `("2026-12-06", …)` false
  - `workdaysBetween("2026-12-04", "2026-12-08", H)` → 2 (Sabtu 5, Selasa 8)
- [ ] **Step 2:** `pnpm --filter admin test lib/report/rules` → FAIL.
- [ ] **Step 3:** Implementasi dengan date-fns `parseISO`/`addDays`/`getDay`.
- [ ] **Step 4:** Tes → PASS.
- [ ] **Step 5:** Commit `feat(admin): aturan tanggal laporan harian`.

### Task 4: Aturan daftar tugas, skor, status

**Files:**
- Modify: `apps/admin/lib/report/rules.ts`
- Test: `apps/admin/lib/report/rules.test.ts`

**Interfaces:**
- Consumes: Task 3; `TaskSource`, `AnswerStatus`, `AttendanceStatus` (Task 2).
- Produces:
  - `type RangeSource = { id: number; title: string; startDate: IsoDate; endDate: IsoDate }`
  - `type ReportTask = { key: string; source: TaskSource; title: string; overdueDays: number }`
  - `taskKey(source: TaskSource, id: number): string`
  - `tasksForDay(input: { date: IsoDate; routine: { id: number; title: string }[]; planner: RangeSource[]; manager: RangeSource[]; self: { id: number; title: string }[]; tuntasBefore: ReadonlySet<string>; holidays: ReadonlySet<IsoDate> }): ReportTask[]`. Urutan: rutin (urutan input) → planner → manajer → sendiri; planner/manajer muncul bila `startDate ≤ date` ∧ kunci ∉ `tuntasBefore` ∧ (`date ≤ endDate` ∨ lewat = Tertunda); `overdueDays = date > endDate ? workdaysBetween(endDate, date) : 0`.
  - `type DayScore = { done: number; total: number; bySource: Record<TaskSource, { done: number; total: number }> }`
  - `dayScore(tasks: { key: string; source: TaskSource }[], answers: ReadonlyMap<string, AnswerStatus>): DayScore`
  - `needsUpdate(submitted: { key: string; title: string }[] | null, current: ReportTask[]): boolean`: true bila `submitted` tidak null dan himpunan `key|title` berbeda.
  - `type ReportState = "libur" | "bukan_hari_laporan" | "disembunyikan" | "terbuka" | "dikirim" | "perlu_diperbarui" | "terkunci"`
  - `reportState(i: { workday: boolean; inRange: boolean; attendance: AttendanceStatus | null; frozen: boolean; editable: boolean; submitted: boolean; stale: boolean }): ReportState`. Urutan prioritas: libur → bukan_hari_laporan → disembunyikan (attendance bukan null dan bukan `hadir`) → terkunci (frozen atau !editable) → perlu_diperbarui → dikirim → terbuka.
  - `isEditable(i: { date: IsoDate; holidays: ReadonlySet<IsoDate>; now: Date; unlocked: boolean; frozen: boolean }): boolean` = `!frozen && (unlocked || now < lockDeadline(date, holidays))`
  - `scoreLabel(s: DayScore): string | null`: `null` bila total 0; selain itu `"6 dari 11 tuntas · 54,5%"` (satu desimal, koma, `Intl.NumberFormat("id-ID")`).

- [ ] **Step 1: Tes gagal**, dengan tanggal Desember 2026 dan `H = new Set()`:
  - planner `{id:1, startDate:"2026-12-01", endDate:"2026-12-02"}` muncul 1 dan 2 Des dengan `overdueDays` 0; 4 Des (tanpa T) muncul dengan `overdueDays` 2; dengan `tuntasBefore = new Set(["planner:1"])` pada 3 Des tidak muncul; sebelum `startDate` tidak muncul
  - manajer dengan `startDate` digeser ke 5 Des tidak muncul pada 3 Des
  - urutan kunci `["rutin:1","planner:1","manajer:1","sendiri:1"]`
  - `dayScore` untuk 4 rutin + 5 planner + 2 manajer, 6 T dan 1 TL → `done 6, total 11`, `bySource.planner.total 5`; `scoreLabel` → `"6 dari 11 tuntas · 54,5%"`; total 0 → `null`
  - `needsUpdate(null, x)` false; judul sama → false; judul berubah / tugas tambah / tugas hilang → true
  - `reportState`: Sakit → `disembunyikan` walau frozen; libur → `libur`; frozen + submitted → `terkunci`; editable + submitted + stale → `perlu_diperbarui`
  - `isEditable`: `now` 4 Des 02.59Z untuk tanggal 3 Des → true; 03.00Z → false; `unlocked` → true; `frozen` + `unlocked` → false
- [ ] **Step 2:** Tes → FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Tes → PASS.
- [ ] **Step 5:** Commit `feat(admin): aturan daftar tugas, skor, dan status laporan`.

### Task 5: Absensi minimal & hari libur (mutasi + halaman)

**Files:**
- Create: `apps/admin/lib/report/queries.ts` (hanya `listReporters` di task ini)
- Create: `apps/admin/lib/attendance/mutations.ts`, `apps/admin/lib/attendance/queries.ts`
- Create: `apps/admin/app/(app)/absensi/page.tsx`, `_attendance-table.tsx`, `actions.ts`
- Create: `apps/admin/app/(app)/absensi/libur/page.tsx`, `actions.ts`
- Test: `apps/admin/lib/attendance/attendance.db.test.ts` (guard `TEST_DB` dan `mk()` dari `lib/planner/planner.db.test.ts`)

**Interfaces:**
- Produces:
  - `listReporters(): Promise<{ id: string; name: string; createdAt: Date }[]>`: akun aktif dengan peran `manajer`/`sdm_strategi`/`sdm_khusus`, urut nama, distinct.
  - `listHolidays(from?: IsoDate, to?: IsoDate): Promise<{ date: IsoDate; name: string }[]>`; `holidaySet(from, to): Promise<Set<IsoDate>>`
  - `attendanceFor(date: IsoDate): Promise<Map<string, AttendanceStatus>>`; `attendanceOf(userId, from, to): Promise<Map<IsoDate, AttendanceStatus>>`
  - `setAttendance(actorId: string, userId: string, date: IsoDate, status: AttendanceStatus): Promise<void>`: upsert; tolak bila `date > todayWib()`, hari libur, Minggu, atau `userId` bukan staf pelapor.
  - `addHoliday(date, name)`, `deleteHoliday(date)`: tanggal ganda → `UserError("Tanggal sudah ditandai libur")`.

- [ ] **Step 1: Tes gagal**:
  - `setAttendance` dua kali (Sakit lalu Hadir) → satu baris berstatus `hadir`;
  - tanggal besok, Minggu, dan hari libur ditolak;
  - Direktur sebagai `userId` ditolak;
  - `addHoliday` ganda → pesan di atas;
  - `listReporters` tidak memuat Direktur, Staf Unit Lain, maupun akun nonaktif.
- [ ] **Step 2:** `pnpm --filter admin test lib/attendance` (dengan `DATABASE_URL` `_test`) → FAIL.
- [ ] **Step 3:** Implementasi mutasi/query.
- [ ] **Step 4:** Tes → PASS.
- [ ] **Step 5:** Halaman, semua `requirePermission("absensi.isi")`:
  - `/absensi?tanggal=` (default hari ini; parse lewat `validDate` pola Planner, atau ekspor ulang dari `lib/planner/rules`) menampilkan navigasi tanggal dan tabel `listReporters` dengan `Select` status per orang. Kosong = "Hadir (default)". Hari libur/Minggu → `Alert` dan select dimatikan.
  - `/absensi/libur` memakai domain `SettingList` bila API-nya menampung kolom tanggal; bila tidak, pakai `Table` + `Field` (Input type date, nama) + `AlertDialog` hapus.
  - Aksi tipis lewat `withPermission("absensi.isi", …)` + `guarded`.
- [ ] **Step 6:** `pnpm lint && pnpm typecheck && pnpm --filter admin test` lulus. Commit `feat(admin): absensi minimal dan hari libur`.

### Task 6: Tugas dari Manajer (mutasi + query)

**Files:**
- Create: `apps/admin/lib/manager-task/schema.ts`, `mutations.ts`, `queries.ts`
- Test: `apps/admin/lib/manager-task/manager-task.db.test.ts`

**Interfaces:**
- Consumes: `listReporters` (Task 5).
- Produces:
  - `managerTaskSchema` (zod): `{ title, note?, startDate, endDate, assigneeIds: string[] (min 1, "Pilih minimal satu staf") }`, dengan `endDate ≥ startDate` ("Tanggal selesai harus setelah tanggal mulai"); `type ManagerTaskInput`.
  - `createManagerTask(actorId, input): Promise<{ id: number }>`, `updateManagerTask(id, input)`, `deleteManagerTask(id)`: satu transaksi; penerima diganti sebagai himpunan; penerima wajib staf pelapor aktif (`UserError("Staf tidak valid")`).
  - `listManagerTasks(): Promise<ManagerTaskRow[]>` dengan `ManagerTaskRow = { id; title; note: string | null; startDate; endDate; assignees: { id: string; name: string; done: boolean }[] }`. `done` = ada jawaban `T` untuk `manajer:<id>` dari orang itu. Urut `startDate` menurun.
  - `getManagerTask(id): Promise<ManagerTaskRow | null>`
  - `managerTasksFor(userId, date): Promise<RangeSource[]>`: tugas dengan penerima itu dan `startDate ≤ date` (yang lewat juga, untuk Tertunda).

- [ ] **Step 1: Tes gagal**:
  - membuat tugas untuk dua staf → keduanya mendapatnya di `managerTasksFor`;
  - update mengganti penerima dan yang dikeluarkan tidak lagi mendapatnya;
  - penerima Direktur atau akun nonaktif ditolak;
  - `endDate < startDate` ditolak;
  - hapus → hilang dari `managerTasksFor`;
  - `done` true setelah ada baris `daily_report_answer` T.
- [ ] **Step 2:** Tes → FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Tes → PASS.
- [ ] **Step 5:** Commit `feat(admin): data dan mutasi Tugas dari Manajer`.

### Task 7: Laporan: muat hari, jawaban, kirim, bekukan, buka kunci

**Files:**
- Modify: `apps/admin/lib/report/queries.ts`
- Create: `apps/admin/lib/report/mutations.ts`, `apps/admin/lib/report/freeze.ts`
- Test: `apps/admin/lib/report/report.db.test.ts`

**Interfaces:**
- Consumes: Task 3–6; `plannerAssignment` (judul "Jenis — Nama konten" lewat join `task_type` + `planner_entry`), `routineTask` aktif urut `sortOrder`.
- Produces:
  - `type DayView = { date: IsoDate; state: ReportState; tasks: (ReportTask & { status: AnswerStatus | null })[]; obstacles: string; priorities: string; score: DayScore; deadline: Date; editable: boolean; unlocked: boolean }`
  - `loadDay(userId: string, date: IsoDate, now?: Date): Promise<DayView>`: memakai `frozen` bila ada; selain itu menghitung `tasksForDay`. `tuntasBefore` = kunci dengan jawaban `T` pada tanggal < `date` (semua hari, termasuk yang disembunyikan absensi).
  - `freezeDue(userIds: string[], now?: Date): Promise<number>`: membekukan setiap hari laporan yang lewat batas, tidak sedang dibuka kuncinya (`unlockedAt` null), dan `frozen` null, dimulai dari hari setelah `frozenAt` terbaru orang itu (atau `firstReportDay`). Mengembalikan jumlah hari yang dibekukan.
  - `setAnswer(userId, date, key, status)`, `saveNotes(userId, date, obstacles, priorities)`, `addSelfTask(userId, date, title): Promise<{ id: number }>`, `renameSelfTask(userId, id, title)`, `deleteSelfTask(userId, id)`, `submitReport(userId, date)`. Semuanya lewat satu penjaga `assertWritable(userId, date, now)`: hari laporan, tidak libur, absensi bukan non-Hadir, `isEditable` (jika gagal → pesan Global Constraints). `setAnswer` juga menolak kunci yang tidak ada di daftar terkini. Upsert memakai `onConflictDoUpdate`.
  - `deleteSelfTask` juga menghapus baris jawaban `sendiri:<id>`, dalam satu transaksi.
  - `submitReport`: isi `submittedAt` dan `submittedTasks`; bila batas sudah lewat (sedang dibuka kuncinya) → bekukan sekarang dan kosongkan `unlockedAt`.
  - `unlockReport(actorId, userId, date)`: hanya bila `frozen` tidak null (`UserError("Laporan belum terkunci")`); kosongkan `frozen`/`frozenAt`, isi `unlockedAt`/`unlockedBy`.
  - `listTeamDay(date: IsoDate, now?: Date): Promise<{ user: { id: string; name: string }; state: ReportState; score: DayScore }[]>` untuk `/laporan/tim`.

- [ ] **Step 1: Tes gagal** (waktu `now` disuntikkan; buat entri lewat `createEntry` Planner):
  - laporan berisi rutin, planner, manajer, dan sendiri dengan urutan yang benar;
  - `setAnswer` T lalu TL berturut-turut → satu baris TL (Review Focus 3);
  - T kemarin pada tugas planner beberapa hari (`now` sebelum 10.00) → `loadDay` hari ini tidak memuatnya (Review Focus 2);
  - absensi Sakit → state `disembunyikan` dan `setAnswer` ditolak; kembali Hadir → jawaban lama ada (Review Focus 4);
  - `setAnswer` untuk besok, Minggu, sebelum `REPORT_START_DATE`, dan kunci asing ditolak (Review Focus 5);
  - lewat batas → `freezeDue` membekukan; lalu menghapus entri Planner tidak mengubah `loadDay` hari itu; `setAnswer` ditolak "Laporan sudah terkunci";
  - hari tanpa jawaban sama sekali dibekukan dengan skor 0/total;
  - `unlockReport` → `setAnswer` diterima → `submitReport` → beku lagi dan `unlockedAt` null; `freezeDue` melewati laporan yang sedang dibuka kuncinya;
  - `submitReport`, lalu `updateManagerTask` mengganti judul → state `perlu_diperbarui`; kirim ulang → `dikirim`;
  - `deleteSelfTask` milik orang lain ditolak.
- [ ] **Step 2:** Tes → FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Tes → PASS.
- [ ] **Step 5:** Commit `feat(admin): muat, isi, kirim, bekukan, dan buka kunci laporan harian`.

### Task 8: Halaman `/tugas`

**Files:**
- Create: `apps/admin/app/(app)/tugas/page.tsx`, `_task-list.tsx`, `_task-form.tsx`, `_delete-task.tsx`, `actions.ts`
- Create: `apps/admin/app/(app)/tugas/baru/page.tsx`, `apps/admin/app/(app)/tugas/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 6 (`listManagerTasks`, `getManagerTask`, mutasi, `managerTaskSchema`), `listReporters`.

- [ ] **Step 1:** Skill `frontend-design:frontend-design` untuk modul ini (berlaku untuk Task 8–10). Baca `planner/_entry-form.tsx` dan `planner/_list-view.tsx` sebagai pola.
- [ ] **Step 2:** `/tugas` (`requirePermission("tugas_manajer.kelola")`) menampilkan `@reui` data-grid (judul, staf dengan badge ✓ bila `done`, rentang "1–5 Des", catatan terpotong), tombol "Beri tugas", dan `Empty` bila kosong. Klik baris → `/tugas/[id]`.
- [ ] **Step 3:** Formulir halaman penuh (baru & ubah): `Field` + `Input` judul, `combobox` multi untuk staf (dari `listReporters`), date picker rentang (pola Planner), `Textarea` catatan, galat per kolom dari zod. `/tugas/[id]` punya Hapus dengan `AlertDialog`. Id tidak ada → `notFound()`. Aksi: `withPermission("tugas_manajer.kelola", …)` + `guarded("/tugas", …)`, `revalidatePath("/laporan")`.
- [ ] **Step 4:** `pnpm dev`: buat, ubah, dan hapus tugas untuk dua staf; tampilan 375 px terpakai.
- [ ] **Step 5:** `pnpm lint && pnpm typecheck` lulus. Commit `feat(admin): halaman Tugas dari Manajer`.

### Task 9: Halaman `/laporan`

**Files:**
- Create: `apps/admin/app/(app)/laporan/page.tsx`, `_report-form.tsx`, `_day-nav.tsx`, `actions.ts`

**Interfaces:**
- Consumes: Task 7 (`loadDay`, `freezeDue`, semua mutasi), `scoreLabel`, `lockDeadline`.

- [ ] **Step 1:** `page.tsx`: `requirePermission("laporan.isi")`, baca `?tanggal=` (default `todayWib()`), panggil `freezeDue([user.id])`, lalu `loadDay`. Tata letak sesuai sketsa spec bagian "Halaman":
  - tiga bagian (Tugas Rutin, Planner, Tugas Lain), dan bagian kosong disembunyikan;
  - badge "dari Manajer" / "input sendiri";
  - "Tertunda N hari" (`warning-light`);
  - badge status dari `ReportState`;
  - "Batas pengisian: Kamis, 20 Nov pukul 10.00".
- [ ] **Step 2:** `_report-form.tsx` (client):
  - T/TL memakai `ToggleGroup` tunggal per tugas (target ≥ 44 px), simpan per klik dengan state optimistis dan toast galat yang mengembalikan nilai lama;
  - Hambatan/Prioritas memakai `Textarea`, disimpan saat blur;
  - tambah/ubah/hapus tugas sendiri inline (`Input` + tombol, hapus dengan `AlertDialog`);
  - skor dari `scoreLabel`;
  - tombol Kirim/"Kirim ulang" lengket di bawah layar di HP;
  - semuanya dimatikan bila `!editable`.
- [ ] **Step 3:** `_day-nav.tsx`: ‹ › melompat ke hari laporan sebelumnya/berikutnya (tidak melewati hari ini) dan tombol "Hari ini". State `libur`/`disembunyikan`/`bukan_hari_laporan` → `Empty` berpenjelasan; `terkunci` → baca saja + "Terkunci, hubungi Manajer untuk membuka".
- [ ] **Step 4:** Aksi: `withPermission("laporan.isi", …)`, `userId` selalu dari sesi (tidak pernah dari klien), `guarded("/laporan", …)`.
- [ ] **Step 5:** `pnpm dev`:
  - isi laporan dengan tugas dari keempat sumber, lalu Kirim;
  - Manajer mengubah judul tugas → muncul "Perlu diperbarui";
  - laporan kemarin bisa diisi sebelum 10.00;
  - hari libur tampil kosong;
  - tampilan 375 px terpakai.
- [ ] **Step 6:** `pnpm lint && pnpm typecheck` lulus. Commit `feat(admin): halaman isi laporan harian`.

### Task 10: Halaman `/laporan/tim` + menu

**Files:**
- Create: `apps/admin/app/(app)/laporan/tim/page.tsx`, `_team-table.tsx`, `actions.ts`
- Create: `apps/admin/app/(app)/laporan/tim/[userId]/page.tsx`
- Modify: `apps/admin/lib/menu.tsx` (URL "Rekap tim" → `/laporan/tim`)

**Interfaces:**
- Consumes: `listTeamDay`, `freezeDue`, `loadDay`, `unlockReport`, `listReporters`.

- [ ] **Step 1:** `/laporan/tim?tanggal=` (`requirePermission("laporan.rekap.semua")`):
  - `freezeDue(semua reporter)`, lalu tabel nama, badge status, dan skor (`scoreLabel` atau "—");
  - tombol **Buka kunci** hanya bila `user.permissions.has("laporan.buka_kunci")` dan state `terkunci`, dengan konfirmasi `AlertDialog`;
  - navigasi tanggal memakai `_day-nav` (impor dari `../_day-nav`).
- [ ] **Step 2:** `/laporan/tim/[userId]?tanggal=` menampilkan `loadDay` orang itu dalam mode baca saja (pakai ulang `_report-form` dengan `readOnly`). `userId` bukan reporter → `notFound()`.
- [ ] **Step 3:** Aksi `unlock` lewat `withPermission("laporan.buka_kunci", …)`; `actorId` dari sesi.
- [ ] **Step 4:** Ubah menu; `pnpm dev`: Manajer membuka kunci laporan kemarin → staf bisa mengisi → Kirim → terkunci lagi. Direktur melihat tabel tanpa tombol Buka kunci.
- [ ] **Step 5:** Skill `anthropic-skills:web-design-guidelines` pada `laporan/**`, `tugas/**`, `absensi/**`; MCP reui `validate_usage` + `get_audit_checklist` (data-grid); perbaiki temuan.
- [ ] **Step 6:** `pnpm lint && pnpm typecheck && pnpm --filter admin test` lulus. Commit `feat(admin): laporan tim dan buka kunci`.

### Task 11: Verifikasi akses langsung

**Files:**
- Modify: `scripts/verify-access.sh`

- [ ] **Step 1:** Tambah `/laporan`, `/laporan/tim`, `/tugas`, dan `/absensi` ke daftar "Tanpa sesi → /masuk". Setelah login:
  - SDM Khusus: `GET /laporan` → 200; `/laporan/tim`, `/tugas`, `/absensi`, `/absensi/libur` → `307 …/?akses=ditolak`;
  - Staf Unit Lain: `/laporan` → ditolak;
  - bila skrip punya akun Direktur: `/laporan` ditolak, `/laporan/tim` → 200.
- [ ] **Step 2:** Jalankan skrip terhadap `pnpm dev` → semua PASS.
- [ ] **Step 3:** Commit `chore: verifikasi akses Laporan Harian`.
