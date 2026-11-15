#!/bin/bash
# Restore ONLY on a fresh, dedicated Ubuntu 24.04 x86_64 VPS.
set -euo pipefail
umask 077
kit_dir=$(cd -- "$(dirname -- "$0")" && pwd)
cd "$kit_dir"
sha256sum -c SHA256SUMS
test -f COMPLETE
if [[ "${1:-}" == '--verify-only' ]]; then
    for archive in application.tar.gz runtime.tar.gz storage.tar.gz system-config.tar.gz; do
        tar -tzf "$archive" >/dev/null
    done
    echo 'Recovery kit checksums and archives are valid. No services or data changed.'
    exit 0
fi
if [[ "${1:-}" != '--fresh-server' ]]; then
    echo 'Read DISASTER_RECOVERY.md first. Usage: bash restore-recovery-bundle.sh --verify-only | --fresh-server'
    exit 1
fi
[[ $EUID -eq 0 ]] || { echo 'Root required'; exit 1; }
. /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 24.04 && "$(uname -m)" == x86_64 ]] || {
    echo 'Requires Ubuntu 24.04 x86_64'; exit 1;
}
runtime=/home/dimohod-production-runtime
for target in "$runtime" /home/dimohod-production; do
    [[ ! -e "$target" ]] || { echo "Refusing to overwrite existing path: $target"; exit 1; }
done
for unit in dimohod-postgres dimohod-api dimohod-web; do
    if systemctl cat "$unit.service" >/dev/null 2>&1; then
        echo "Existing unit $unit found; refusing a restore over an existing installation."
        exit 1
    fi
done
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-venv python3-pip nginx certbot \
    curl ca-certificates libicu74 libldap2 libsasl2-2 libssl3t64 libxml2 libxslt1.1 liblz4-1 \
    libzstd1 libreadline8t64 zlib1g libgssapi-krb5-2 libffi8 libcairo2 libpango-1.0-0 \
    libpangocairo-1.0-0 libharfbuzz0b libjpeg-turbo8 libpng16-16t64 libwebp7 libpq5
if ! id dimohod >/dev/null 2>&1; then
    useradd --system --home-dir "$runtime" --shell /usr/sbin/nologin dimohod
fi
tar -xzf runtime.tar.gz -C /
tar -xzf application.tar.gz -C /
tar -xzf storage.tar.gz -C /
# Preserve ownership by account name, regardless of UID on the old server.
install -d -m 700 -o dimohod -g dimohod "$runtime/pgdata" "$runtime/pgsocket"
install -d -m 700 "$runtime/backups" "$runtime/private"
chmod 600 "$runtime/private/production.env"
chown -R dimohod:dimohod "$runtime/storage"
chown -R dimohod:dimohod /home/dimohod-production/current/apps/web/.next
export LD_LIBRARY_PATH="$runtime/postgres/usr/lib/x86_64-linux-gnu"
pg="$runtime/postgres/usr/lib/postgresql/16/bin"
runuser -u dimohod -- "$pg/initdb" -D "$runtime/pgdata" \
    -L "$runtime/postgres/usr/share/postgresql/16" --encoding=UTF8 --locale=C.UTF-8 \
    --auth-local=peer --auth-host=scram-sha-256 >/dev/null
install -m 600 -o dimohod -g dimohod postgresql.conf "$runtime/pgdata/postgresql.conf"
install -m 600 -o dimohod -g dimohod pg_hba.conf "$runtime/pgdata/pg_hba.conf"
# Restore database before installing/enabling any public application service.
runuser -u dimohod -- "$pg/pg_ctl" -D "$runtime/pgdata" -l "$runtime/pgdata/restore.log" -w start
trap 'runuser -u dimohod -- "$pg/pg_ctl" -D "$runtime/pgdata" -m fast -w stop || true' EXIT
connection=(-h "$runtime/pgsocket" -p 55433)
# initdb already created its bootstrap role. Other role attributes/password hashes
# and membership are restored from the actual production role dump.
sed '/^CREATE ROLE dimohod;$/d' roles.sql | \
    runuser -u dimohod -- "$pg/psql" "${connection[@]}" -d postgres -v ON_ERROR_STOP=1 >/dev/null
runuser -u dimohod -- "$pg/createdb" "${connection[@]}" -O dimohod_app dimohod
runuser -u dimohod -- "$pg/pg_restore" "${connection[@]}" -d dimohod --exit-on-error < database.dump
runuser -u dimohod -- "$pg/psql" "${connection[@]}" -d dimohod -At \
    -c 'SELECT version_num FROM alembic_version; SELECT count(*) FROM products; SELECT count(*) FROM skus;'
runuser -u dimohod -- "$pg/pg_ctl" -D "$runtime/pgdata" -m fast -w stop
trap - EXIT
tar -xzf system-config.tar.gz -C /
systemctl daemon-reload
nginx -t
systemctl enable --now dimohod-postgres.service dimohod-api.service dimohod-web.service dimohod-backup.timer
systemctl reload nginx
curl --retry 12 --retry-connrefused --retry-delay 2 --fail --silent --show-error \
    http://127.0.0.1:8102/api/v1/health
curl --retry 12 --retry-connrefused --retry-delay 2 --fail --silent --show-error \
    -o /dev/null http://127.0.0.1:3102/catalog
echo 'Restored. Verify HTTPS, CRM and media per DISASTER_RECOVERY.md BEFORE switching DNS.'
