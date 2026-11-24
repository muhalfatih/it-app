#!/usr/bin/env bash
# Verifikasi akses langsung lewat URL (PRD §10: otorisasi diuji termasuk akses langsung).
# Penolakan aksi server dibuktikan di vitest (packages/auth/src/authorize.test.ts),
# karena ID aksi server dibuat saat build dan tidak bisa dipanggil dengan curl secara andal.
#
# Login lewat kata sandi sudah ditutup (SSO-only), jadi skrip membuat sesi uji langsung di
# database `itapp` lalu menandatangani cookie seperti better-auth:
#   cookie = better-auth.session_token=<token>.<base64(HMAC-SHA256(token, BETTER_AUTH_SECRET))>
# Akun uji berawalan `uji-akses-` (SDM Strategi, SDM Khusus, Direktur, Staf Unit Lain) dihapus
# saat keluar; Manajer memakai akun yang sudah ada, hanya sesinya yang dihapus. Kalau skrip
# mati paksa, sisanya dibereskan oleh jalan berikutnya, atau hapus manual:
#   delete from session where id like 'uji-akses-%'; delete from "user" where id like 'uji-akses-%';
#
# Pakai (server dev/produksi berjalan, container docker compose `db` hidup, .env berisi BETTER_AUTH_SECRET):
#   BASE_URL=http://localhost:3000 scripts/verify-access.sh
# Cookie tanpa awalan __Secure- hanya cocok untuk http; untuk https, sesuaikan nama cookie.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRET="${BETTER_AUTH_SECRET:-$(sed -n 's/^BETTER_AUTH_SECRET=//p' "$ROOT/.env" | tail -n1 | tr -d "\"'")}"
: "${SECRET:?BETTER_AUTH_SECRET tidak ada di lingkungan maupun $ROOT/.env}"

fail=0
check() { # check <label> <expected-substring> <actual>
  if [[ "$3" == *"$2"* ]]; then
    printf "PASS  %s\n" "$1"
  else
    printf "FAIL  %s (harap: %s, dapat: %s)\n" "$1" "$2" "$3"
    fail=1
  fi
}
status() { # status <path> [cookie]
  curl -s -o /dev/null -w "%{http_code} %{redirect_url}" ${2:+-b "$2"} "$BASE_URL$1"
}
psql_db() { (cd "$ROOT" && docker compose exec -T db psql -U "${POSTGRES_USER:-itapp}" -d "${POSTGRES_DB:-itapp}" -qtAc "$1"); }

# Sesi uji dikenali dari awalan id, bukan dari daftar token di memori: session_cookie dipanggil
# lewat command substitution (subshell), jadi variabel yang diisi di sana tidak sampai ke sini.
# Pola ini sekaligus membereskan sisa dari jalan sebelumnya yang mati paksa.
cleanup() {
  psql_db "delete from session where id like 'uji-akses-%'" >/dev/null || true
  psql_db "delete from \"user\" where id like 'uji-akses-%'" >/dev/null || true
}
trap cleanup EXIT

# session_cookie <peran|none> -> cetak "nama=nilai" cookie sesi. Peran "none" = Staf Unit Lain.
session_cookie() {
  local role="$1" uid token sig
  if [[ "$role" == manajer ]]; then
    uid=$(psql_db "select user_id from user_role where role = 'manajer' limit 1")
    [[ -n "$uid" ]] || { echo "tidak ada akun Manajer di database" >&2; return 1; }
  else
    uid="uji-akses-$role"
    psql_db "insert into \"user\" (id, name, email, username) values ('$uid', 'Uji Akses $role', '$uid@example.invalid', '$uid') on conflict (id) do nothing" >/dev/null
    [[ "$role" == none ]] || psql_db "insert into user_role (user_id, role) values ('$uid', '$role') on conflict do nothing" >/dev/null
  fi
  token=$(openssl rand -hex 16)
  psql_db "insert into session (id, token, expires_at, created_at, updated_at, user_id) values ('uji-akses-$token', '$token', now() + interval '1 hour', now(), now(), '$uid')" >/dev/null
  sig=$(printf %s "$token" | openssl dgst -sha256 -hmac "$SECRET" -binary | openssl base64 -A)
  printf 'better-auth.session_token=%s.%s' "$token" "$sig"
}

