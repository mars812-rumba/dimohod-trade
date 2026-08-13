#!/usr/bin/env bash
set -euo pipefail

project_root=/opt/dimohod-trade
backup_dir=/var/backups/dimohod-trade
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
temporary="$backup_dir/.postgres-$timestamp.dump.gz.tmp"
destination="$backup_dir/postgres-$timestamp.dump.gz"

install -d -m 700 "$backup_dir"
umask 077
cd "$project_root"
docker compose exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' | gzip -9 >"$temporary"
mv "$temporary" "$destination"
find "$backup_dir" -maxdepth 1 -type f -name 'postgres-*.dump.gz' -mtime +14 -delete
echo "Created $destination"
