from importlib.util import module_from_spec, spec_from_file_location
from io import BytesIO
from pathlib import Path
import json
from types import SimpleNamespace
from urllib.error import URLError

import pytest


def load_module(filename='tools/production_monitor.py'):
    spec = spec_from_file_location('monitor_test', Path(__file__).parents[2] / filename)
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def healthy(module):
    return {'checks': {'storage_write': True, 'database_catalog': True},
            'disk': {'free_bytes': 12 * module.GIB, 'total_bytes': 60 * module.GIB,
                     'free_inodes_fraction': .8}}


def test_disk_failures_independent_of_http_health():
    module = load_module()
    remote = healthy(module)
    assert module.assess(remote, {'homepage': True}) == []
    remote['disk']['free_bytes'] = 7 * module.GIB
    assert module.assess(remote, {'homepage': True}) == ['disk_warning']
    remote['disk']['free_bytes'] = 0
    remote['checks']['storage_write'] = False
    assert module.assess(remote, {'homepage': True}) == ['disk_critical', 'storage_write']
    assert module.assess(None, {'homepage': False}) == ['homepage', 'ssh']


def test_alert_debounce_reminder_recovery_and_failed_delivery_retry():
    module = load_module()
    state, event = module.transition({}, ['public_form'], 100)
    assert event is None
    state, event = module.transition(state, ['public_form'], 200)
    assert event == 'problem'
    # No delivery acknowledgement: the next run retries immediately.
    retry, event = module.transition(state, ['public_form'], 300)
    assert event == 'problem'
    state.update(notified=['public_form'], sent_at=300)
    state, event = module.transition(state, ['public_form'], 400)
    assert event is None
    state, event = module.transition(state, ['public_form'], 4000)
    assert event == 'problem'
    state, event = module.transition(state, [], 4100)
    assert event == 'recovery'
    state.update(notified=[], sent_at=4100)
    assert module.transition(state, [], 4200)[1] is None
    assert module.transition({}, ['disk_critical'], 100)[1] == 'problem'


def test_only_authorized_recipient(monkeypatch):
    module = load_module()
    monkeypatch.setenv('CODEX_BOT_ALLOWED_USER_IDS', '123')
    monkeypatch.delenv('DIMOHOD_MONITOR_CHAT_ID', raising=False)
    assert module.recipient() == 123
    monkeypatch.setenv('CODEX_BOT_ALLOWED_USER_IDS', '123,456')
    with pytest.raises(RuntimeError):
        module.recipient()
    monkeypatch.setenv('DIMOHOD_MONITOR_CHAT_ID', '456')
    assert module.recipient() == 456
    monkeypatch.setenv('DIMOHOD_MONITOR_CHAT_ID', '789')
    with pytest.raises(RuntimeError):
        module.recipient()
    monkeypatch.setenv('CODEX_BOT_ALLOWED_USER_IDS', '123')
    with pytest.raises(RuntimeError):
        module.recipient()


def test_check_only_never_writes_state_or_sends_alerts(tmp_path, monkeypatch):
    module = load_module()
    (tmp_path / 'remote-deploy.json').write_text('{}')
    monkeypatch.setattr(module, 'PRIVATE', tmp_path)
    monkeypatch.setattr(module, 'STATE', tmp_path / 'must-not-be-created')
    monkeypatch.setattr(module, 'remote_probe', lambda _: healthy(module))
    monkeypatch.setattr(module, 'public_checks', lambda: {'public_form': True})
    monkeypatch.setattr(module, 'send_alert', lambda *a: pytest.fail('Must not send'))
    monkeypatch.setattr('sys.argv', ['monitor', '--check-only'])
    assert module.main() == 0
    assert not (tmp_path / 'must-not-be-created').exists()


