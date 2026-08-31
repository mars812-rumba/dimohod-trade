from app.core import catalog_cache


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
