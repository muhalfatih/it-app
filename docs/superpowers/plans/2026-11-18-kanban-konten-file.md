# Kanban Konten Putaran 2 (File MinIO + Sematan) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kartu konten bisa diisi foto/video (MinIO) dan sematan (YouTube/Drive/tautan), dengan thumbnail, diputar langsung di aplikasi, terkunci sejak Review.

**Architecture:** Browser mengunggah langsung ke MinIO lewat presigned POST policy; aplikasi hanya memeriksa izin/tahap/kodek dan mencatat baris `content_card_media`. Pemutaran lewat `/api/media/[id]` yang memeriksa sesi lalu 302 ke presigned GET (range request dilayani MinIO). Logika murni (`parseEmbed`, `videoCodecOf`, `effectiveThumbnail`) dipakai klien dan server.

**Tech Stack:** Next.js (baca `node_modules/next/dist/docs/` untuk route handler), Drizzle + PostgreSQL, paket `minio`, vitest, `@workspace/ui` (`MediaUpload`, `MediaGallery`, `MediaLightbox`).

**Spec:** `docs/superpowers/specs/2026-11-18-kanban-konten-file-design.md`

## Global Constraints

- Semua perintah di WSL dengan Node nvm (`. ~/.nvm/nvm.sh`), dari root repo.
- Format: foto JPG, PNG, WEBP; video MP4/MOV **hanya kodek H.264** (`avc1`/`avc3`). Maks. **500 MB** per file (`MAX_MEDIA_SIZE`). Maks. **10 item** per kartu (file + sematan).
- Mutasi media hanya bila `canEditContent(permissions, stageTerbaruDiDB)` (Ide/Draft + `kanban.isi`).
- Kunci objek: `cards/{cardId}/{uuid}.{ext}`. URL unggah 15 menit, URL baca 1 jam.
- Sematan: YouTube → `https://www.youtube-nocookie.com/embed/ID`, sampul `https://i.ytimg.com/vi/ID/hqdefault.jpg`; Drive → `https://drive.google.com/file/d/ID/preview`; lainnya `tautan` (tidak pernah di-iframe, buka tab baru `rel="noopener noreferrer"`). Hanya `http(s)`.
- Pesan tolak HEVC persis: `"{nama}: kodek HEVC tidak bisa diputar di semua browser. Ekspor ulang ke MP4 (H.264), atau di iPhone pilih Pengaturan › Kamera › Format › Paling Kompatibel."` Kodek lain: `"{nama}: kodek video tidak didukung. Ekspor ulang ke MP4 (H.264)."`
- UI: hanya komponen `@workspace/ui`; perubahan komponen di `packages/ui/src/components/domain/`; warna dari token; skill `frontend-design:frontend-design` sebelum kode tampilan, `anthropic-skills:web-design-guidelines` sesudahnya. Tidak ada komponen di `apps/admin/components`.
- Dependensi baru: `minio` (di `apps/admin`) dan devDependency `tsx` (untuk skrip `media:sweep`, disetujui pengguna).

## Review Focus

- MOV/MP4 dengan `moov` di **akhir** file (rekaman kamera umum) → kodek tetap terbaca → Task 3.
- Kartu dipindah ke Review **saat** unggahan berjalan → `finishUpload` menolak dan menghapus objek → Task 5.
- Klien mengirim `objectKey` milik kartu lain atau di luar `cards/` → ditolak → Task 5.
- URL sematan berbahaya (`javascript:`, `data:`, `http://drive.google.com.evil.com/...`) → bukan iframe; host dicocokkan persis → Task 2.
- Media yang dihapus sedang jadi thumbnail → kartu kembali ke thumbnail bawaan, bukan gambar rusak → Task 5.

---

### Task 1: MinIO lokal + modul storage

**Files:**
- Modify: `docker-compose.yml`, `.env.example` (root; buat bila belum ada, tanpa nilai rahasia nyata), `apps/admin/package.json`
- Create: `apps/admin/lib/storage.ts`, `apps/admin/lib/storage.test.ts`

