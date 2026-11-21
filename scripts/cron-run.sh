#!/usr/bin/env bash
# Pembungkus untuk crontab: cron berjalan dengan PATH minimal tanpa nvm, jadi `pnpm`
# tidak ditemukan bila skrip dipanggil langsung. Lihat docs/operasional-cron.md.
#
#   scripts/cron-run.sh push:reminder
#
# Root repo diturunkan dari lokasi berkas ini, jadi repo boleh dipindah tanpa mengubah crontab.
set -euo pipefail

task="${1:?pakai: cron-run.sh <skrip pnpm admin, mis. push:reminder>}"
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=/dev/null
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"

cd "$repo"
echo "[$(date -Iseconds)] $task"
exec pnpm --filter admin "$task"