# precheck: GET / harus 200, kalau tidak tanda tangan atau sesi salah dan sisa blok tidak berarti.
login() { # login <label> <peran> <var-cookie>
  local c
  c=$(session_cookie "$2")
  if [[ "$(status / "$c")" != "200 " ]]; then
    printf "FAIL  sesi uji %s ditolak (GET / bukan 200): cek BETTER_AUTH_SECRET, cookie tanpa __Secure-, dan server\n" "$1"
    exit 1
  fi
  printf "PASS  sesi uji %s diterima\n" "$1"
  printf -v "$3" %s "$c"
}
denied="307 $BASE_URL/?akses=ditolak"

# Server mati membuat semua cek jadi 000; satu pesan jelas lebih berguna dari puluhan FAIL.
[[ "$(status /masuk)" != 000* ]] ||
  { printf "Server di %s tidak merespons\n" "$BASE_URL" >&2; exit 1; }

echo "== Tanpa sesi"
for path in /setting/akun /setting/kanal /galeri /planner /konten /konten/1 /laporan /laporan/tim /laporan/rekap /absensi/rekap /tugas /absensi /layanan/sdm /layanan/internet /layanan/internet/rekap /layanan/sdm/persetujuan /inventaris /inventaris/peminjaman /; do
  check "GET $path -> /masuk" "307 $BASE_URL/masuk" "$(status "$path")"
done
check "GET /api/media/1 (tanpa sesi) -> 401" "401" "$(status /api/media/1)"

echo "== Jalur login kata sandi ditutup (PR #16)"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/sign-in/username" \
  -H "content-type: application/json" -H "origin: $BASE_URL" --data '{"username":"x","password":"x"}')
check "POST /api/auth/sign-in/username -> 404" "404" "$code"

echo "== SDM Khusus"
login "SDM Khusus" sdm_khusus KHUSUS
for path in /setting/akun /setting/kanal /setting/tugas-rutin; do
  check "GET $path -> ditolak" "$denied" "$(status "$path" "$KHUSUS")"
done
check "GET /galeri (diizinkan) -> 200" "200" "$(status /galeri "$KHUSUS")"
check "GET /planner (diizinkan) -> 200" "200" "$(status /planner "$KHUSUS")"
check "GET /planner/baru (tanpa planner.ubah) -> ditolak" "$denied" "$(status /planner/baru "$KHUSUS")"
check "GET /konten (diizinkan) -> 200" "200" "$(status /konten "$KHUSUS")"
check "GET /konten/999999 (tidak ada) -> 404" "404" "$(status /konten/999999 "$KHUSUS")"
check "GET /api/media/999999 (tidak ada) -> 404" "404" "$(status /api/media/999999 "$KHUSUS")"
check "GET /layanan/internet/rekap (SDM Khusus) -> 200" "200" "$(status /layanan/internet/rekap "$KHUSUS")"
check "GET /layanan/sdm/persetujuan (SDM Khusus) -> ditolak" "$denied" "$(status /layanan/sdm/persetujuan "$KHUSUS")"
check "GET /laporan (diizinkan) -> 200" "200" "$(status /laporan "$KHUSUS")"
for path in /laporan/tim /tugas /tugas/baru /absensi /absensi/libur /inventaris /laporan/rekap/x /absensi/rekap/x; do
  check "GET $path (SDM Khusus) -> ditolak" "$denied" "$(status "$path" "$KHUSUS")"
done
for path in /laporan/rekap /absensi/rekap; do
  check "GET $path (rekap sendiri, SDM Khusus) -> 200" "200" "$(status "$path" "$KHUSUS")"
done
for path in /inventaris/peminjaman /inventaris/peminjaman/baru; do
  check "GET $path (SDM Khusus) -> 200" "200" "$(status "$path" "$KHUSUS")"
done
check "GET /inventaris/peminjaman/999999999 (tidak ada) -> 404" "404" "$(status /inventaris/peminjaman/999999999 "$KHUSUS")"

echo "== SDM Strategi"
login "SDM Strategi" sdm_strategi STRATEGI
for path in /galeri /planner /planner/baru /konten /laporan /laporan/rekap /absensi/rekap /layanan/internet/rekap /inventaris/peminjaman /inventaris/peminjaman/baru; do
  check "GET $path (SDM Strategi) -> 200" "200" "$(status "$path" "$STRATEGI")"
