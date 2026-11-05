"""Private database, file CRM, catalog media, config and source backup."""
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
from urllib.parse import urlsplit
from dotenv import dotenv_values

R = Path('/home/dimohod-production-runtime')
os.umask(0o077)
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
folder = R/'backups'/stamp
folder.mkdir(mode=0o700)
envfile = R/'private/production.env'
url = urlsplit(dotenv_values(envfile)['DATABASE_URL'])
env = {**os.environ, 'PGPASSWORD': url.password, 'LD_LIBRARY_PATH': str(R/'postgres/usr/lib/x86_64-linux-gnu')}
pg = R/'postgres/usr/lib/postgresql/16/bin'
subprocess.run([str(pg/'pg_dump'), '-h', url.hostname, '-p', str(url.port), '-U', url.username, '-d', url.path[1:], '-Fc', '-f', str(folder/'database.dump')], check=True, env=env)
subprocess.run([str(pg/'pg_restore'), '--list', str(folder/'database.dump')], check=True, env=env, stdout=subprocess.DEVNULL)
subprocess.run(['tar', '-czf', str(folder/'storage.tar.gz'), '-C', str(R), 'storage'], check=True)
active_source = Path('/home/dimohod-production/current').resolve() if Path('/home/dimohod-production/current').exists() else Path('/home/dimohod-production/release')
subprocess.run(['tar', '-czf', str(folder/'source.tar.gz'), '--exclude=./node_modules', '--exclude=./apps/web/.next*', '--exclude=./.venv', '--exclude=./storage', '--exclude=./.git', '--exclude=__pycache__', '-C', str(active_source), '.'], check=True)
shutil.copy2(envfile, folder/'production.env')
for name in ['nginx-https.conf', 'backup.py', 'provision.py', 'OPERATIONS.md', 'check_https.py', 'verify_backup.py']:
    shutil.copy2(R/name, folder/name)
units = folder/'systemd'
units.mkdir()
for unit in Path('/etc/systemd/system').glob('dimohod-*'):
    if unit.name != 'dimohod-codex-bot.service' and unit.is_file():
        shutil.copy2(unit, units/unit.name)
manifest = {}
for f in folder.rglob('*'):
    if f.is_file():
        f.chmod(0o600)
        h = hashlib.sha256()
        with f.open('rb') as stream:
            for chunk in iter(lambda: stream.read(1024*1024), b''):
                h.update(chunk)
        manifest[str(f.relative_to(folder))] = h.hexdigest()
(folder/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
(folder/'COMPLETE').touch()
# Retain fourteen completed snapshots, preserving initial recovery dump.
complete = sorted(p for p in (R/'backups').iterdir() if p.is_dir() and (p/'COMPLETE').exists())
for expired in complete[:-14]:
    shutil.rmtree(expired)
print('Backup complete:', folder)
