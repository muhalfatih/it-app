# Manajemen Konten (Kanban) — Putaran 1: Papan, Alur, Tayang, Riwayat, Komentar

Tanggal: 17 November 2026 · Acuan: spesifikasi §6 (Manajemen Konten), §4.5–4.6 (hapus/ubah entri), §3.3 (matriks akses); PRD §5, §9 butir #2–#4, §10; spec Media Planner (`2026-11-16-media-planner-design.md`).

## Tujuan

Kartu Konten yang sudah dibuat otomatis oleh Planner (tahap Ide) kini bisa dijalankan lewat alur persetujuan berjenjang **Ide → Draft → Review → Disetujui → Telah Tayang**, dengan wewenang per perpindahan, pengembalian berisi catatan revisi, centang Tayang per kanal, riwayat, dan komentar. Satu tempat bagi seluruh unit (termasuk Direktur) untuk melihat posisi setiap konten dan siapa yang memutuskan apa.

**Bukan tujuan putaran ini:**

- **Putaran 2 (file):** thumbnail, foto/video/dokumen, pemutar review, penghapusan file saat entri dihapus (§4.5). Keputusan yang sudah diambil untuk putaran 2: semua file di **MinIO di server ini**; batas **500 MB per file**; format **MP4, MOV, JPG, PNG, WEBP**; plus opsi **sematan dari penyedia lain** (YouTube, Google Drive, dan sejenisnya). Rancangan rinci putaran 2 dibuat terpisah.
- Notifikasi perpindahan/komentar: modul Notifikasi.
- Filter "Pekerjaan saya saja" di papan: tidak diminta. *Keputusan pembangun*; mudah ditambah karena data penugasan sudah dimuat.
- Pengurutan manual kartu di dalam kolom.

**Anti-tujuan:**

- Wewenang yang hanya menyembunyikan tombol atau menolak seretan di klien. Setiap aksi diperiksa ulang di server.
- Kartu berpindah tanpa jejak di riwayat.
- Pengembalian tanpa catatan revisi.
- Isi kartu bisa diubah di tahap Review ke atas.
- Dua orang memindahkan kartu yang sama bersamaan lalu salah satunya diam-diam menimpa yang lain.
- Kartu Telah Tayang yang ternyata masih punya kanal belum tercentang (atau sebaliknya: semua tercentang tapi tertahan di Disetujui).

## Keputusan pengguna

| Topik | Keputusan |
| --- | --- |
| Pembagian | Dua putaran: (1) papan & alur, (2) file MinIO + sematan. |
| File (putaran 2) | MinIO di server ini, 500 MB/file, MP4/MOV/JPG/PNG/WEBP, opsi sematan YouTube/Google Drive/lainnya. |
| PRD #3 | **Manajer juga boleh** Ide → Draft. |
| PRD #4 | **Manajer boleh membatalkan** centang Tayang; tercatat di riwayat; kartu Telah Tayang kembali ke Disetujui. |
| Alur & wewenang | Disetujui sesuai tabel "Wewenang" di bawah. |
| Papan | Semua tahap aktif tampil penuh; **Telah Tayang hanya 30 hari terakhir** + tautan "lihat semua". |
| Pendekatan | **A**: mengikuti pola Planner (aturan murni + aksi server + halaman detail). |

## Approaches

1. **Pola Planner: aturan murni + aksi server + papan `@reui/kanban` + halaman detail `/konten/[id]`**: dipilih. Pola sudah teruji di repo, izin selalu di server, tanpa dependensi baru; putaran 2 tinggal menambah bagian di halaman detail. Halaman detail bisa dibagikan lewat tautan dan nyaman di HP.
2. **Detail di Sheet di atas papan**: ditolak. Sempit di HP untuk riwayat, komentar, dan pemutar video nanti; kartu tidak punya tautan sendiri.
3. **Pustaka state machine (XState)**: ditolak. Dependensi baru untuk lima tahap yang cukup ditulis sebagai satu tabel aturan.

## Rancangan

### Wewenang

**Maju** (tidak butuh catatan):