**Interfaces:**
- Produces (`@/lib/storage`):
  - `presignUpload(key: string, mime: string, maxBytes: number): Promise<{ url: string; fields: Record<string, string> }>`
  - `presignRead(key: string, opts: { mime: string; downloadName?: string }): Promise<string>`
  - `statObject(key: string): Promise<{ size: number; mime: string; lastModified: Date } | null>`
  - `readRange(key: string, offset: number, length: number): Promise<Uint8Array>`
  - `removeObjects(keys: string[]): Promise<void>` (kosong → no-op)
  - `listObjects(prefix: string): AsyncIterable<{ key: string; lastModified: Date }>`
  - `storageConfig(env: NodeJS.ProcessEnv): { endPoint, port, useSSL, publicUrl: URL, accessKey, secretKey, bucket, region }`

- [ ] **Step 1: Tes `storageConfig`** di `storage.test.ts`: env lengkap → objek dengan `region` bawaan `"us-east-1"`; tanpa `S3_SECRET_KEY` → throw `"S3_SECRET_KEY belum diatur"`; `S3_PUBLIC_URL` bukan URL → throw.
- [ ] **Step 2: Jalankan** `pnpm --filter admin test storage` → FAIL.
- [ ] **Step 3: Implementasi.** `pnpm --filter admin add minio`. Dua klien `minio.Client`: internal (`S3_ENDPOINT`) untuk stat/baca/hapus/list, publik (host `S3_PUBLIC_URL`) hanya untuk menandatangani agar URL berisi host yang dijangkau browser. `presignUpload` memakai `newPostPolicy()` dengan `setKey`, `setBucket`, `setContentType(mime)`, `setContentLengthRange(1, maxBytes)`, `setExpires(+15 menit)`. `presignRead` memakai `presignedGetObject(bucket, key, 3600, { "response-content-type": mime, "response-content-disposition"?: \`attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}\` })`. `statObject` mengembalikan null untuk `NotFound`. Konfigurasi dibaca malas (saat pemanggilan pertama) supaya `next build` tidak gagal tanpa env.
- [ ] **Step 4: Compose.** Tambah layanan `minio` (`minio/minio`, `command: server /data --console-address ":9001"`, port `127.0.0.1:9000:9000` & `127.0.0.1:9001:9001`, env `MINIO_ROOT_USER/PASSWORD` dari `S3_ACCESS_KEY/S3_SECRET_KEY`, `MINIO_API_CORS_ALLOW_ORIGIN: ${APP_ORIGIN:-http://localhost:3000}`, volume `miniodata`, healthcheck `mc ready local`) dan `minio-init` (`minio/mc`, `depends_on: minio: service_healthy`, `mc alias set` lalu `mc mb --ignore-existing local/$S3_BUCKET` dan `mc anonymous set none`). `.env.example`: `S3_ENDPOINT=http://localhost:9000`, `S3_PUBLIC_URL=http://localhost:9000`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET=konten`, `S3_REGION=us-east-1`, `APP_ORIGIN=http://localhost:3000`.
- [ ] **Step 5: Verifikasi.** `pnpm --filter admin test storage` PASS; `docker compose up -d minio minio-init` lalu `docker compose logs minio-init` berisi bucket dibuat; `pnpm typecheck` PASS.
- [ ] **Step 6: Commit** `feat(admin): MinIO lokal dan modul storage`.

### Task 2: Logika sematan & thumbnail

**Files:**
- Create: `apps/admin/lib/kanban/media.ts`, `apps/admin/lib/kanban/media.test.ts`
- Modify: `apps/admin/lib/kanban/types.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type EmbedProvider = "youtube" | "drive" | "tautan"
  export type CardMedia = { id: number; position: number } & (
    | { source: "file"; mediaKind: "image" | "video"; mime: string; size: number; originalName: string }
    | { source: "embed"; url: string; provider: EmbedProvider; ref: string | null }
  )
  ```