def test_failed_notification_is_retried_then_recovery_is_delivered(tmp_path, monkeypatch):
    module = load_module()
    (tmp_path / 'remote-deploy.json').write_text('{}')
    monkeypatch.setattr(module, 'PRIVATE', tmp_path)
    monkeypatch.setattr(module, 'STATE', tmp_path)
    monkeypatch.setattr(module, 'remote_probe', lambda _: healthy(module))
    monkeypatch.setattr(module, 'public_checks', lambda: {'public_form': False})
    monkeypatch.setenv('CODEX_BOT_TOKEN', 'test-token')
    monkeypatch.setenv('CODEX_BOT_ALLOWED_USER_IDS', '123')
    monkeypatch.delenv('DIMOHOD_MONITOR_CHAT_ID', raising=False)
    monkeypatch.setattr('sys.argv', ['monitor'])
    module.main()  # Debounce: no notification yet.
    path = tmp_path / 'production-monitor-state.json'
    before = path.read_bytes()
    def fail(*args):
        raise URLError('delivery failed')
    monkeypatch.setattr(module, 'send_alert', fail)
    with pytest.raises(URLError):
        module.main()
    assert path.read_bytes() == before
    sent = []
    monkeypatch.setattr(module, 'send_alert', lambda *args: sent.append(args))
    module.main()
    assert len(sent) == 1 and json.loads(path.read_text())['notified'] == ['public_form']
    module.main()
    assert len(sent) == 1
    monkeypatch.setattr(module, 'public_checks', lambda: {'public_form': True})
    module.main()
    assert len(sent) == 2 and 'восстановлена' in sent[-1][2]
    assert json.loads(path.read_text())['notified'] == []


@pytest.mark.parametrize('data', [{}, [], {'checks': {}, 'disk': {}}])
def test_malformed_remote_probe_is_not_treated_as_healthy(monkeypatch, data):
    module = load_module()
    monkeypatch.setattr(module.subprocess, 'run', lambda *a, **k: SimpleNamespace(stdout=json.dumps(data)))
    with pytest.raises(ValueError, match='Invalid remote'):
        module.remote_probe({'key': '/test', 'host': 'test'})


class Response(BytesIO):
    status = 200


def test_public_form_probe_cannot_create_real_lead(monkeypatch):
    module = load_module()
    requests = []
    def open_url(request, timeout):
        requests.append(request)
        if isinstance(request, str):
            return Response(b'{"items":[]}')
        assert request.full_url.endswith('/api/v1/leads')
        assert b'name="website"' in request.data and b'monitor-no-save' in request.data
        assert b'name="contact"' not in request.data and b'name="name"' not in request.data
        response = Response(b'{"id":"","email_status":"filtered"}')
        response.status = 201
        return response
    monkeypatch.setattr(module, 'urlopen', open_url)
    assert all(module.public_checks().values())
    assert len(requests) == 3
    monkeypatch.setattr(module, 'urlopen', lambda *a, **k: Response(b'broken JSON'))
    assert not module.public_checks()['public_form']


def test_http_failures_are_reported_without_exception_urls(monkeypatch):
    module = load_module()
    def fail(*args, **kwargs):
        raise URLError('secret URL must not be logged')
    monkeypatch.setattr(module, 'urlopen', fail)
    assert module.public_checks() == {'homepage': False, 'public_catalog': False, 'public_form': False}


def test_health_probe_detects_storage_failure_while_catalog_is_healthy(monkeypatch):
    module = load_module('deploy/native-runtime/health_probe.py')
    monkeypatch.setattr(module.shutil, 'disk_usage', lambda _: SimpleNamespace(free=0, total=100))
    monkeypatch.setattr(module.os, 'statvfs', lambda _: SimpleNamespace(f_files=100, f_favail=80))
    monkeypatch.setattr(module.subprocess, 'check_output', lambda *a, **k: 'active')
    monkeypatch.setattr(module, 'urlopen', lambda *a, **k: Response(b'{"items":[]}'))
    def fail_storage(*args, **kwargs):
        import subprocess
        raise subprocess.CalledProcessError(1, args)
    monkeypatch.setattr(module.subprocess, 'run', fail_storage)
    result = module.collect()
    assert result['checks']['database_catalog']
    assert not result['checks']['storage_write'] and result['disk']['free_bytes'] == 0
