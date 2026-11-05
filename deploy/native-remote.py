"""Send committed source to the production VPS and run its native deployment.

Run on the bot VPS. Configuration lives in private/remote-deploy.json beside
production.env; application data, environment files and keys never enter bundles.
"""
import fcntl
import json
import os
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path

RUNTIME = Path('/home/dimohod-production-runtime')
SOURCE = Path('/home/dimohod-recovery')


def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def main():
    os.umask(0o077)
    config = json.loads((RUNTIME / 'private/remote-deploy.json').read_text())
    lock = (RUNTIME / 'private/remote-deploy.lock').open('a')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    sys.path.insert(0, str(SOURCE))
    from tools.codex_telegram_bot.bot import is_protected_commit_path
    changed = subprocess.check_output(
        ['git', 'diff', '--name-only', '-z', 'HEAD'], cwd=SOURCE,
    ).decode().split('\0')
    changed += subprocess.check_output(
        ['git', 'ls-files', '--others', '--exclude-standard', '-z'], cwd=SOURCE,
    ).decode().split('\0')
    if any(path and not is_protected_commit_path(path) for path in changed):
        raise SystemExit('Commit all source changes first: /push or /ship.')
    commit = subprocess.check_output(
        ['git', 'rev-parse', 'HEAD'], cwd=SOURCE, text=True,
    ).strip()
    ssh = ['ssh', '-i', config['key'], '-o', 'IdentitiesOnly=yes',
           '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15']
    deployed = subprocess.check_output(
        [*ssh, config['host'], 'git -C /home/dimohod-recovery rev-parse HEAD'],
        text=True,
    ).strip()
    if len(deployed) != 40 or any(char not in '0123456789abcdef' for char in deployed):
        raise SystemExit('Invalid production source commit.')
    remote_bundle = str(RUNTIME / 'private/incoming-source.bundle')
    with tempfile.TemporaryDirectory(dir=RUNTIME / 'private') as folder:
        bundle = str(Path(folder) / 'source.bundle')
        if deployed == commit:
            remote_bundle = '-'
        else:
            revisions = ['HEAD']
            if subprocess.run(['git', 'merge-base', '--is-ancestor', deployed, commit],
                              check=False, cwd=SOURCE, capture_output=True).returncode == 0:
                revisions.append('^' + deployed)
            run(['git', 'bundle', 'create', bundle, *revisions], cwd=SOURCE)
            run(['rsync', '-a', '-e', shlex.join(ssh), bundle,
                 config['host'] + ':' + remote_bundle])
        # Fixed remote operations; all variable arguments are shell quoted.
        script = r'''
import subprocess, sys
from pathlib import Path
source = '/home/dimohod-recovery'
bundle, commit = sys.argv[1:]
def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)
state = subprocess.check_output(['systemctl', 'show', 'dimohod-deploy.service',
                                 '-p', 'ActiveState', '--value'], text=True).strip()
if state in ('active', 'activating'):
    raise SystemExit('A production deployment is already running.')
run(['git', 'diff', '--quiet', 'HEAD'], cwd=source)
if subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard'],
                           cwd=source).strip():
    raise SystemExit('Unexpected untracked files in production source checkout.')
if bundle != '-':
    run(['git', 'fetch', bundle, 'HEAD'], cwd=source)
actual = subprocess.check_output(['git', 'rev-parse', 'FETCH_HEAD' if bundle != '-' else 'HEAD'],
                                  cwd=source, text=True).strip()
if actual != commit:
    raise SystemExit('Transferred commit does not match requested release.')
run(['git', 'checkout', '--detach', commit], cwd=source)
started = subprocess.check_output(['date', '--iso-8601=seconds'], text=True).strip()
result = subprocess.run(['systemctl', 'start', 'dimohod-deploy.service'])
run(['journalctl', '-u', 'dimohod-deploy.service', '--since', started,
     '-o', 'cat', '--no-pager', '-n', '40'])
if result.returncode:
    raise SystemExit(result.returncode)
if bundle != '-':
    Path(bundle).unlink(missing_ok=True)
'''
        command = shlex.join(['python3', '-c', script, remote_bundle, commit])
        run([*ssh, config['host'], command])
    print(f'Production deployed on {config["host"]}: {commit[:12]}')


if __name__ == '__main__':
    main()
