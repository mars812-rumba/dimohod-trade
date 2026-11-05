"""Restore a snapshot into a separate disposable verification database."""
import json
import os
from pathlib import Path
import subprocess
R = Path('/home/dimohod-production-runtime')
folder = max(p for p in (R/'backups').iterdir() if p.is_dir() and (p/'COMPLETE').exists())
pg = R/'postgres/usr/lib/postgresql/16/bin'
env = {**os.environ, 'LD_LIBRARY_PATH': str(R/'postgres/usr/lib/x86_64-linux-gnu')}
base = ['runuser', '-u', 'dimohod', '--']
connection = ['-h', str(R/'pgsocket'), '-p', '55433']
name = 'dimohod_backup_verification'
def run(args, **kwargs):
    return subprocess.run(args, check=True, env=env, **kwargs)
run(base+[str(pg/'createdb')]+connection+[name])
try:
    # The root process opens the private snapshot; PG restores via stdin.
    with (folder/'database.dump').open('rb') as stream:
        run(base+[str(pg/'pg_restore')]+connection+['-d', name, '--no-owner', '--no-acl', '--exit-on-error'], stdin=stream)
    result = run(base+[str(pg/'psql')]+connection+['-d', name, '-At', '-c', 'SELECT count(*) FROM skus; SELECT count(*) FROM products; SELECT version_num FROM alembic_version;'], capture_output=True, text=True).stdout.strip().splitlines()
    assert result == ['6982', '36', '202610220001'], result
    run(['tar', '-tzf', str(folder/'storage.tar.gz')], stdout=subprocess.DEVNULL)
    report = {'backup': str(folder), 'restored_skus': int(result[0]), 'families': int(result[1]), 'migration': result[2], 'storage_archive': 'readable'}
    (R/'backup-restore-check.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2))
finally:
    run(base+[str(pg/'dropdb')]+connection+[name])