| Perpindahan | Izin |
| --- | --- |
| Ide → Draft | `kanban.ide_ke_draft` (SDM Strategi, **Manajer**) |
| Draft → Review | `kanban.draft_ke_review` (Manajer) |
| Review → Disetujui | `kanban.review_ke_disetujui` (Direktur) |
| Disetujui → Telah Tayang | **otomatis** saat semua kanal tercentang; tidak bisa dipindah langsung |

**Kembali satu tahap** (catatan revisi **wajib**). Yang boleh mengembalikan = pemegang izin yang memajukan kartu ke tahap sekarang:

| Perpindahan | Izin |
| --- | --- |
| Draft → Ide | `kanban.ide_ke_draft` |
| Review → Draft | `kanban.draft_ke_review` |
| Disetujui → Review | `kanban.review_ke_disetujui` |
| Telah Tayang → Disetujui | hanya lewat **batal centang** kanal (`kanban.batal_tayang`, alasan wajib) |

Pengembalian Disetujui → Review hanya diizinkan bila **belum ada kanal tercentang**. Bila sudah ada, Manajer membatalkan centangnya dulu. *Keputusan pembangun*; mencegah link tayang hilang diam-diam.

**Perubahan izin** (`packages/auth/src/permissions.ts` + tesnya):

- `kanban.ide_ke_draft` ditambahkan ke `manajer` (PRD #3).
- Izin baru `kanban.batal_tayang`, hanya `manajer` (PRD #4).
- Komentar memakai `kanban.lihat` (semua peran unit, termasuk Direktur).

### Data (`packages/db/src/schema/kanban.ts` baru + perubahan `content_card`)

- **`content_card`** ditambah: `caption` text null; `stage_changed_at` timestamptz wajib default now (diisi setiap tahap berubah; dipakai batas 30 hari Telah Tayang); `updated_at`.
- **`content_card_event`** (riwayat): `id` serial; `card_id` → kartu (cascade); `kind` text: `maju` | `kembali` | `centang` | `batal_centang` | `otomatis` | `catatan_sistem`; `from_stage`, `to_stage` text null (CHECK nilai `CONTENT_STAGES`); `channel_id` → channel null (restrict); `note` text null; `actor_id` → user (restrict, wajib: orang yang memicu, termasuk untuk kejadian otomatis); `created_at`. CHECK: `kembali` dan `batal_centang` wajib `note`. Indeks `(card_id, created_at)`.
- **`content_card_comment`**: `id` serial; `card_id` → kartu (cascade); `author_id` → user (restrict); `body` text wajib (1–2000 karakter, zod); `created_at`. Tidak bisa diedit/dihapus.
- **`content_card_publication`** (centang Tayang): PK (`card_id` cascade, `channel_id` restrict); `url` text null; `checked_by` → user; `checked_at`. Batal centang = hapus baris (jejaknya di riwayat).
- Daftar kanal kartu **selalu** = `planner_entry_channel` entrinya; publikasi hanya untuk kanal yang masih ada di entri.
- Hapus entri: semua tabel baru ikut terhapus lewat cascade. Tidak ada perubahan di `deleteEntry` putaran ini.

### Logika murni (`apps/admin/lib/kanban/rules.ts`, tes vitest)

- `allowedMoves(permissions, stage, { publishedCount })` → `{ forward?: ContentStage; back?: ContentStage }`. Dipakai papan (target seretan), halaman detail (tombol), dan aksi server (penegakan).
- `canEditContent(permissions, stage)`: `kanban.isi` dan tahap `ide`/`draft`.
- `canCheck(permissions, stage)`: `kanban.tayang` dan tahap `disetujui`.
- `canUncheck(permissions, stage)`: `kanban.batal_tayang` dan tahap `disetujui`/`tayang`.
- `isFullyPublished(channelIds, publications)`: semua kanal entri punya publikasi.
- `publishUrlError(requiresLink, url)`: kanal "Wajib link" butuh URL `http(s)` yang valid; kanal lain boleh kosong (link opsional tetap disimpan bila diisi).
- Batas 30 hari Telah Tayang disaring di SQL query papan (`stage_changed_at >= now() - interval '30 days'`), dites di tes integrasi. *Keputusan pembangun.*

### Aksi server (`apps/admin/lib/kanban/mutations.ts` + `app/(app)/konten/actions.ts`)

Semua: `requirePermission(...)`, validasi zod, **satu transaksi**, pola galat `guarded()`, lalu `revalidatePath("/konten")`, path kartu, dan `/planner` (badge tahap).

- `moveCard(cardId, fromStage, toStage, note?)`: periksa `allowedMoves`; mundur wajib `note`. Update `content_card ... WHERE id = ? AND stage = fromStage`; 0 baris → galat "Kartu sudah dipindah orang lain, muat ulang." (penanda konkurensi, *keputusan pembangun*). Catat event `maju`/`kembali`.
- `saveCaption(cardId, caption)`: `canEditContent` diperiksa terhadap tahap terbaru di DB.
- `checkChannel(cardId, channelId, url?)`: `canCheck`, kanal harus milik entri, `publishUrlError`. Insert publikasi + event `centang`. Bila `isFullyPublished` → tahap `tayang` + event `otomatis`.
- `uncheckChannel(cardId, channelId, reason)`: `canUncheck`, alasan wajib. Hapus publikasi + event `batal_centang`. Bila tahap `tayang` → `disetujui` + event `otomatis`.
- `addComment(cardId, body)`: `kanban.lihat`.

**Perubahan di `updateEntry` Planner** (dalam transaksi yang sama, §4.6):

- Kanal dihapus dari entri → publikasi kanal itu dihapus. Bila kartu `disetujui` dan sisa kanal kini semua tercentang → `tayang` + event `otomatis` ("Kanal dihapus dari Planner").
- Kanal ditambah ke entri yang kartunya `tayang` → kembali `disetujui` + event `otomatis` ("Kanal ditambah di Planner").
- Nama berubah saat kartu `disetujui`/`tayang` → event `catatan_sistem` "Diubah setelah disetujui" (nama lama → baru).
- Jadwal/penugasan tidak memindahkan kartu (sudah begitu).

### Halaman

**`/konten`** (`requirePermission("kanban.lihat")`; URL sudah ada di `apps/admin/lib/menu.tsx`):

```
Manajemen Konten
┌ Ide (4) ─┐┌ Draft (2) ┐┌ Review (1) ┐┌ Disetujui (3) ┐┌ Telah Tayang (5) ┐
│ [kartu]  ││ [kartu]   ││ [kartu 🔒] ││ [kartu 2/3 ✓] ││ [kartu]          │
│ [kartu]  ││           ││            ││               ││ Lihat semua →    │
└──────────┘└───────────┘└────────────┘└───────────────┘└──────────────────┘
```

- `@reui/kanban` (pola `c-kanban-3`/`c-kanban-4` di `packages/ui/src/components/examples/`) dengan domain `ContentCard`. Urutan dalam kolom: tanggal tayang naik, lalu nama.
- Kartu Disetujui menampilkan progres centang (mis. "2/3 kanal"). Tahap Review ke atas memakai `locked`. Perubahan kecil `ContentCard` di `packages/ui/src/components/domain/content-card.tsx`.
- Seretan: kolom tujuan yang tidak ada di `allowedMoves` ditolak di klien. Maju → panggil `moveCard` (optimistis, kembali ke posisi semula + toast bila server menolak). Mundur → `Dialog` catatan revisi dulu. Seret ke/dari Telah Tayang selalu ditolak (lewat centang). Pengurutan dalam kolom diabaikan.
- Klik kartu → `/konten/[id]`.
- Telah Tayang: hanya `stage_changed_at` ≤ 30 hari; tautan "Lihat semua" → `/konten?tayang=semua`.
- Kolom kosong → keterangan singkat di kolom (bukan `Empty` besar).
- HP: kolom digeser horizontal; seretan dimatikan di HP (`useIsMobile`), perpindahan lewat halaman detail.

**`/konten/[id]`** (`kanban.lihat`; id tidak ada → `notFound()`):

```
← Manajemen Konten
Video Profil Sekolah                       [Review 🔒]
[Kembalikan ke Draft]  [Setujui → Disetujui]          (sesuai allowedMoves)
── Data Planner (baca saja) ── Tayang 19 Nov · Kanal YT IG · Penugasan … · Buka di Planner →
── Caption ── textarea + Simpan (terkunci sejak Review)
── Tayang per kanal ── (tahap Disetujui/Telah Tayang)
   [✓] YouTube   https://youtu.be/…   oleh Sari, 12 Nov 14.20   [Batalkan]
   [ ] Instagram  [link wajib ______] [Centang]
   [ ] WA Grup                        [Centang]
── Riwayat ── (Timeline @reui) "Disetujui oleh Direktur, 12 Nov 14.20" + catatan revisi
── Komentar ── daftar + textarea kirim
```

- Tombol majukan/kembalikan dari `allowedMoves`; kembalikan dan batalkan centang membuka `Dialog` dengan catatan wajib.
- Kartu dikembalikan → caption terbuka lagi bagi pemegang `kanban.isi` (mengikuti tahap).
- Catatan revisi terakhir ditampilkan menonjol (`Alert`) di atas caption saat kartu di Ide/Draft hasil pengembalian.
- Waktu ditampilkan dalam WIB, format "12 Nov 14.20".

### Aturan proyek yang berlaku

- Sebelum kode tampilan: skill `frontend-design:frontend-design`; sesudahnya: `anthropic-skills:web-design-guidelines`.
- Komponen tambahan (bila perlu) lewat shadcn CLI `-c packages/ui` dengan `--dry-run`; MCP reui `get_component`/`validate_usage`/`get_audit_checklist` untuk `kanban` dan `timeline`. Tidak ada komponen di `apps/admin/components`.
- Warna hanya dari token `globals.css`.

### Kualitas

- Tes vitest `rules.test.ts`: `allowedMoves` per kombinasi peran × tahap (termasuk Manajer Ide → Draft, Direktur tidak bisa Disetujui → Review bila ada centang), `canEditContent`, `canCheck`/`canUncheck`, `isFullyPublished`, `publishUrlError`.
- Tes izin `packages/auth` diperbarui (`kanban.ide_ke_draft` Manajer, `kanban.batal_tayang`).
- Tes integrasi (pola `planner.db.test.ts`):
  - maju/kembali mencatat event; kembali tanpa catatan ditolak;
  - `fromStage` basi ditolak;
  - pengguna tanpa izin ditolak di server;
  - centang kanal terakhir → `tayang`; batal centang di `tayang` → `disetujui`;
  - kanal "Wajib link" tanpa URL ditolak;
  - `updateEntry`: hapus kanal yang belum tercentang menuntaskan kartu; tambah kanal mengembalikan kartu `tayang`; ubah nama di `disetujui` mencatat "Diubah setelah disetujui";
  - caption ditolak di tahap Review;
  - hapus entri ikut menghapus event, komentar, publikasi.
- `scripts/verify-access.sh`: `/konten` tanpa sesi → `/masuk`; SDM Khusus → 200; kartu tidak ada → 404. (Skrip hanya memakai akun SDM Khusus; penolakan Staf Unit Lain dibuktikan lewat tes izin.)
- Migrasi berjalan di DB yang sudah berisi data Planner (kolom baru punya default).

## Diserahkan ke pembangun

- Nama kolom/fungsi detail, teks tombol dan toast.
- Bentuk progres centang di kartu.
- Tata letak halaman detail di laptop (satu kolom vs dua kolom).
- Batas panjang caption.
- Cara `@reui/kanban` menolak drop (sesuai API komponen, dicek via MCP reui).

## Pertanyaan terbuka (tidak menghalangi)

- Putaran 2: struktur bucket MinIO, URL bertanda tangan vs proxy, daftar penyedia sematan yang diizinkan.
- Notifikasi saat kartu dipindah/dikembalikan/dikomentari: modul Notifikasi.
