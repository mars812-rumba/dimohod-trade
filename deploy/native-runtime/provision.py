"""Install only the dedicated Dimohod services; never touch Sunny services."""
import json
import os
from pathlib import Path
import pwd
import secrets
import subprocess

R = Path('/home/dimohod-production-runtime')
S = Path('/home/dimohod-production/release')
def run(*args, **kw):
    subprocess.run(args, check=True, **kw)
try:
    pwd.getpwnam('dimohod')
except KeyError:
    run('useradd', '--system', '--home-dir', str(R), '--shell', '/usr/sbin/nologin', 'dimohod')
for name in ['private', 'backups', 'pgdata', 'pgsocket', 'storage']:
    (R/name).mkdir(exist_ok=True)
    os.chmod(R/name, 0o700)
run('chown', '-R', 'dimohod:dimohod', str(R/'pgdata'), str(R/'pgsocket'), str(R/'storage'), str(R/'backups'))
env_file = R/'private/production.env'
if not env_file.exists():
    from dotenv import dotenv_values
    old = dotenv_values('/home/dimohod-recovery-runtime/recovery.env')
    env = {
        'DATABASE_URL': 'postgresql+asyncpg://dimohod_app:'+secrets.token_hex(24)+'@127.0.0.1:55433/dimohod',
        'MEDIA_STORAGE_DIR': str(R/'storage'),
        'REDIS_URL': 'redis://127.0.0.1:56379/0',
        'BOM_ADMIN_TOKEN': old['BOM_ADMIN_TOKEN'],
        'ADMIN_SESSION_COOKIE_SECURE': 'true',
        'BACKEND_CORS_ORIGINS': '["https://dimohod-trade.pro","https://www.dimohod-trade.pro"]',
        'SMTP_HOST': '', 'SMTP_PASSWORD': '', 'OPENAI_API_KEY': '',
        'API_BASE_URL': 'http://127.0.0.1:8102',
        'NEXT_PUBLIC_APP_URL': 'https://dimohod-trade.pro',
        'NEXT_PUBLIC_CATALOG_RECOVERY_NOTICE': 'Каталог восстанавливается. Цены предварительные; позиции [ТЕСТ] по 100 ₽ требуют уточнения. Стоимость подтверждает менеджер.',
        'NEXT_TELEMETRY_DISABLED': '1', 'NODE_ENV': 'production',
    }
    env_file.write_text(''.join(k+'='+json.dumps(v, ensure_ascii=False)+'\n' for k,v in env.items()))
    os.chmod(env_file, 0o600)
pg = R/'postgres/usr/lib/postgresql/16/bin'
lib = R/'postgres/usr/lib/x86_64-linux-gnu'
pg_env = {**os.environ, 'LD_LIBRARY_PATH': str(lib)}
if not (R/'pgdata/PG_VERSION').exists():
    run('runuser', '-u', 'dimohod', '--', str(pg/'initdb'), '-D', str(R/'pgdata'), '-L', str(R/'postgres/usr/share/postgresql/16'), '--encoding=UTF8', '--locale=C.UTF-8', '--auth-local=peer', '--auth-host=scram-sha-256', env=pg_env, stdout=subprocess.DEVNULL)
    with (R/'pgdata/postgresql.conf').open('a') as f:
        f.write("\nlisten_addresses='127.0.0.1'\nport=55433\nunix_socket_directories='/home/dimohod-production-runtime/pgsocket'\nshared_buffers='128MB'\nmax_connections=50\n")
units = {
'dimohod-postgres.service': f'''[Unit]
Description=Dimohod production PostgreSQL 16
After=network.target
[Service]
Type=simple
User=dimohod
Group=dimohod
Environment=LD_LIBRARY_PATH={lib}
ExecStart={pg}/postgres -D {R}/pgdata
KillSignal=SIGINT
TimeoutStopSec=120
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths={R}/pgdata {R}/pgsocket
[Install]
WantedBy=multi-user.target
''',
'dimohod-api.service': f'''[Unit]
Description=Dimohod production API
Requires=dimohod-postgres.service
After=network.target dimohod-postgres.service
[Service]
User=dimohod
Group=dimohod
WorkingDirectory={S}/backend
EnvironmentFile={env_file}
ExecStart={R}/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8102 --proxy-headers --forwarded-allow-ips=127.0.0.1
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths={R}/storage
[Install]
WantedBy=multi-user.target
''',
'dimohod-web.service': f'''[Unit]
Description=Dimohod production Next.js
After=network.target dimohod-api.service
[Service]
User=dimohod
Group=dimohod
WorkingDirectory={S}
EnvironmentFile={env_file}
ExecStart={R}/node/bin/node {S}/node_modules/next/dist/bin/next start {S}/apps/web --hostname 127.0.0.1 --port 3102
Restart=on-failure
RestartSec=5
UMask=0027
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths={S}/apps/web/.next/cache
[Install]
WantedBy=multi-user.target
'''}
for name, content in units.items():
    Path('/etc/systemd/system', name).write_text(content)
run('systemctl', 'daemon-reload')
run('systemctl', 'enable', '--now', 'dimohod-postgres.service')
print('Dedicated PostgreSQL service installed; secrets written privately.')
