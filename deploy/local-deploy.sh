#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
lock_file=${TMPDIR:-/tmp}/dimohod-trade-local-deploy.lock

exec 9>"$lock_file"
if ! flock -n 9; then
  echo "Another local Dimohod Trade deploy is already running" >&2
  exit 1
fi

cd "$project_root"
docker compose config --quiet

# Telegram releases build locally before syncing production. Keep enough disk
# headroom for Next.js/BuildKit while preserving containers, volumes and media.
min_available_kb=$((12 * 1024 * 1024))
available_kb=$(df -Pk "$project_root" | awk 'NR == 2 { print $4 }')
if (( available_kb < min_available_kb )); then
  echo "Low local disk space before build; pruning disposable Docker caches"
  docker builder prune -af
  docker image prune -af
fi

docker compose up -d --build backend web
docker compose ps backend web
