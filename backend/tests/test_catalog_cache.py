import asyncio
from types import SimpleNamespace

import pytest
from redis.exceptions import ConnectionError

from app.core import catalog_cache


@pytest.fixture(autouse=True)
def reset_circuit(monkeypatch):
    monkeypatch.setattr(catalog_cache, "_redis_client", None)
    monkeypatch.setattr(catalog_cache, "_retry_after", 0.0)
    monkeypatch.setattr(catalog_cache, "_recovery_probe_running", False)
    monkeypatch.setattr(catalog_cache, "_invalidation_generation", 1)
    monkeypatch.setattr(catalog_cache, "_flushed_invalidation_generation", 0)


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.expirations: dict[str, int] = {}

    async def get(self, key: str) -> str | None:
        return self.values.get(key)

    async def set(self, key: str, value: object, *, nx: bool = False) -> bool:
        if nx and key in self.values:
            return False
        self.values[key] = str(value)
        return True

    async def setex(self, key: str, ttl: int, value: object) -> bool:
        self.values[key] = str(value)
        self.expirations[key] = ttl
        return True

    async def incr(self, key: str) -> int:
        value = int(self.values.get(key, "0")) + 1
        self.values[key] = str(value)
        return value


def test_catalog_cache_field_is_stable_and_parameter_specific() -> None:
    first = catalog_cache.catalog_cache_field("products", category="pipes", limit=48)
    reordered = catalog_cache.catalog_cache_field("products", limit=48, category="pipes")
    different = catalog_cache.catalog_cache_field("products", category="pipes", limit=24)

    assert first == reordered
    assert first != different


async def test_catalog_cache_round_trip_and_invalidation(monkeypatch) -> None:
    fake_redis = FakeRedis()
    monkeypatch.setattr(catalog_cache, "_client", lambda: fake_redis)
    field = catalog_cache.catalog_cache_field("filters", category="sendvich-truby")
    payload = {"diameters": [{"value": "100:200", "count": 1}]}

    assert await catalog_cache.get_catalog_cache(field) is None

    await catalog_cache.set_catalog_cache(field, payload, ttl_seconds=120)

    assert await catalog_cache.get_catalog_cache(field) == payload
    entry_keys = [key for key in fake_redis.values if ":filters:" in key]
    assert len(entry_keys) == 1
    assert fake_redis.expirations[entry_keys[0]] == 120

    await catalog_cache.invalidate_catalog_cache()

    assert await catalog_cache.get_catalog_cache(field) is None
    assert fake_redis.values[catalog_cache.CATALOG_CACHE_VERSION_KEY] == "2"


async def test_unavailable_redis_opens_circuit_and_does_not_log_connection_details(monkeypatch, caplog):
    calls = []
    class DownRedis(FakeRedis):
        async def incr(self, key):
            calls.append(key)
            raise ConnectionError("private-connection-detail")
    monkeypatch.setattr(catalog_cache, "_client", lambda: DownRedis())
    assert await catalog_cache.get_catalog_cache("products") is None
    await catalog_cache.set_catalog_cache("products", {"items": []})
    await catalog_cache.invalidate_catalog_cache()
    assert await catalog_cache.get_catalog_cache("tree") is None
    assert len(calls) == 1
    assert catalog_cache._invalidation_generation > catalog_cache._flushed_invalidation_generation
    assert caplog.text.count("Catalog cache unavailable") == 1
    assert "private-connection-detail" not in caplog.text


async def test_total_budget_bounds_a_hanging_connection_and_skips_repeated_work(monkeypatch):
    cancelled = asyncio.Event()
    class HangingRedis(FakeRedis):
        async def incr(self, key):
            try:
                await asyncio.sleep(10)
            finally:
                cancelled.set()
    monkeypatch.setattr(catalog_cache, "_client", lambda: HangingRedis())
    monkeypatch.setattr(catalog_cache, "CATALOG_CACHE_OPERATION_TIMEOUT_SECONDS", 0.02)
    start = asyncio.get_running_loop().time()
    assert await catalog_cache.get_catalog_cache("tree") is None
    await catalog_cache.set_catalog_cache("tree", {"items": []})
    assert cancelled.is_set()
    assert asyncio.get_running_loop().time() - start < 0.3


async def test_recovery_flushes_pending_admin_invalidation_before_reading_old_entries(monkeypatch):
    class SwitchableRedis(FakeRedis):
        down = False
        async def get(self, key):
            if self.down:
                raise ConnectionError("offline")
            return await super().get(key)
    client = SwitchableRedis()
    clock = [100.0]
    monkeypatch.setattr(catalog_cache, "time", SimpleNamespace(monotonic=lambda: clock[0]))
    monkeypatch.setattr(catalog_cache, "_client", lambda: client)
    await catalog_cache.set_catalog_cache("prices", {"price": 100})
    assert await catalog_cache.get_catalog_cache("prices") == {"price": 100}
    client.down = True
    assert await catalog_cache.get_catalog_cache("prices") is None
    await catalog_cache.invalidate_catalog_cache()  # DB update has already committed.
    client.down = False
    assert await catalog_cache.get_catalog_cache("prices") is None  # Still cooling down.
    clock[0] += catalog_cache.CATALOG_CACHE_RETRY_SECONDS + 1
    assert await catalog_cache.get_catalog_cache("prices") is None  # Old namespace is NOT reused.
    assert client.values[catalog_cache.CATALOG_CACHE_VERSION_KEY] == "2"
    await catalog_cache.set_catalog_cache("prices", {"price": 1001})
    assert await catalog_cache.get_catalog_cache("prices") == {"price": 1001}


