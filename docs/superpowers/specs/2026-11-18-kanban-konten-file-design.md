# Manajemen Konten (Kanban) — Putaran 2: File MinIO + Sematan

Tanggal: 18 November 2026 · Acuan: spesifikasi §6.4 (isi kartu), §4.5 (hapus entri); PRD §8 (performa: streaming/range request; keamanan: file tidak bisa diakses tanpa login; backup), §9 #2; spec putaran 1 (`2026-11-17-kanban-konten-design.md`).

## Tujuan

Kartu konten bisa diisi **foto/video** (unggah ke MinIO di server unit) dan **sematan** (YouTube, Google Drive, tautan lain), serta satu **thumbnail**. Manajer dan Direktur membuka dan memutar konten langsung di aplikasi saat review, tanpa unduh penuh. Isi terkunci sejak Review, sama seperti caption. Hapus entri Planner ikut menghapus file-nya.

**Bukan tujuan putaran ini:**

- Transkode/kompresi video, pembuatan thumbnail otomatis dari video.
- Unggah yang bisa dilanjutkan setelah putus (multipart/tus). Jalur A bisa ditingkatkan nanti tanpa mengubah tabel atau tampilan.
- Backup bucket MinIO: urusan deployment (mis. `mc mirror` terjadwal), dicatat di pertanyaan terbuka.
- Riwayat (event) untuk tambah/hapus media. *Keputusan pembangun*: caption juga tidak dicatat di riwayat.

**Anti-tujuan:**

- File bisa diakses tanpa login aplikasi (kecuali sematan, lihat di bawah).
- Server Next memikul byte unggahan/pemutaran 500 MB.
- Media bisa ditambah/dihapus/diurutkan di tahap Review ke atas, termasuk lewat unggahan yang dimulai sebelum kartu dipindah.
- File tertinggal di MinIO tanpa pernah dibersihkan setelah entri/media dihapus.
- Iframe dari alamat sembarang.

## Keputusan pengguna

| Topik | Keputusan |
| --- | --- |
| Penyimpanan | MinIO di server unit; 500 MB/file; MP4, MOV, JPG, PNG, WEBP (putaran 1). |
| Format yang didukung | Hanya yang bisa diputar di semua browser: foto **JPG, PNG, WEBP**; video **MP4/MOV berkodek H.264**. HEVC (bawaan iPhone "Efisiensi Tinggi") dan kodek lain **ditolak** dengan petunjuk mengekspor ulang. Tanpa konversi di server. |
| Sematan | **Setara dengan file**: satu daftar, satu lightbox, bisa jadi thumbnail (bila ada gambar sampulnya). |
| Penyedia | YouTube dan Google Drive diputar di aplikasi; **penyedia lain tetap diterima** sebagai ubin tautan (buka tab baru). |
| Tampilan | Komponen **`MediaUpload`** di galeri ("Unggah media konten", pola `@reui/c-file-upload-8`), bukan repeater. |
| Usul yang disetujui | Sematan jadi ubin di grid yang sama + kolom tautan di area unggah; simpan per item langsung; thumbnail lewat ★ "Jadikan thumbnail" (bawaan: foto pertama); batas 10 item per kartu termasuk sematan; tahap terkunci = galeri baca saja. |
| Jalur file | **A**: browser langsung ke MinIO lewat URL bertanda tangan. MinIO **boleh** dibuka lewat reverse proxy. |
| Konsekuensi diterima | Sematan bisa dibuka siapa pun yang punya tautannya (Drive harus "siapa saja yang punya link", YouTube unlisted/publik). Hapus entri tidak menghapus file di penyedia. |

## Approaches

1. **A. Browser ↔ MinIO langsung dengan URL bertanda tangan**: dipilih. Aplikasi hanya memeriksa izin dan menerbitkan URL berumur pendek; MinIO melayani byte dan range request. Biaya: MinIO dibuka lewat reverse proxy + CORS; URL baca yang tersalin berlaku sampai kedaluwarsa.
2. **B. Semua lewat server Next (proxy streaming)**: ditolak. MinIO tertutup penuh, tetapi setiap unggahan/penonton memakan koneksi dan memori server unit; penerusan Range harus ditulis sendiri.
3. **C. A + unggah bisa dilanjutkan (multipart/tus/Uppy)**: ditunda sampai unggahan putus terbukti jadi masalah.

## Rancangan

### Infrastruktur

