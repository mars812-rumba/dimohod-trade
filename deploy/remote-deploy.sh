#!/usr/bin/env bash
set -euo pipefail

project_root=/opt/dimohod-trade
lock_file=/run/lock/dimohod-trade-deploy.lock

exec 9>"$lock_file"
if ! flock -n 9; then
  echo "Another Dimohod Trade deploy is already running" >&2
  exit 1
fi

cd "$project_root"
docker compose config --quiet
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
