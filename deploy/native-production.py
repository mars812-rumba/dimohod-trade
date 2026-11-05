"""Deploy a committed Dimohod release on the temporary native VPS stack.

Does not import prices, reset PostgreSQL, overwrite storage, or start bots/mail.
"""
import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
from datetime import datetime, timezone
from urllib.request import urlopen

SOURCE = Path(__file__).resolve().parents[1]
BASE = Path('/home/dimohod-production')
RUNTIME = Path('/home/dimohod-production-runtime')

def run(*args, cwd=None, env=None, **kwargs):
    return subprocess.run(args, cwd=cwd, env=env, check=True, **kwargs)

def ready():
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        try:
            for url in ['http://127.0.0.1:8102/api/v1/products?limit=1', 'http://127.0.0.1:3102/catalog']:
                with urlopen(url, timeout=5) as response:
                    if response.status != 200:
                        raise RuntimeError('Health check failed')
            return
        except Exception:
            time.sleep(1)
    raise RuntimeError('Production readiness check timed out')

def main():
    if os.geteuid() != 0:
        raise SystemExit('Run via the root bot release manager on the production VPS.')
    os.umask(0o022)
    if not (RUNTIME/'private/production.env').is_file():
        raise SystemExit('Production configuration is missing; refusing a fresh/empty deployment.')
    lock = (RUNTIME/'private/deploy.lock').open('a')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    sys.path.insert(0, str(SOURCE))
    from tools.codex_telegram_bot.bot import is_protected_commit_path
    changed = subprocess.check_output(['git', 'diff', '--name-only', '-z', 'HEAD'], cwd=SOURCE).decode().split('\0')
    changed += subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '-z'], cwd=SOURCE).decode().split('\0')
    if any(path and not is_protected_commit_path(path) for path in changed):
        raise SystemExit('Commit all source changes first: /push or /ship.')
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=SOURCE, text=True).strip()
    from dotenv import dotenv_values
    envfile = RUNTIME/'private/production.env'
    old_env = envfile.read_text()
    config = {k: v for k, v in dotenv_values(envfile).items() if v is not None}
    current = BASE/'current'
    previous = current.resolve() if current.exists() else BASE/'release'
    if not (previous/'.venv').exists():
        (previous/'.venv').symlink_to(RUNTIME/'venv', target_is_directory=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    release = BASE/'releases'/f'{stamp}-{commit[:12]}'
    release.mkdir(parents=True)
    # git archive exports committed source only; ignored credentials stay out.
    with tempfile.TemporaryFile() as archive:
        run('git', 'archive', '--format=tar', 'HEAD', cwd=SOURCE, stdout=archive)
        archive.seek(0)
        run('tar', '-xf', '-', '-C', str(release), stdin=archive)
    env = {**os.environ, **config, 'PATH': str(RUNTIME/'node/bin')+':'+os.environ['PATH'], 'NEXT_DIST_DIR': '.next', 'PIP_CACHE_DIR': str(RUNTIME/'private/pip-cache'), 'npm_config_cache': str(RUNTIME/'private/npm-cache')}
    run('python3', '-m', 'venv', str(release/'.venv'))
    pip = release/'.venv/bin/pip'
    run(str(pip), 'install', '--disable-pip-version-check', '-r', str(release/'backend/requirements-production.txt'), str(release/'backend'), stdout=subprocess.DEVNULL)
    dependencies = ['package-lock.json', 'package.json', 'apps/web/package.json']
    unchanged = all((previous/p).exists() and (release/p).read_bytes() == (previous/p).read_bytes() for p in dependencies)
    if unchanged and (previous/'node_modules').is_dir():
        run('cp', '-al', str(previous/'node_modules'), str(release/'node_modules'))
    else:
        run(str(RUNTIME/'node/bin/npm'), 'ci', '--no-audit', '--no-fund', cwd=release, env=env)
    run(str(RUNTIME/'node/bin/node'), str(release/'node_modules/next/dist/bin/next'), 'build', str(release/'apps/web'), cwd=release, env=env)
    cache = release/'apps/web/.next/cache'
    cache.mkdir(exist_ok=True)
    run('chown', '-R', 'dimohod:dimohod', str(release/'apps/web/.next'))
    run('systemctl', 'start', 'dimohod-backup.service')
    units = {}
    for name in ['dimohod-api.service', 'dimohod-web.service']:
        path = Path('/etc/systemd/system')/name
        units[path] = path.read_text()
    switched = False
    try:
        run('systemctl', 'stop', 'dimohod-api.service')
        # Upgrade the existing database only; never seed or recreate it.
        run(str(release/'.venv/bin/alembic'), 'upgrade', 'head', cwd=release/'backend', env=env)
        pending = BASE/'current.pending'
        pending.unlink(missing_ok=True)
        pending.symlink_to(release, target_is_directory=True)
        pending.replace(current)
        switched = True
        lines = [line for line in old_env.splitlines() if not line.startswith('NEXT_DIST_DIR=')]
        envfile.write_text('\n'.join(lines)+'\nNEXT_DIST_DIR=".next"\n')
        envfile.chmod(0o600)
        for path, original in units.items():
            text = original.replace(str(BASE/'release'), str(current))
            if path.name == 'dimohod-api.service':
                text = text.replace(str(RUNTIME/'venv/bin/uvicorn'), str(current/'.venv/bin/uvicorn'))
            else:
                text = text.replace('--hostname 127.0.0.1', '--hostname localhost')
                text = '\n'.join('ReadWritePaths='+str(BASE) if line.startswith('ReadWritePaths=') else line for line in text.splitlines())+'\n'
            path.write_text(text)
        run('systemctl', 'daemon-reload')
        run('systemctl', 'restart', 'dimohod-api.service', 'dimohod-web.service')
        ready()
    except Exception:
        if switched:
            pending = BASE/'current.rollback'
            pending.unlink(missing_ok=True)
            pending.symlink_to(previous, target_is_directory=True)
            pending.replace(current)
        envfile.write_text(old_env)
        envfile.chmod(0o600)
        for path, text in units.items():
            path.write_text(text)
        run('systemctl', 'daemon-reload')
        run('systemctl', 'restart', 'dimohod-api.service', 'dimohod-web.service')
        print('Previous application restored. Database migrations are not automatically downgraded; a pre-deploy backup is available.', file=sys.stderr)
        raise
    record = {'commit': commit, 'release': str(release), 'previous_release': str(previous), 'deployed_at_utc': stamp}
    (RUNTIME/'private/latest-release.json').write_text(json.dumps(record, indent=2)+'\n')
    print(f'Production ready: https://dimohod-trade.pro ({commit[:12]})')

if __name__ == '__main__':
    main()