> **Pembaruan 18 Nov 2026:** image `minio/minio` dan `minio/mc` tidak lagi bisa ditarik. Server S3 lokal diganti **RustFS 1.0.6** (`rustfs/rustfs`, Apache-2.0), dengan init lewat `amazon/aws-cli` (bucket privat + bucket CORS hanya `APP_ORIGIN`). Diuji: presigned POST dengan batas ukuran dan tipe ditegakkan, range GET 206, tanda tangan palsu 403, origin asing 403. SeaweedFS ditolak (tidak menegakkan batas tipe; CORS terbuka untuk semua origin). Aplikasi tetap memakai paket `minio` lewat API S3; nama "MinIO" di bawah berarti server S3 ini. Kematangan RustFS untuk server produksi ditinjau sebelum deployment; cadangan: `bitnamilegacy/minio`.

- `docker-compose.yml`: layanan `minio` (`minio/minio`, port `127.0.0.1:9000` API dan `127.0.0.1:9001` konsol, volume `miniodata`, healthcheck) + layanan sekali jalan `minio-init` (`minio/mc`) yang membuat bucket privat (tanpa akses anonim).
- CORS MinIO: izinkan origin aplikasi (`MINIO_API_CORS_ALLOW_ORIGIN`), metode `POST`, `GET`, `HEAD`.
- Env baru (`.env.example` + validasi saat start): `S3_ENDPOINT` (alamat internal yang dipakai server), `S3_PUBLIC_URL` (alamat yang dijangkau browser lewat reverse proxy, dipakai untuk menandatangani URL), `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION` (bawaan `us-east-1`). `S3_PUBLIC_URL` harus berupa origin tanpa path (mis. `https://files.domain`): path dibuang saat menandatangani URL.
- Modul `apps/admin/lib/storage.ts`: satu-satunya tempat yang bicara ke MinIO (`presignUpload`, `presignRead`, `statObject`, `removeObjects`). Dependensi baru: paket **`minio`** (SDK resmi, satu paket; *keputusan pembangun*, alternatif `@aws-sdk/client-s3` + presigner).
- File dilayani dari origin MinIO yang **berbeda** dengan aplikasi, sehingga file yang menyamar (mis. HTML berekstensi .jpg) tidak menyentuh cookie sesi.

### Data (`packages/db/src/schema/kanban.ts`)

**`content_card_media`**:

- `id` serial; `card_id` → kartu (cascade); `position` integer wajib; `created_by` → user (restrict); `created_at`.
- `source` text: `file` | `embed` (CHECK).
- File: `object_key` text unik null (`cards/{cardId}/{uuid}.{ext}`), `media_kind` `image` | `video`, `mime` text, `size` bigint, `original_name` text.
- Sematan: `url` text, `provider` `youtube` | `drive` | `tautan`, `provider_ref` text null (ID video YouTube / ID file Drive).
- CHECK: `source = 'file'` ⇒ kolom file terisi; `source = 'embed'` ⇒ `url` dan `provider` terisi.
- Indeks `(card_id, position)`.

**`content_card`** ditambah `thumbnail_media_id` → `content_card_media` (`on delete set null`). Thumbnail efektif = pilihan ini; bila null, foto pertama menurut `position`; bila tidak ada foto, ubin YouTube pertama; bila tidak ada, tanpa thumbnail (kartu papan sudah menerima `thumbnailUrl` opsional). Hanya foto dan sematan YouTube yang bisa dipilih.

### Logika murni (`apps/admin/lib/kanban/media.ts`, tes vitest)

- `parseEmbed(url)` → `{ provider, ref, embedSrc?, thumbSrc? }` atau galat. Hanya `http(s)`.
  - YouTube: `youtu.be/ID`, `youtube.com/watch?v=ID`, `/shorts/ID`, `/live/ID`, `/embed/ID`, `m.` dan `www.` → `embedSrc` `https://www.youtube-nocookie.com/embed/ID`, `thumbSrc` `https://i.ytimg.com/vi/ID/hqdefault.jpg`.
  - Drive: `drive.google.com/file/d/ID/...`, `drive.google.com/open?id=ID` → `embedSrc` `https://drive.google.com/file/d/ID/preview`, tanpa thumbnail.
  - Lainnya: `provider: "tautan"`, tanpa `embedSrc` (tidak pernah di-iframe).
