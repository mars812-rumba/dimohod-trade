"""Install only the independent observer on the bot VPS; no application deployment."""
import hashlib
import os
from pathlib import Path
import shutil
import subprocess

SOURCE = Path(__file__).resolve().parents[1]
BASE = Path('/home/codex-bot/production-monitor')
FILES = ('tools/production_monitor.py', 'deploy/native-runtime/health_probe.py')


def main():
    os.umask(0o077)
    if not Path('/home/codex-bot/.env').is_file():
        raise SystemExit('Bot environment is missing')
    if not Path('/home/dimohod-production-runtime/private/remote-deploy.json').is_file():
        raise SystemExit('Remote production configuration is missing')
    digest = hashlib.sha256(b''.join((SOURCE / p).read_bytes() for p in FILES)).hexdigest()[:16]
    release = BASE / 'releases' / digest
    for relative in FILES:
        destination = release / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SOURCE / relative, destination)
    pending = BASE / 'current.pending'
    pending.unlink(missing_ok=True)
    pending.symlink_to(release, target_is_directory=True)
    pending.replace(BASE / 'current')
    for suffix in ('service', 'timer'):
        name = 'dimohod-production-monitor.' + suffix
        destination = Path('/etc/systemd/system') / name
        shutil.copy2(SOURCE / 'deploy' / name, destination)
        destination.chmod(0o644)
    subprocess.run(['systemctl', 'daemon-reload'], check=True)
    subprocess.run(['systemctl', 'enable', '--now', 'dimohod-production-monitor.timer'], check=True)
    subprocess.run(['systemctl', 'start', 'dimohod-production-monitor.service'], check=True)
    print('Independent monitor installed; application release unchanged.')


if __name__ == '__main__':
    main()
