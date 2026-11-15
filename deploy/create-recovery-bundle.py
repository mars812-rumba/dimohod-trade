"""Create a private, self-contained application recovery kit; never prune backups.

Run with the production runtime Python. Does not restart services or copy live PGDATA.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
from datetime import datetime, timezone

RUNTIME = Path('/home/dimohod-production-runtime')
BASE = Path('/home/dimohod-production')
PG = RUNTIME / 'postgres/usr/lib/postgresql/16/bin'
ENV = {**os.environ, 'LD_LIBRARY_PATH': str(RUNTIME / 'postgres/usr/lib/x86_64-linux-gnu')}
CONNECTION = ['-h', str(RUNTIME / 'pgsocket'), '-p', '55433']


def run(args, **kwargs):
    return subprocess.run(args, check=True, env=ENV, **kwargs)


def pg(tool, *args):
    return ['runuser', '-u', 'dimohod', '--', str(PG / tool), *CONNECTION, *args]


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def storage_manifest():
    return {
        str(path.relative_to(RUNTIME / 'storage')): sha256(path)
        for path in sorted((RUNTIME / 'storage').rglob('*')) if path.is_file()
    }


def main():
    if os.geteuid() != 0:
        raise SystemExit('Run as root on the production server.')
    os.umask(0o077)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    output = RUNTIME / 'disaster-recovery' / stamp
    output.mkdir(parents=True, mode=0o700)
    release = (BASE / 'current').resolve(strict=True)
    kit = Path(__file__).resolve().parent
    for name in ['restore-recovery-bundle.sh', 'DISASTER_RECOVERY.md']:
        shutil.copy2(kit / name, output / name)
    print('Creating recovery kit:', output, flush=True)

    # A logical database snapshot and files that stay identical throughout the
    # capture. Retry on concurrent media/CRM writes; do not pause the live API.
    for attempt in range(3):
        before = storage_manifest()
        with (output / 'database.dump').open('wb') as stream:
            run(pg('pg_dump', '-d', 'dimohod', '-Fc'), stdout=stream)
        run(['tar', '-czf', str(output / 'storage.tar.gz'), '-C', '/',
             'home/dimohod-production-runtime/storage'])
        if before == storage_manifest():
            (output / 'storage-files.json').write_text(json.dumps(before, indent=2) + '\n')
            break
    else:
        raise RuntimeError('Storage kept changing. Retry later; no complete kit was published.')
    with tarfile.open(output / 'storage.tar.gz', 'r:gz') as archived_storage:
        archived_files = {}
        for member in archived_storage:
            if member.isfile():
                stream = archived_storage.extractfile(member)
                digest = hashlib.sha256()
                for block in iter(lambda: stream.read(1024 * 1024), b''):
                    digest.update(block)
                relative = str(Path(member.name).relative_to('home/dimohod-production-runtime/storage'))
                archived_files[relative] = digest.hexdigest()
        if archived_files != before:
            raise RuntimeError('Archived storage does not match the snapshot hashes.')
    with (output / 'roles.sql').open('wb') as stream:
        run(pg('pg_dumpall', '--roles-only'), stdout=stream)
    run([str(PG / 'pg_restore'), '--list', str(output / 'database.dump')],
        stdout=subprocess.DEVNULL)

    # Include the exact working build, dependencies and interpreters. Absolute
    # paths embedded in Python venvs are preserved on a same-OS restore.
    run(['tar', '-czf', str(output / 'application.tar.gz'), '-C', '/',
         str(release).lstrip('/'), 'home/dimohod-production/current'])
    runtime_members = ['node', 'postgres', 'venv', 'acme', 'private/production.env']
    runtime_members += [p.name for p in RUNTIME.iterdir() if p.is_file() and p.suffix in {'.py', '.md', '.conf'}]
    if (RUNTIME / 'private/latest-release.json').exists():
        runtime_members.append('private/latest-release.json')
    run(['tar', '-czf', str(output / 'runtime.tar.gz'), '-C', '/',
         *['home/dimohod-production-runtime/' + name for name in runtime_members]])
    system_members = ['etc/nginx', 'etc/letsencrypt']
    system_members += [str(p).lstrip('/') for p in Path('/etc/systemd/system').glob('dimohod-*')
                       if p.is_file() and 'codex-bot' not in p.name]
    run(['tar', '-czf', str(output / 'system-config.tar.gz'), '-C', '/', *system_members])
    shutil.copy2(RUNTIME / 'pgdata/postgresql.conf', output / 'postgresql.conf')
    shutil.copy2(RUNTIME / 'pgdata/pg_hba.conf', output / 'pg_hba.conf')
    for name, args in {
        'packages.txt': ['dpkg-query', '-W', '-f=${binary:Package}\t${Version}\n'],
        'system.txt': ['uname', '-a'],
        'disk.txt': ['df', '-h'],
        'services.txt': ['systemctl', 'list-units', '--all', 'dimohod-*', '--no-pager'],
    }.items():
        with (output / name).open('w') as stream:
            run(args, stdout=stream)

    verification_db = 'dimohod_verify_' + datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    run(pg('createdb', verification_db))
    try:
        with (output / 'database.dump').open('rb') as stream:
            run(pg('pg_restore', '-d', verification_db, '--no-owner', '--no-acl', '--exit-on-error'), stdin=stream)
        tables = run(pg('psql', '-d', verification_db, '-At', '-c',
                        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"),
                     capture_output=True, text=True).stdout.splitlines()
        counts = {}
        for table in tables:
            quoted = '"' + table.replace('"', '""') + '"'
            counts[table] = int(run(pg('psql', '-d', verification_db, '-At', '-c',
                                      'SELECT count(*) FROM public.' + quoted),
                                   capture_output=True, text=True).stdout.strip())
        migration = run(pg('psql', '-d', verification_db, '-At', '-c',
                           'SELECT version_num FROM alembic_version'), capture_output=True, text=True).stdout.strip()
        report = {'database_restore': 'passed', 'migration': migration, 'table_rows': counts,
                  'storage_files': len(before), 'storage_stable_during_snapshot': True,
                  'created_at_utc': stamp, 'release_path': str(release),
                  'os': Path('/etc/os-release').read_text(), 'architecture': os.uname().machine,
                  'scope': 'Dimohod production application, not a full VPS disk image'}
        (output / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
    finally:
        # Only remove the uniquely named verification database created above.
        run(pg('dropdb', verification_db))

    for archive in output.glob('*.tar.gz'):
        run(['tar', '-tzf', str(archive)], stdout=subprocess.DEVNULL)
    if (BASE / 'current').resolve() != release:
        raise RuntimeError('Active release changed during capture. Retry after deployment finishes.')
    manifest = {p.name: sha256(p) for p in sorted(output.iterdir()) if p.is_file()}
    (output / 'SHA256SUMS').write_text(''.join(f'{digest}  {name}\n' for name, digest in manifest.items()))
    (output / 'COMPLETE').touch(mode=0o600)
    for file in output.iterdir():
        if file.is_file():
            file.chmod(0o600)
    archive = output.parent / ('dimohod-recovery-' + stamp + '.tar.gz')
    run(['tar', '-czf', str(archive), '-C', str(output.parent), output.name])
    archive.chmod(0o600)
    checksum = sha256(archive)
    archive.with_suffix(archive.suffix + '.sha256').write_text(checksum + '  ' + archive.name + '\n')
    print(json.dumps({'archive': str(archive), 'bytes': archive.stat().st_size,
                      'sha256': checksum, 'verification': report}, indent=2), flush=True)


if __name__ == '__main__':
    main()