- `mediaKindFromMime/ext` memakai `mediaKindOf` yang sudah ada di `@workspace/ui/components/domain/media-upload` (format & 500 MB satu sumber: `MAX_MEDIA_SIZE`).
- `videoCodecOf(read)` → `"h264" | "hevc" | "lain" | null`: pengurai kecil ISO BMFF (MP4/MOV) tanpa dependensi. `read(offset, length)` mengembalikan byte, sehingga fungsi yang sama dipakai di browser (`File.slice`) dan di server (range GET ke MinIO). Telusuri kotak tingkat atas sampai `moov` (bisa di akhir file), lalu `trak` → `mdia` → `minf` → `stbl` → `stsd`; jenis entri video `avc1`/`avc3` → `h264`, `hvc1`/`hev1` → `hevc`, lainnya → `lain`; tanpa trek video / rusak → `null`. Hanya `h264` yang diterima. Kodek audio tidak diperiksa (*keputusan pembangun*: iPhone/kamera umum memakai AAC).
- Pesan tolak: "video.mov: kodek HEVC tidak bisa diputar di semua browser. Ekspor ulang ke MP4 (H.264), atau di iPhone pilih Pengaturan › Kamera › Format › Paling Kompatibel."
- `effectiveThumbnail(media, thumbnailMediaId)`.
- `canEditContent` (putaran 1) dipakai untuk semua mutasi media.

### Aksi server (`apps/admin/lib/kanban/media-mutations.ts` + `app/(app)/konten/actions.ts`)

Pola sama dengan putaran 1: `requirePermission`, zod, transaksi, `guarded()`, `revalidatePath` papan + kartu. Setiap aksi mengunci baris kartu (`FOR UPDATE`) dan memeriksa `canEditContent` terhadap tahap **terbaru di DB**.

- `startUpload(cardId, { name, size, mime })`: cek tahap, format, ukuran ≤ 500 MB, slot (< 10 item). Kembalikan **presigned POST policy** (berlaku 15 menit) untuk `object_key` baru dengan `content-length-range` 1..500 MB dan `Content-Type` persis, sehingga MinIO sendiri menolak file yang melanggar. Belum ada baris DB.
- `finishUpload(cardId, objectKey, originalName)`: `objectKey` harus berawalan `cards/{cardId}/`. `statObject` untuk ukuran & tipe nyata; untuk video, `videoCodecOf` lewat range GET (bukan H.264 → hapus objek, galat); cek ulang tahap + slot, insert baris di posisi terakhir. Bila tahap sudah terkunci atau slot penuh → hapus objek, kembalikan galat ("Kartu sudah masuk Review; file tidak disimpan.").
- `addEmbed(cardId, url)`: `parseEmbed`, cek slot, insert.
- `reorderMedia(cardId, ids[])`: ids harus persis himpunan media kartu; tulis ulang `position`.
- `removeMedia(cardId, mediaId)`: hapus baris (thumbnail ikut null lewat FK), lalu **setelah commit** hapus objek.
- `setThumbnail(cardId, mediaId | null)`: hanya foto atau YouTube milik kartu.

Klien: video diperiksa `videoCodecOf` **sebelum** `startUpload`; yang ditolak tampil sebagai ubin galat (status `error` yang sudah ada di `MediaUpload`) tanpa terunggah. Unggah dengan `XMLHttpRequest` (progres) ke URL POST; beberapa file berjalan paralel (maks. 2 bersamaan, *keputusan pembangun*). Ubin gagal menampilkan galat + bisa dihapus.

**`deleteEntry` Planner**: di transaksi yang sama, kumpulkan `object_key` media kartu sebelum delete; setelah commit panggil `removeObjects`. Kegagalan MinIO dicatat di log, tidak menggagalkan penghapusan (penyapu di bawah menangkapnya).

**Penyapu yatim** `pnpm --filter admin media:sweep` (skrip, dijalankan cron harian di server): objek di `cards/` yang tidak punya baris DB dan berumur > 24 jam dihapus. Menangkap unggahan yang tidak pernah di-`finishUpload` dan penghapusan pasca-commit yang gagal.

### Pemutaran (`apps/admin/app/api/media/[id]/route.ts`)

- `GET`: sesi + `kanban.lihat` (tanpa sesi → 401, media tidak ada → 404). Lalu `302` ke presigned GET **berlaku 1 jam** dengan `response-content-type` dari DB dan, untuk `?unduh=1`, `response-content-disposition: attachment; filename=...`. Header `Cache-Control: private, no-store` pada redirect.
- Range request ditangani MinIO langsung (seek video tanpa unduh penuh).
- Sematan tidak lewat route ini: `embedSrc`/`thumbSrc` dari `parseEmbed`; tautan lain dibuka di tab baru dengan `rel="noopener noreferrer"`.

### Tampilan

Aturan proyek: skill `frontend-design:frontend-design` sebelum kode, `anthropic-skills:web-design-guidelines` sesudahnya; tanpa komponen baru di `apps/admin/components`; warna dari token.

**Halaman `/konten/[id]`**, Frame baru "Konten" di kolom kiri, di atas Caption:

