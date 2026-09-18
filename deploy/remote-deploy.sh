#!/usr/bin/env bash
set -euo pipefail

project_root=/opt/dimohod-trade
lock_file=${TMPDIR:-/tmp}/dimohod-trade-deploy.lock

exec 9>"$lock_file"
if ! flock -n 9; then
  echo "Another Dimohod Trade deploy is already running" >&2
  exit 1
fi

cd "$project_root"
docker compose config --quiet

# BuildKit cache is disposable but can grow quickly during frequent releases.
# Keep enough headroom for a clean Next.js and backend image build without
# touching running containers, application volumes, or uploaded media.
min_available_kb=$((16 * 1024 * 1024))
available_kb=$(df -Pk "$project_root" | awk 'NR == 2 { print $4 }')
if (( available_kb < min_available_kb )); then
  echo "Low disk space before build; pruning Docker builder cache"
  docker builder prune -af
fi

docker compose --progress quiet up -d --build backend web

for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error http://127.0.0.1:8000/api/v1/health >/dev/null \
    && curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null; then
    docker compose ps backend web
    echo "Dimohod Trade deploy completed"
    exit 0
  fi
  sleep 2
done

docker compose ps
docker compose logs --tail=100 backend web
echo "Dimohod Trade health check failed" >&2
exit 1
