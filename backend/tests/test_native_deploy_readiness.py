from importlib.util import module_from_spec, spec_from_file_location
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
import subprocess
from urllib.error import URLError

import pytest


def load(name, filename):
    spec = spec_from_file_location(name, Path(__file__).parents[2] / "deploy" / filename)
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def deploy(monkeypatch):
    module = load("native_production_test", "native-production.py")
    clock = SimpleNamespace(now=0.0)
    def sleep(seconds):
        clock.now += seconds
    monkeypatch.setattr(module, "time", SimpleNamespace(monotonic=lambda: clock.now, sleep=sleep))
    module.test_clock = clock
    return module


class Response(BytesIO):
    def __init__(self, status=200, payload=b'{"items": []}'):
        super().__init__(payload)
        self.status = status


def response_for(url):
    return Response(payload=b'{"status":"ok"}' if url.endswith('/health') else b'{"items":[]}')


def test_ready_requires_api_catalog_and_real_web_page(deploy, monkeypatch, capsys):
    calls = []
    def open_url(url, timeout):
        calls.append((url, timeout))
        return response_for(url)
    monkeypatch.setattr(deploy, "urlopen", open_url)
    deploy.ready()
    assert [url for url, _ in calls] == list(deploy.READINESS_URLS)
    assert 'http://localhost:3102/catalog' in deploy.READINESS_URLS
    assert "returned HTTP 200" in capsys.readouterr().out


def test_startup_connection_refusal_is_retried_without_premature_web_requests(deploy, monkeypatch):
    calls = []
    def open_url(url, timeout):
        calls.append(url)
        if deploy.test_clock.now < 2:
            raise URLError("connection refused")
        return response_for(url)
    monkeypatch.setattr(deploy, "urlopen", open_url)
    deploy.ready(timeout_seconds=5)
    assert calls[:3] == [deploy.READINESS_URLS[0]] * 3
    assert calls[-2:] == list(deploy.READINESS_URLS[1:])


@pytest.mark.parametrize("failure", ["http500", "timeout", "bad_json", "wrong_schema"])
def test_catalog_failure_never_passes_readiness_and_names_the_endpoint(deploy, monkeypatch, failure):
    def open_url(url, timeout):
        if "products?" in url:
            if failure == "http500":
                return Response(status=500)
            if failure == "timeout":
                raise TimeoutError("catalog read timed out")
            if failure == "bad_json":
                return Response(payload=b'broken')
            return Response(payload=b'{"error":"unavailable"}')
        assert ':3102' not in url
        return response_for(url)
    monkeypatch.setattr(deploy, "urlopen", open_url)
    with pytest.raises(RuntimeError, match=r"timed out after 3s.*8102/api/v1/products"):
        deploy.ready(timeout_seconds=3)
    assert deploy.test_clock.now == 3


def test_web_failure_is_reported_even_when_api_and_database_are_healthy(deploy, monkeypatch, capsys):
    def open_url(url, timeout):
        return Response(status=503) if ':3102' in url else response_for(url)
    monkeypatch.setattr(deploy, "urlopen", open_url)
    with pytest.raises(RuntimeError, match=r'localhost:3102/catalog.*HTTP 503'):
        deploy.ready(timeout_seconds=2)
    assert capsys.readouterr().out.count('Readiness waiting:') == 1


def test_each_probe_timeout_is_bounded_by_remaining_total_deadline(deploy, monkeypatch):
    timeouts = []
    def open_url(url, timeout):
        timeouts.append(timeout)
        deploy.test_clock.now += timeout
        raise TimeoutError()
    monkeypatch.setattr(deploy, "urlopen", open_url)
    with pytest.raises(RuntimeError):
        deploy.ready(timeout_seconds=2, request_timeout=5)
    assert timeouts == [2]
    assert deploy.test_clock.now == 2


def test_service_diagnostics_do_not_dump_environment_or_units(deploy, monkeypatch, capsys):
    calls = []
    def run(args, **kwargs):
        calls.append(args)
        assert kwargs['timeout'] == 5 and kwargs['check'] is False
        return SimpleNamespace(stdout='ActiveState=failed\nExecMainStatus=1', returncode=0)
    monkeypatch.setattr(deploy.subprocess, "run", run)
    deploy.report_service_states()
    assert len(calls) == 3
    assert all(args[:2] == ['systemctl','show'] for args in calls)
    assert all('Environment' not in args and 'cat' not in args for args in calls)
    assert 'ExecMainStatus=1' in capsys.readouterr().out


def test_remote_failure_is_short_and_does_not_dump_the_ssh_script(monkeypatch):
    remote = load("native_remote_test", "native-remote.py")
    def fail(args, **kwargs):
        raise subprocess.CalledProcessError(1, args)
    monkeypatch.setattr(remote.subprocess, "run", fail)
    with pytest.raises(SystemExit) as error:
        remote.run(['ssh','private-script-must-not-be-printed'])
    assert 'ssh failed (exit 1)' in str(error.value)
    assert 'private-script' not in str(error.value)
