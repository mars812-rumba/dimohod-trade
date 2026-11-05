import os
from pathlib import Path
import subprocess
from urllib.parse import urlsplit
from dotenv import dotenv_values

R = Path('/home/dimohod-production-runtime')
pg = R/'postgres/usr/lib/postgresql/16/bin'
env = {**os.environ, 'LD_LIBRARY_PATH': str(R/'postgres/usr/lib/x86_64-linux-gnu')}
marker = R/'private/database-restored'
if marker.exists():
    raise SystemExit('Already restored; refusing to replace live database.')
new = urlsplit(dotenv_values(R/'private/production.env')['DATABASE_URL'])
old = urlsplit(dotenv_values('/home/dimohod-recovery-runtime/recovery.env')['DATABASE_URL'])
dump = R/'backups/initial-recovered-catalog.dump'
subprocess.run([str(pg/'pg_dump'), '-h', old.hostname, '-p', str(old.port), '-U', old.username, '-d', old.path[1:], '-Fc', '-f', str(dump)], env={**env, 'PGPASSWORD': old.password}, check=True)
dump.chmod(0o600)
subprocess.run(['chown', 'dimohod:dimohod', str(dump)], check=True)
psql = ['runuser', '-u', 'dimohod', '--', str(pg/'psql'), '-h', str(R/'pgsocket'), '-p', '55433', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']
sql = f"CREATE ROLE dimohod_app LOGIN PASSWORD '{new.password}';\nCREATE DATABASE dimohod OWNER dimohod_app;\n"
subprocess.run(psql, input=sql, text=True, env=env, check=True, stdout=subprocess.DEVNULL)
subprocess.run(['runuser', '-u', 'dimohod', '--', str(pg/'pg_restore'), '-h', str(R/'pgsocket'), '-p', '55433', '-d', 'dimohod', '--no-owner', '--no-acl', '--role=dimohod_app', '--exit-on-error', str(dump)], env=env, check=True)
marker.write_text('Restored from recovered database, not an empty production catalog.\n')
marker.chmod(0o600)
subprocess.run(psql[:-4] + ['-d', 'dimohod', '-v', 'ON_ERROR_STOP=1', '-c', "SELECT (SELECT count(*) FROM skus) skus, (SELECT count(*) FROM products) families, (SELECT version_num FROM alembic_version) migration;"], env=env, check=True)
