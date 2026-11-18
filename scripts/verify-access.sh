#!/usr/bin/env bash
# Verifikasi akses langsung lewat URL (PRD §10: otorisasi diuji termasuk akses langsung).
# Penolakan aksi server dibuktikan di vitest (packages/auth/src/authorize.test.ts),
# karena ID aksi server dibuat saat build dan tidak bisa dipanggil dengan curl secara andal.
#
# Pakai (server dev/produksi harus berjalan, akun SDM Khusus uji aktif & sudah ganti kata sandi):
#   BASE_URL=http://localhost:3000 VERIFY_SDM_USERNAME=... VERIFY_SDM_PASSWORD=... scripts/verify-access.sh
# Langkah "akun dinonaktifkan" memakai psql di container docker compose `db`.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
USER_NAME="${VERIFY_SDM_USERNAME:?isi VERIFY_SDM_USERNAME (akun SDM Khusus uji)}"
USER_PASS="${VERIFY_SDM_PASSWORD:?isi VERIFY_SDM_PASSWORD}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

fail=0
check() { # check <label> <expected-substring> <actual>
  if [[ "$3" == *"$2"* ]]; then
    printf "PASS  %s\n" "$1"
  else
    printf "FAIL  %s (harap: %s, dapat: %s)\n" "$1" "$2" "$3"
    fail=1
  fi
}
status() { # status <path> [cookie-jar]
  curl -s -o /dev/null -w "%{http_code} %{redirect_url}" ${2:+-b "$2"} "$BASE_URL$1"
}
psql_db() { docker compose exec -T db psql -U "${POSTGRES_USER:-itapp}" -d "${POSTGRES_DB:-itapp}" -qtAc "$1"; }

echo "== Tanpa sesi"
for path in /setting/akun /setting/kanal /galeri /planner /konten /konten/1 /; do
  check "GET $path -> /masuk" "307 $BASE_URL/masuk" "$(status "$path")"
done

check "GET /api/media/1 (tanpa sesi) -> 401" "401" "$(status /api/media/1)"

echo "== Masuk sebagai SDM Khusus ($USER_NAME)"
code=$(curl -s -o /dev/null -w "%{http_code}" -c "$JAR" -X POST "$BASE_URL/api/auth/sign-in/username" \
  -H "content-type: application/json" -H "origin: $BASE_URL" \
  --data "{\"username\":\"$USER_NAME\",\"password\":\"$USER_PASS\"}")
check "login" "200" "$code"

echo "== Akses langsung tanpa izin"
for path in /setting/akun /setting/kanal /setting/tugas-rutin; do
  check "GET $path -> ditolak" "307 $BASE_URL/?akses=ditolak" "$(status "$path" "$JAR")"
done
check "GET /galeri (diizinkan) -> 200" "200" "$(status /galeri "$JAR")"
check "GET /planner (diizinkan) -> 200" "200" "$(status /planner "$JAR")"
check "GET /planner/baru (tanpa planner.ubah) -> ditolak" "307 $BASE_URL/?akses=ditolak" "$(status /planner/baru "$JAR")"
check "GET /konten (diizinkan) -> 200" "200" "$(status /konten "$JAR")"
check "GET /konten/999999 (tidak ada) -> 404" "404" "$(status /konten/999999 "$JAR")"
check "GET /api/media/999999 (tidak ada) -> 404" "404" "$(status /api/media/999999 "$JAR")"

echo "== Staf Unit Lain (opsional: VERIFY_OTHER_USERNAME / VERIFY_OTHER_PASSWORD)"
if [[ -n "${VERIFY_OTHER_USERNAME:-}" && -n "${VERIFY_OTHER_PASSWORD:-}" ]]; then
  OTHER_JAR="$(mktemp)"
  code=$(curl -s -o /dev/null -w "%{http_code}" -c "$OTHER_JAR" -X POST "$BASE_URL/api/auth/sign-in/username" \
    -H "content-type: application/json" -H "origin: $BASE_URL" \
    --data "{\"username\":\"$VERIFY_OTHER_USERNAME\",\"password\":\"$VERIFY_OTHER_PASSWORD\"}")
  check "login staf unit lain" "200" "$code"
  check "GET /planner (staf unit lain) -> ditolak" "307 $BASE_URL/?akses=ditolak" "$(status /planner "$OTHER_JAR")"
  check "GET /konten (staf unit lain) -> ditolak" "307 $BASE_URL/?akses=ditolak" "$(status /konten "$OTHER_JAR")"
  rm -f "$OTHER_JAR"
else
  echo "SKIP  staf unit lain (variabel VERIFY_OTHER_* tidak diisi)"
fi

echo "== Endpoint Better Auth yang ditutup (akun hanya diubah Manajer)"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -X POST "$BASE_URL/api/auth/update-user" \
  -H "content-type: application/json" -H "origin: $BASE_URL" --data '{"name":"Nama Palsu"}')
check "POST /api/auth/update-user -> 404" "404" "$code"

echo "== Akun dinonaktifkan saat sesi masih ada"
psql_db "update \"user\" set disabled_at = now() where username = '$USER_NAME'"
check "GET / -> /masuk" "307 $BASE_URL/masuk" "$(status / "$JAR")"
psql_db "update \"user\" set disabled_at = null where username = '$USER_NAME'"

exit $fail
