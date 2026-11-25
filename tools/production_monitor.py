"""Independent production checks from the bot VPS; alerts only the configured owner."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import subprocess
import time
from urllib.request import Request, urlopen

SOURCE = Path(__file__).resolve().parents[1]
PRIVATE = Path('/home/dimohod-production-runtime/private')
STATE = Path('/home/codex-bot/.codex-telegram')
SITE = 'https://dimohod-trade.pro'
GIB = 1024 ** 3
LABELS = {'ssh': 'VPS недоступен по SSH', 'disk_warning': 'Мало места на диске',
          'disk_critical': 'Критически мало места на диске', 'inodes': 'Заканчиваются inode',
          'homepage': 'Главная страница недоступна', 'public_catalog': 'Каталог/API недоступен',
          'public_form': 'Приём формы через сайт не работает', 'database_catalog': 'Каталог из БД не работает',
          'storage_write': 'Запись заявок в хранилище не работает',
          'dimohod-api': 'API не работает', 'dimohod-web': 'Web не работает',
          'dimohod-postgres': 'PostgreSQL не работает'}


def remote_probe(config):
    result = subprocess.run(
        ['ssh', '-i', config['key'], '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
         '-o', 'ConnectTimeout=10', config['host'], 'python3 -'],
        input=(SOURCE / 'deploy/native-runtime/health_probe.py').read_text(),
        capture_output=True, text=True, timeout=55, check=True,
    )
    data = json.loads(result.stdout)
    expected = {'dimohod-api', 'dimohod-web', 'dimohod-postgres', 'database_catalog', 'storage_write'}
    try:
        disk, checks = data['disk'], data['checks']
        valid = (expected.issubset(checks) and all(isinstance(checks[key], bool) for key in expected)
                 and 0 <= disk['free_bytes'] <= disk['total_bytes'] and disk['total_bytes'] > 0
                 and 0 <= disk['free_inodes_fraction'] <= 1)
    except (KeyError, TypeError):
        valid = False
    if not valid:
        raise ValueError('Invalid remote diagnostic response')
    return data


def public_checks():
    checks = {}
    for key, path in [('homepage', '/'), ('public_catalog', '/api/v1/products?limit=1')]:
        try:
            with urlopen(SITE + path, timeout=12) as response:
                checks[key] = response.status == 200
                if key == 'public_catalog':
                    checks[key] &= isinstance(json.loads(response.read())['items'], list)
        except (OSError, ValueError, KeyError):
            checks[key] = False
    # No name or contact: even if honeypot handling regresses, no valid lead can be created.
    boundary = 'dimohod-monitor-boundary'
    fields = {'website': 'monitor-no-save', 'personal_data_consent': 'true',
              'consent_version': '2026-08-11', 'configuration': 'probe' * 1800}
    body = ''.join(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'
                   for key, value in fields.items()) + f'--{boundary}--\r\n'
    try:
        request = Request(SITE + '/api/v1/leads', data=body.encode(),
                          headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
        with urlopen(request, timeout=12) as response:
            data = json.loads(response.read())
            checks['public_form'] = (response.status == 201 and data.get('id') == ''
                                     and data.get('email_status') == 'filtered')
    except (OSError, ValueError, AttributeError):
        checks['public_form'] = False
    return checks


def assess(remote, checks):
    issues = {key for key, passed in checks.items() if not passed}
    if remote is None:
        issues.add('ssh')
    else:
        issues.update(key for key, passed in remote['checks'].items() if not passed)
        disk = remote['disk']
        fraction = disk['free_bytes'] / disk['total_bytes']
        if disk['free_bytes'] < 3 * GIB or fraction < .05:
            issues.add('disk_critical')
        elif disk['free_bytes'] < 8 * GIB or fraction < .15:
            issues.add('disk_warning')
        if disk['free_inodes_fraction'] < .10:
            issues.add('inodes')
    return sorted(issues)


def transition(previous, issues, now):
    """Two consecutive failures, immediate disk critical, recovery, hourly reminders."""
    count = previous.get('failures', 0) + 1 if issues else 0
    notified = previous.get('notified', [])
    ready = count >= 2 or 'disk_critical' in issues
    event = None
    if issues and ready and (issues != notified or now - previous.get('sent_at', 0) >= 3600):
        event = 'problem'
    elif not issues and notified:
        event = 'recovery'
    state = {**previous, 'issues': issues, 'failures': count, 'checked_at': now}
    return state, event


def send_alert(token, chat_id, text):
    request = Request('https://api.telegram.org/bot' + token + '/sendMessage',
                      data=json.dumps({'chat_id': chat_id, 'text': text}).encode(),
                      headers={'Content-Type': 'application/json'})
    with urlopen(request, timeout=10) as response:
        if not json.loads(response.read()).get('ok'):
            raise RuntimeError('Telegram rejected monitoring alert')


def recipient():
    allowed = {int(value.strip()) for value in os.environ.get('CODEX_BOT_ALLOWED_USER_IDS', '').split(',')
               if value.strip()}
    explicit = os.environ.get('DIMOHOD_MONITOR_CHAT_ID')
    if explicit:
        if int(explicit) not in allowed:
            raise RuntimeError('Monitoring recipient is not an authorized bot user')
        return int(explicit)
    if len(allowed) == 1:
        return allowed.pop()
    raise RuntimeError('Set DIMOHOD_MONITOR_CHAT_ID to an authorized bot user')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check-only', action='store_true', help='No alerts or persistent state')
    parser.add_argument('--announce', action='store_true', help='Send an explicit activation check to the owner')
    args = parser.parse_args()
    os.umask(0o077)
    config = json.loads((PRIVATE / 'remote-deploy.json').read_text())
    if args.check_only:
        try:
            remote = remote_probe(config)
        except (OSError, ValueError, subprocess.SubprocessError):
            remote = None
        checks = public_checks()
        issues = assess(remote, checks)
        print(json.dumps({'issues': issues, 'remote': remote, 'public': checks}), flush=True)
        return int(bool(issues))
    token = os.environ.get('CODEX_BOT_TOKEN')
    if not token:
        raise RuntimeError('Monitoring bot token is missing')
    chat_id = recipient()
    state_path = STATE / 'production-monitor-state.json'
    with (STATE / 'production-monitor.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            remote = remote_probe(config)
        except (OSError, ValueError, subprocess.SubprocessError):
            remote = None
        checks = public_checks()
        issues = assess(remote, checks)
        print(json.dumps({'issues': issues, 'remote': remote, 'public': checks}), flush=True)
        try:
            previous = json.loads(state_path.read_text())
        except (FileNotFoundError, ValueError):
            previous = {}
        if not isinstance(previous, dict):
            previous = {}
        now = time.time()
        state, event = transition(previous, issues, now)
        if args.announce:
            text = ('Дымоход Трейд: мониторинг включён. Проверки каждые 5 минут: '
                    'место на диске, база, хранилище заявок и формы. '
                    'При сбое пришлю уведомление сюда.')
            if issues:
                text += '\nСейчас требуют проверки: ' + ', '.join(LABELS.get(key, key) for key in issues)
            send_alert(token, chat_id, text)
        if event:
            text = ('Дымоход Трейд: работа сайта восстановлена.' if event == 'recovery' else
                    'Дымоход Трейд: требуется проверка.\n' + '\n'.join(LABELS.get(key, key) for key in issues))
            if remote:
                text += f"\nСвободно на диске: {remote['disk']['free_bytes'] / GIB:.1f} ГиБ."
            # Persist delivery state only after success; retry if Telegram is unavailable.
            send_alert(token, chat_id, text)
            state.update(notified=issues, sent_at=now)
        temporary = state_path.with_suffix('.tmp')
        temporary.write_text(json.dumps(state) + '\n')
        temporary.replace(state_path)
        return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as error:
        # HTTPError URLs can contain bot credentials: never print exception text/traceback.
        print('Production monitor failed: ' + type(error).__name__, flush=True)
        raise SystemExit(2)