- Produces (`media.ts`):
  - `parseEmbed(input: string): { provider: EmbedProvider; ref: string | null; url: string }` — throw `UserError("Tautan tidak valid")` untuk non-`http(s)`/tak terurai.
  - `embedSrc(m: { provider; ref }): string | null`, `embedThumb(m): string | null` (hanya YouTube).
  - `mediaSrc(id: number): string` → `` `/api/media/${id}` ``.
  - `effectiveThumbnail(media: CardMedia[], thumbnailMediaId: number | null): string | null` — pilihan bila masih ada; lalu foto pertama menurut `position`; lalu YouTube pertama; lalu null.
  - `canBeThumbnail(m: CardMedia): boolean` — foto atau YouTube.

- [ ] **Step 1: Tes** `parseEmbed`: `https://youtu.be/dQw4w9WgXcQ?t=3`, `https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x`, `https://m.youtube.com/shorts/dQw4w9WgXcQ`, `/live/ID`, `/embed/ID` → `{provider:"youtube", ref:"dQw4w9WgXcQ"}`; `https://drive.google.com/file/d/1AbC_d-9/view?usp=sharing`, `https://drive.google.com/open?id=1AbC_d-9` → `{provider:"drive", ref:"1AbC_d-9"}`; `https://vimeo.com/123` → `tautan`, `ref: null`; `https://drive.google.com.evil.com/file/d/x/view` → `tautan`; `javascript:alert(1)`, `data:text/html,x`, `bukan url` → throw. `embedSrc`/`embedThumb` mengembalikan URL di Global Constraints. `effectiveThumbnail`: pilihan valid; pilihan id yang sudah tidak ada → foto pertama; tanpa foto → sampul YouTube; hanya video/tautan → null.
- [ ] **Step 2:** `pnpm --filter admin test media` → FAIL.
- [ ] **Step 3: Implementasi** dengan `new URL()`; host dicocokkan persis terhadap himpunan (`youtu.be`, `youtube.com`, `www.youtube.com`, `m.youtube.com`, `drive.google.com`); ID YouTube `/^[\w-]{11}$/`, ID Drive `/^[\w-]+$/`.
- [ ] **Step 4:** tes PASS.
- [ ] **Step 5: Commit** `feat(admin): pengurai sematan dan thumbnail kartu`.

### Task 3: Pembaca kodek video (`videoCodecOf`)

**Files:**
- Create: `apps/admin/lib/kanban/video-codec.ts`, `apps/admin/lib/kanban/video-codec.test.ts`

**Interfaces:**
- Produces: `type VideoCodec = "h264" | "hevc" | "lain"`; `videoCodecOf(read: (offset: number, length: number) => Promise<Uint8Array>, size: number): Promise<VideoCodec | null>`; `codecError(name: string, codec: VideoCodec | null): string | null` (null bila `h264`; pesan persis dari Global Constraints; `null` codec → `"{nama}: file video rusak atau tidak terbaca."`).
- File ini tanpa impor Node/DOM supaya dipakai di browser (`File.slice().arrayBuffer()`) dan server (`readRange`).

- [ ] **Step 1: Tes** dengan helper `box(type, ...children)` yang menyusun byte ISO BMFF: `ftyp`+`moov(trak(mdia(hdlr 'vide', minf(stbl(stsd(avc1))))))`+`mdat` → `h264`; sama dengan `hvc1` → `hevc`; `hev1` → `hevc`; `vp09` → `lain`; `moov` **setelah** `mdat` besar (ukuran 64-bit `size==1`, `mdat` berisi 10 MB nol yang tidak dibaca: hitung panggilan `read`, total byte dibaca < 1 MB) → `h264`; trek audio saja (`hdlr 'soun'`, `mp4a`) → null; data terpotong/ukuran kotak 0 di tengah → null tanpa throw. `codecError` mengembalikan pesan persis.
- [ ] **Step 2:** `pnpm --filter admin test video-codec` → FAIL.
- [ ] **Step 3: Implementasi.** Jelajah kotak tingkat atas dengan membaca header 16 byte per kotak (`size` 32-bit, `size==1` → 64-bit berikutnya, `size==0` → sampai `size` file) sampai `moov`; baca `moov` utuh (tolak bila > 50 MB → null); dalam `moov` turun ke setiap `trak` → `mdia` → (`hdlr` handler `vide`) → `minf` → `stbl` → `stsd`; lewati 8 byte header penuh `stsd` (versi/flags + jumlah entri), ambil tipe 4 karakter entri pertama. Batas iterasi untuk mencegah loop pada kotak rusak.
- [ ] **Step 4:** tes PASS.
- [ ] **Step 5: Commit** `feat(admin): pembaca kodek video MP4/MOV`.