done
for path in /absensi /absensi/libur /tugas /tugas/baru /inventaris /setting/akun /setting/kanal /setting/tugas-rutin /laporan/tim /layanan/sdm/persetujuan /laporan/rekap/x /absensi/rekap/x; do
  check "GET $path (SDM Strategi) -> ditolak" "$denied" "$(status "$path" "$STRATEGI")"
done

echo "== Staf Unit Lain"
login "Staf Unit Lain" none OTHER
check "GET /planner (staf unit lain) -> ditolak" "$denied" "$(status /planner "$OTHER")"
check "GET /konten (staf unit lain) -> ditolak" "$denied" "$(status /konten "$OTHER")"
check "GET /laporan (staf unit lain) -> ditolak" "$denied" "$(status /laporan "$OTHER")"
for path in /layanan/sdm /layanan/sdm/saya /layanan/internet; do
  check "GET $path (staf unit lain) -> 200" "200" "$(status "$path" "$OTHER")"
done
for path in /galeri /layanan/sdm/persetujuan /layanan/internet/rekap /inventaris /inventaris/peminjaman /inventaris/peminjaman/baru; do
  check "GET $path (staf unit lain) -> ditolak" "$denied" "$(status "$path" "$OTHER")"
done
# Pengajuan milik orang lain harus 404 (keberadaannya tidak dibocorkan).
other_id=$(psql_db "select id from service_request where requested_by <> 'uji-akses-none' limit 1")
if [[ -n "$other_id" ]]; then
  check "GET /layanan/sdm/$other_id (milik orang lain) -> 404" "404" "$(status "/layanan/sdm/$other_id" "$OTHER")"
  check "GET /api/layanan/rundown/$other_id (milik orang lain) -> 404" "404" "$(status "/api/layanan/rundown/$other_id" "$OTHER")"
else
  echo "SKIP  id milik orang lain (tidak ada service_request milik akun lain)"
fi

echo "== Direktur"
login "Direktur" direktur DIR
check "GET /laporan (direktur tidak mengisi) -> ditolak" "$denied" "$(status /laporan "$DIR")"
check "GET /laporan/tim (direktur) -> 200" "200" "$(status /laporan/tim "$DIR")"
for path in /laporan/rekap /absensi/rekap; do
  check "GET $path (direktur) -> 200" "200" "$(status "$path" "$DIR")"
done
check "GET /laporan/rekap/tidak-ada (direktur) -> 404" "404" "$(status /laporan/rekap/tidak-ada "$DIR")"
for path in /tugas /absensi /absensi/libur /inventaris /inventaris/peminjaman /inventaris/peminjaman/baru; do
  check "GET $path (direktur) -> ditolak" "$denied" "$(status "$path" "$DIR")"
done
# Direktur melihat rekap tanpa tombol Buka kunci (hanya Manajer yang boleh membuka kunci).
body=$(curl -s -b "$DIR" "$BASE_URL/laporan/tim")
if [[ "$body" == *"Buka kunci"* ]]; then
  printf "FAIL  /laporan/tim (direktur) memuat tombol Buka kunci\n"
  fail=1
else
  printf "PASS  /laporan/tim (direktur) tanpa tombol Buka kunci\n"
fi

echo "== Manajer"
login "Manajer" manajer MGR
for path in /inventaris /inventaris/peminjaman /inventaris/peminjaman/baru /setting/akun /absensi /tugas /laporan/tim /planner/baru /layanan/sdm/persetujuan; do
  check "GET $path (manajer) -> 200" "200" "$(status "$path" "$MGR")"
done

echo "== Endpoint Better Auth yang ditutup (akun hanya diubah Manajer)"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$KHUSUS" -X POST "$BASE_URL/api/auth/update-user" \
  -H "content-type: application/json" -H "origin: $BASE_URL" --data '{"name":"Nama Palsu"}')
check "POST /api/auth/update-user -> 404" "404" "$code"

echo "== Akun dinonaktifkan saat sesi masih ada"
psql_db "update \"user\" set disabled_at = now() where id = 'uji-akses-sdm_khusus'" >/dev/null
check "GET / -> /masuk" "307 $BASE_URL/masuk" "$(status / "$KHUSUS")"

exit $fail