async def test_only_one_recovery_probe_is_allowed_while_redis_is_reconnecting(monkeypatch):
    started, release = asyncio.Event(), asyncio.Event()
    calls = []
    class RecoveringRedis(FakeRedis):
        async def incr(self, key):
            calls.append(key)
            started.set()
            await release.wait()
            return await super().incr(key)
    monkeypatch.setattr(catalog_cache, "_retry_after", 1.0)
    monkeypatch.setattr(catalog_cache, "time", SimpleNamespace(monotonic=lambda: 2.0))
    monkeypatch.setattr(catalog_cache, "_client", lambda: RecoveringRedis())
    probe = asyncio.create_task(catalog_cache.get_catalog_cache("tree"))
    await started.wait()
    assert await catalog_cache.get_catalog_cache("other") is None
    assert len(calls) == 1
    release.set()
    await probe
    assert catalog_cache._recovery_probe_running is False
    assert catalog_cache._retry_after == 0


async def test_request_cancellation_is_not_swallowed_or_treated_as_redis_outage(monkeypatch):
    started = asyncio.Event()
    class WaitingRedis(FakeRedis):
        async def incr(self, key):
            started.set()
            await asyncio.sleep(10)
    monkeypatch.setattr(catalog_cache, "_client", lambda: WaitingRedis())
    task = asyncio.create_task(catalog_cache.get_catalog_cache("tree"))
    await started.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert catalog_cache._retry_after == 0


async def test_redis_client_disables_library_retries():
    client = catalog_cache._client()
    try:
        assert client.connection_pool.connection_kwargs["retry"].get_retries() == 0
    finally:
        await client.aclose()


async def test_invalid_json_is_a_miss_and_bad_payload_does_not_open_the_circuit(monkeypatch):
    client = FakeRedis()
    monkeypatch.setattr(catalog_cache, "_client", lambda: client)
    await catalog_cache.set_catalog_cache("tree", {"items": []})
    entry = next(key for key in client.values if ":tree" in key)
    client.values[entry] = "not JSON"
    assert await catalog_cache.get_catalog_cache("tree") is None
    cyclic = []
    cyclic.append(cyclic)
    await catalog_cache.set_catalog_cache("tree", cyclic)
    assert catalog_cache._retry_after == 0
    await catalog_cache.set_catalog_cache("tree", {"items": []})
    assert await catalog_cache.get_catalog_cache("tree") == {"items": []}


def test_catalog_endpoint_falls_back_to_db_when_cache_hangs(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.db.session import get_db
    from app.modules.catalog.router import router
    class HangingRedis(FakeRedis):
        async def incr(self, key):
            await asyncio.sleep(10)
    async def database_tree(session):
        return []
    monkeypatch.setattr(catalog_cache, "_client", lambda: HangingRedis())
    monkeypatch.setattr(catalog_cache, "CATALOG_CACHE_OPERATION_TIMEOUT_SECONDS", 0.01)
    monkeypatch.setattr("app.modules.catalog.router.get_catalog_tree", database_tree)
    app = FastAPI()
    app.include_router(router, prefix="/api/v1/catalog")
    app.dependency_overrides[get_db] = lambda: None
    with TestClient(app) as client:
        response = client.get("/api/v1/catalog/tree")
    assert response.status_code == 200
    assert response.json() == {"items": []}
    assert response.headers["X-Catalog-Cache"] == "MISS"


async def test_real_redis_client_is_bounded_when_tcp_server_never_replies(monkeypatch):
    writers = []
    handlers = set()
    async def blackhole(reader, writer):
        task = asyncio.current_task()
        handlers.add(task)
        writers.append(writer)
        try:
            await reader.read()  # Accept TCP but never send a Redis reply.
        finally:
            writer.close()
            await writer.wait_closed()
            handlers.discard(task)
    server = await asyncio.start_server(blackhole, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]
    monkeypatch.setattr(catalog_cache.settings, "redis_url", f"redis://127.0.0.1:{port}/0")
    try:
        async with server:
            start = asyncio.get_running_loop().time()
            assert await catalog_cache.get_catalog_cache("tree") is None
            elapsed = asyncio.get_running_loop().time() - start
            assert elapsed < 0.7
            assert catalog_cache._retry_after > 0
            assert await catalog_cache.get_catalog_cache("tree") is None
            assert len(writers) == 1
    finally:
        if catalog_cache._redis_client is not None:
            await catalog_cache._redis_client.aclose()
        for writer in writers:
            writer.close()
        if handlers:
            await asyncio.gather(*list(handlers), return_exceptions=True)