### Task 4: Skema & migrasi

**Files:**
- Modify: `packages/db/src/schema/kanban.ts`, `packages/db/src/schema/planner.ts` (kolom `content_card`)
- Create: migrasi hasil `pnpm --filter @workspace/db db:generate` di `packages/db/drizzle/`

- [ ] **Step 1:** Tabel `contentCardMedia` (`content_card_media`) sesuai spec §Data: `id` serial, `cardId` cascade, `position` int not null, `source` text, `objectKey` text unique, `mediaKind`, `mime`, `size` bigint (`mode: "number"`), `originalName`, `url`, `provider`, `providerRef`, `createdBy` → user restrict, `createdAt`. CHECK `source in ('file','embed')`, `media_kind in ('image','video')`, `provider in ('youtube','drive','tautan')`, CHECK bentuk file/embed. Indeks `(card_id, position)`.
- [ ] **Step 2:** `contentCard.thumbnailMediaId` integer → `contentCardMedia.id` `on delete set null` (pakai `AnyPgColumn` untuk rujukan melingkar).
- [ ] **Step 3:** `db:generate`, periksa SQL (tidak ada DROP), `db:migrate` ke DB dev dan DB `_test`.
- [ ] **Step 4:** `pnpm typecheck` PASS.
- [ ] **Step 5: Commit** `feat(db): tabel media kartu konten`.

### Task 5: Mutasi media

**Files:**
- Create: `apps/admin/lib/kanban/media-mutations.ts`, `apps/admin/lib/kanban/media.db.test.ts`
- Modify: `apps/admin/lib/kanban/mutations.ts` (ekspor `lockCard`, `validId`, `parse`, tipe `Tx`), `apps/admin/lib/setting-crud.ts`, `apps/admin/app/(app)/konten/actions.ts`

**Interfaces:**
- Consumes: Task 1 storage, Task 2 `parseEmbed`/`canBeThumbnail`, Task 3 `videoCodecOf`/`codecError`, `mediaKindOf` & `MAX_MEDIA_SIZE` dari `@workspace/ui/components/domain/media-upload`.
- Produces (`media-mutations.ts`, semua `actor: Actor` terakhir, semua dalam transaksi + `lockCard` + `canEditContent` terhadap tahap DB, galat `UserError`):
  - `startUpload(cardId, file: { name: string; size: number; mime: string }, actor): Promise<{ key: string; url: string; fields: Record<string, string> }>`
  - `finishUpload(cardId, key: string, originalName: string, actor): Promise<void>`
  - `addEmbed(cardId, url: string, actor): Promise<void>`
  - `reorderMedia(cardId, ids: number[], actor): Promise<void>`
  - `removeMedia(cardId, mediaId: number, actor): Promise<void>`
  - `setThumbnail(cardId, mediaId: number | null, actor): Promise<void>`
  - `MAX_MEDIA_ITEMS = 10`
- `setting-crud.ts`: `CrudResult<T = undefined> = { ok: true; data?: T } | { error: string }`; `guarded<T>(path, fn: () => Promise<T>)` mengembalikan `{ ok: true, data }`. Pemanggil lama tetap kompatibel.
- `actions.ts`: `startUploadAction`, `finishUploadAction`, `addEmbedAction`, `reorderMediaAction`, `removeMediaAction`, `setThumbnailAction` lewat helper `action` yang ada (diperluas meneruskan `data`).