```
── Konten (4 dari 10) ────────────────────────────── Terkunci sejak Review
[⠿ 🖼 foto1.jpg ★]  [⠿ ▶ video.mp4 68%]  [⠿ ▶ YouTube]  [⠿ ↗ vimeo.com]
┌ - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┐
   ☁ Pilih file atau seret ke sini       [Pilih file]
   Foto JPG, PNG, WEBP atau video MP4, MOV. Maks. 500 MB
   ─────────────── atau ───────────────
   [ Tempel tautan YouTube, Google Drive, … ] [Sematkan]
└ - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┘
```

- Dapat diubah (`canEditContent`): `MediaUpload`, tersimpan per item langsung; hapus pakai konfirmasi (`AlertDialog`); ★ "Jadikan thumbnail" pada foto/YouTube, ubin thumbnail diberi penanda.
- Terkunci: `MediaUpload` dengan `disabled` (bukan `MediaGallery`; keputusan pembangun, diterima pengguna: urutan dan ubin sama dengan saat bisa diedit, lightbox tetap bisa dibuka), baca saja; klik → `MediaLightbox` (foto zoom, video `<video>` dari `/api/media/[id]`, YouTube/Drive di iframe, tautan lain buka tab baru). Unduh lewat `?unduh=1`.
- Kosong & terkunci: "Belum ada konten."

**Papan `/konten`**: `ContentCard` menerima `thumbnailUrl` dari thumbnail efektif (`/api/media/[id]` atau `thumbSrc` YouTube).

**Perubahan komponen domain** (`packages/ui/src/components/domain/`, bukan file hasil CLI):

- `media-upload.tsx`: item jenis `embed` (ubin sampul YouTube / ikon Drive / ubin tautan dengan domain), kolom tautan + tombol Sematkan di area unggah (pakai `InputGroup` yang ada), aksi ★ thumbnail, prop `disabled`.
- `media-gallery.tsx`: `MediaItem` jenis `embed` dengan `embedSrc` (iframe `allow="fullscreen"`, `title` bermakna) atau `href` (tautan keluar); tombol unduh hanya untuk file.
- Galeri `/galeri`: demo diperbarui dengan contoh sematan.

### Kualitas

- Vitest `media.test.ts`: `parseEmbed` (semua bentuk URL YouTube/Drive, `javascript:`/`data:` ditolak, URL lain → `tautan`), `effectiveThumbnail`, `videoCodecOf` dengan potongan kotak buatan (`avc1`, `hvc1`, `moov` di akhir file, tanpa trek video, kotak rusak/terpotong).
- Uji manual: MOV H.264 diterima; MOV HEVC dari iPhone ditolak dengan pesan petunjuk.
- Tes integrasi (pola `kanban.db.test.ts`, modul `storage` di-mock):
  - `finishUpload` setelah kartu pindah ke Review → ditolak dan objek dihapus;
  - `finishUpload` video HEVC (lolos klien) → ditolak dan objek dihapus;
  - item ke-11 ditolak (file maupun sematan);
  - `objectKey` dari kartu lain ditolak;
  - `reorderMedia` dengan himpunan id salah ditolak;
  - hapus media yang jadi thumbnail → thumbnail null;
  - `deleteEntry` memanggil `removeObjects` dengan semua kunci kartu;
  - mutasi media ditolak tanpa `kanban.isi` / di tahap Review.
- `scripts/verify-access.sh`: `/api/media/1` tanpa sesi → 401.
- Uji manual dengan MinIO lokal: unggah 400 MB (progres), seek video, file 600 MB ditolak MinIO, unduh nama file asli.

## Diserahkan ke pembangun

- Nama fungsi/kolom detail, teks tombol, toast, dan pesan galat.
- Ikon/ubin per penyedia, penanda thumbnail, urutan kolom tautan vs area seret.
- Umur URL (15 menit unggah, 1 jam baca) boleh disesuaikan bila ada alasan.
- Paket SDK MinIO (`minio` vs `@aws-sdk/*`).
- Paralelisme unggah.

## Keputusan pembangun (diambil di rancangan ini, mohon dicek)

- Presigned **POST policy** (bukan PUT) agar batas ukuran dan tipe ditegakkan MinIO.
- Tidak ada baris DB sebelum unggahan selesai; yatim dibersihkan penyapu harian.
- Tidak ada event riwayat untuk media.
- Thumbnail bawaan: foto pertama, lalu YouTube pertama.

## Pertanyaan terbuka (tidak menghalangi)

- Backup bucket MinIO dan prosedur pulihnya (PRD §8): disiapkan saat deployment.
- Alamat publik MinIO di server unit (subdomain vs path) dan sertifikat TLS-nya.
