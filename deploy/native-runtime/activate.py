from pathlib import Path
import subprocess

R = Path('/home/dimohod-production-runtime')
S = Path('/home/dimohod-production/release')
def run(*args):
    subprocess.run(args, check=True)
cache = S/'apps/web/.next/cache'
cache.mkdir(exist_ok=True)
run('chown', '-R', 'dimohod:dimohod', str(cache))
run('chown', 'root:root', str(R/'backups'))
(R/'backups').chmod(0o700)
units = {
'dimohod-backup.service': f'''[Unit]
Description=Dimohod database, media, CRM and source backup
Requires=dimohod-postgres.service
After=dimohod-postgres.service
[Service]
Type=oneshot
ExecStart={R}/venv/bin/python {R}/backup.py
UMask=0077
Nice=15
IOSchedulingClass=idle
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths={R}/backups
''',
'dimohod-backup.timer': '''[Unit]
Description=Daily private Dimohod backup
[Timer]
OnCalendar=*-*-* 03:20:00 UTC
RandomizedDelaySec=20m
Persistent=true
[Install]
WantedBy=timers.target
'''}
for name, content in units.items():
    Path('/etc/systemd/system', name).write_text(content)
hook = Path('/etc/letsencrypt/renewal-hooks/deploy/20-dimohod-nginx-reload')
hook.parent.mkdir(parents=True, exist_ok=True)
hook.write_text('#!/bin/sh\n/usr/sbin/nginx -t && /usr/bin/systemctl reload nginx\n')
hook.chmod(0o755)
run('systemctl', 'daemon-reload')
run('systemctl', 'enable', '--now', 'dimohod-web.service', 'dimohod-backup.timer')
run('install', '-m', '644', str(R/'nginx-https.conf'), '/etc/nginx/conf.d/dimohod-public.conf')
run('nginx', '-t')
run('systemctl', 'reload', 'nginx')
run('systemctl', 'start', '--no-block', 'dimohod-backup.service')
print('Production HTTPS and daily backup activated.')