- [ ] **Step 1: Tes integrasi** (pola `kanban.db.test.ts`, `vi.mock("@/lib/storage")` dengan objek palsu dalam memori: `statObject` mengembalikan ukuran/tipe yang diatur tes, `readRange` dari buffer MP4 buatan Task 3, `removeObjects` dicatat):
  - `startUpload` di tahap Draft → `key` cocok `/^cards\/\d+\/[0-9a-f-]{36}\.mp4$/`, `presignUpload` dipanggil dengan `maxBytes = 524288000`;
  - `startUpload` 501 MB / `.gif` / tanpa `kanban.isi` / tahap Review → ditolak;
  - `finishUpload` sukses → satu baris `source:"file"`, `position` terakhir;
  - kartu dipindah ke Review di antara `startUpload` dan `finishUpload` → galat `"Kartu sudah masuk Review; file tidak disimpan."` dan `removeObjects([key])`;
  - `finishUpload` dengan buffer HEVC → galat pesan HEVC dan objek dihapus;
  - `finishUpload` dengan `key` `cards/{kartuLain}/...` atau `../x` → ditolak, tidak menghapus objek kartu lain;
  - `statObject` null → `"Unggahan tidak ditemukan, coba lagi."`;
  - item ke-11 (9 file + 1 sematan + 1 lagi) ditolak di `startUpload`, `finishUpload`, dan `addEmbed`;
  - `addEmbed` YouTube → `provider:"youtube"`, `providerRef` terisi;
  - `reorderMedia` dengan id kurang/lebih/kartu lain → ditolak; benar → posisi 0..n-1 sesuai urutan;
  - `setThumbnail` pada video atau tautan → ditolak; pada foto → tersimpan; `removeMedia` foto itu → `thumbnail_media_id` null dan `removeObjects` dipanggil **setelah** commit;
  - semua mutasi di tahap Review → ditolak.
- [ ] **Step 2:** `DATABASE_URL=…_test pnpm --filter admin test media.db` → FAIL.
- [ ] **Step 3: Implementasi.** Ekstensi kunci dari jenis MIME (`image/jpeg`→`jpg`, `image/png`→`png`, `image/webp`→`webp`, `video/mp4`→`mp4`, `video/quicktime`→`mov`); MIME dari klien dinormalisasi lewat `mediaKindOf`. `finishUpload` memeriksa ukuran & MIME hasil `statObject` (harus ≤ 500 MB dan termasuk daftar), kodek lewat `readRange` untuk video, di **luar** transaksi; lalu transaksi untuk tahap + slot + insert; penghapusan objek setelah galat/commit tidak di dalam transaksi.
- [ ] **Step 4:** tes PASS; `pnpm --filter admin test` seluruhnya PASS.
- [ ] **Step 5: Commit** `feat(admin): mutasi media kartu konten`.

### Task 6: Hapus entri membersihkan file + penyapu yatim

**Files:**
- Modify: `apps/admin/lib/planner/mutations.ts` (`deleteEntry`), `apps/admin/lib/kanban/media.db.test.ts`, `apps/admin/package.json`
- Create: `apps/admin/scripts/media-sweep.ts`, `apps/admin/lib/kanban/sweep.ts`

**Interfaces:**
- Produces: `sweepOrphans(now: Date, olderThanMs = 86_400_000): Promise<{ removed: string[] }>` di `sweep.ts`; skrip `"media:sweep": "tsx scripts/media-sweep.ts"` (pakai `tsx` bila sudah ada di workspace; bila belum, `node --experimental-strip-types`).

- [ ] **Step 1: Tes:** `deleteEntry` kartu dengan 2 file + 1 sematan → `removeObjects` dipanggil sekali dengan 2 kunci setelah commit; `removeObjects` melempar → `deleteEntry` tetap sukses (galat di-`console.error`). `sweepOrphans`: objek tanpa baris berumur 25 jam → dihapus; berumur 1 jam → tetap; objek yang punya baris → tetap.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implementasi.** `deleteEntry` mengambil `object_key` lewat join `content_card` sebelum delete di transaksi yang sama.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(admin): hapus file media saat entri dihapus dan penyapu yatim`.

### Task 7: Route pemutaran `/api/media/[id]`

**Files:**
- Create: `apps/admin/app/api/media/[id]/route.ts`
- Modify: `apps/admin/lib/kanban/queries.ts` (`getMediaFile(id: number): Promise<{ key: string; mime: string; originalName: string } | null>`), `scripts/verify-access.sh`

- [ ] **Step 1:** Baca dokumentasi route handler di `apps/admin/node_modules/next/dist/docs/` (bentuk `params` dan cara membaca sesi di route).
- [ ] **Step 2: Implementasi `GET`:** tanpa sesi → 401; tanpa `kanban.lihat` → 403; id tidak valid/tidak ada/bukan file → 404; selain itu `302` ke `presignRead(key, { mime, downloadName: unduh ? originalName : undefined })` dengan `Cache-Control: private, no-store`. Parameter `?unduh=1`.
- [ ] **Step 3:** `verify-access.sh`: `/api/media/1` tanpa sesi → `401`; dengan sesi SDM Khusus dan id `999999` → `404`.
- [ ] **Step 4: Verifikasi:** `pnpm dev`, jalankan `scripts/verify-access.sh` → semua OK.
- [ ] **Step 5: Commit** `feat(admin): route pemutaran media kartu`.

### Task 8: Data media di kartu dan papan

**Files:**
- Modify: `apps/admin/lib/kanban/queries.ts`, `apps/admin/lib/kanban/types.ts`, `apps/admin/lib/kanban/kanban.db.test.ts`, `apps/admin/app/(app)/konten/_board.tsx`

**Interfaces:**
- Produces: `CardDetail.media: CardMedia[]` (urut `position`), `CardDetail.thumbnailMediaId: number | null`, `BoardCard.thumbnailUrl: string | null` (dari `effectiveThumbnail`).

- [ ] **Step 1: Tes:** `getCard` mengembalikan media terurut; `listBoard` mengisi `thumbnailUrl` `/api/media/{id}` untuk foto pilihan dan URL `i.ytimg.com` untuk kartu yang hanya punya YouTube.
- [ ] **Step 2:** FAIL → implementasi (satu query media untuk semua kartu papan, bukan per kartu) → PASS.
- [ ] **Step 3:** `_board.tsx` meneruskan `thumbnailUrl` ke `ContentCard`.
- [ ] **Step 4: Commit** `feat(admin): media dan thumbnail di data kartu`.

### Task 9: Komponen domain: ubin sematan, kolom tautan, thumbnail, lightbox iframe

**Files:**
- Modify: `packages/ui/src/components/domain/media-upload.tsx`, `packages/ui/src/components/domain/media-gallery.tsx`, `apps/admin/app/(app)/galeri/page.tsx` (demo)

**Interfaces:**
- `MediaUploadItem` ditambah: `source?: "file" | "embed"`, `provider?: "youtube" | "drive" | "tautan"`, `href?: string`, `thumbnail?: boolean`. Untuk sematan: `src` = gambar sampul (boleh kosong), `size` diabaikan, keterangan = penyedia/domain.
- `MediaUpload` props baru: `onEmbed?: (url: string) => Promise<string | null>` (null = sukses, string = galat ditampilkan di bawah kolom), `onSetThumbnail?: (id: string) => void`, `onOpen?: (id: string) => void`, `disabled?: boolean` (sembunyikan area unggah, pegangan, hapus, ★). Kolom tautan memakai `InputGroup` di dalam kartu area unggah, dipisah teks "atau".
- `MediaItem` (galeri) ditambah `kind: "embed"` dengan `embedSrc?: string` (iframe `allow="fullscreen; picture-in-picture"`, `title` = nama) atau `href?: string` (tombol "Buka di tab baru"); tombol unduh hanya untuk `image`/`video` dan memakai prop baru `downloadHref?: string`. Video yang gagal diputar (`onError`) menampilkan "Video ini tidak bisa diputar di browser ini." + Unduh.

- [ ] **Step 1:** Panggil skill `frontend-design:frontend-design`; cek API `sortable`/`input-group` yang terpasang.
- [ ] **Step 2: Implementasi** perubahan di atas; tanpa warna hardcode; ★ dengan `aria-pressed` dan label "Jadikan thumbnail {nama}".
- [ ] **Step 3:** Demo galeri: tambahkan satu ubin YouTube, satu Drive, satu tautan, dan satu contoh `disabled`.
- [ ] **Step 4: Verifikasi:** `pnpm typecheck && pnpm lint` PASS; buka `/galeri`, cek tampilan HP (375 px) dan laptop; panggil skill `anthropic-skills:web-design-guidelines` atas file yang diubah dan perbaiki temuan.
- [ ] **Step 5: Commit** `feat(ui): ubin sematan, thumbnail, dan lightbox iframe`.

### Task 10: Frame "Konten" di halaman kartu

**Files:**
- Create: `apps/admin/app/(app)/konten/[id]/_media.tsx`, `apps/admin/lib/kanban/upload-client.ts`
- Modify: `apps/admin/app/(app)/konten/[id]/page.tsx`

**Interfaces:**
- Consumes: aksi Task 5, `CardDetail.media` Task 8, komponen Task 9, `videoCodecOf`/`codecError` Task 3.
- Produces (`upload-client.ts`): `uploadToStorage(target: { url: string; fields: Record<string, string> }, file: File, onProgress: (pct: number) => void, signal: AbortSignal): Promise<void>` — `XMLHttpRequest` POST `FormData` (fields dulu, `file` terakhir), progres dari `upload.onprogress`, galat status ≠ 2xx/204.

- [ ] **Step 1: Implementasi `_media.tsx`** (client): state item dari `media` + item lokal yang sedang diunggah; untuk tiap file: video → `videoCodecOf((o, l) => file.slice(o, o + l).arrayBuffer().then(b => new Uint8Array(b)), file.size)` → bila `codecError` → ubin `error`; lalu `startUploadAction` → `uploadToStorage` → `finishUploadAction` → `router.refresh()`. Maks. 2 unggahan berjalan bersamaan (antrean sederhana). Peringatan `beforeunload` selama ada unggahan berjalan. Hapus lewat `AlertDialog` → `removeMediaAction`. Urutan → `reorderMediaAction`. ★ → `setThumbnailAction`. Klik ubin → `MediaLightbox`. Galat aksi → toast (pola halaman yang ada).
- [ ] **Step 2: `page.tsx`:** Frame "Konten (n dari 10)" di kolom kiri di atas Caption; label "Terkunci sejak Review" bila terkunci; `disabled={!editable}`; kosong & terkunci → "Belum ada konten."
- [ ] **Step 3: Verifikasi manual** (MinIO lokal, `pnpm dev`): unggah JPG + MP4 H.264 ~400 MB (progres jalan), MOV HEVC ditolak dengan pesan persis, sematan YouTube/Drive/vimeo, urutkan, ★ thumbnail tampil di papan, video bisa di-seek (Network: respons 206 dari MinIO), unduh bernama file asli, pindah kartu ke Review → area unggah hilang dan lightbox tetap jalan, hapus entri di Planner → objek hilang dari konsol MinIO.
- [ ] **Step 4:** `pnpm typecheck && pnpm lint && pnpm --filter admin test` PASS; skill `anthropic-skills:web-design-guidelines` atas `_media.tsx` dan `page.tsx`.
- [ ] **Step 5: Commit** `feat(admin): bagian konten di halaman kartu`.
