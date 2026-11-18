from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
import hashlib
import json
import logging
import time
from typing import Any

from redis.asyncio import Redis
from redis.asyncio.retry import Retry
from redis.backoff import NoBackoff
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)

CATALOG_CACHE_PREFIX = "dimohod-trade:public-catalog"
CATALOG_CACHE_VERSION_KEY = f"{CATALOG_CACHE_PREFIX}:version"
CATALOG_CACHE_TTL_SECONDS = 300
CATALOG_CACHE_OPERATION_TIMEOUT_SECONDS = 0.25
CATALOG_CACHE_RETRY_SECONDS = 30

_redis_client: Redis | None = None
_retry_after = 0.0
_recovery_probe_running = False
# Bump the shared version at startup too: migrations may have changed the DB
# while an old Redis namespace still contains pre-release prices.
_invalidation_generation = 1
_flushed_invalidation_generation = 0


def catalog_cache_field(namespace: str, **parameters: object) -> str:
    serialized = json.dumps(
        parameters,
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
        default=str,
    )
    digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:24]
    return f"{namespace}:{digest}"


def _client() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=0.2,
            socket_timeout=0.5,
            retry=Retry(NoBackoff(), 0),
        )
    return _redis_client


async def _catalog_cache_version(client: Redis) -> int:
    raw_version = await client.get(CATALOG_CACHE_VERSION_KEY)
    if raw_version is not None:
        try:
            return int(raw_version)
        except ValueError:
            pass
    await client.set(CATALOG_CACHE_VERSION_KEY, 1, nx=True)
    raw_version = await client.get(CATALOG_CACHE_VERSION_KEY)
    try:
        return int(raw_version or 1)
    except ValueError:
        return 1


def _entry_key(version: int, field: str) -> str:
    return f"{CATALOG_CACHE_PREFIX}:v{version}:{field}"


async def _with_cache(operation: Callable[[Redis], Awaitable[Any]]) -> Any | None:
    """Bound ALL Redis work and bypass it briefly after failure, never the DB."""
    global _retry_after, _recovery_probe_running
    global _invalidation_generation, _flushed_invalidation_generation
    if time.monotonic() < _retry_after:
        return None
    recovering = _retry_after > 0
    if recovering and _recovery_probe_running:
        return None
    if recovering:
        _recovery_probe_running = True
    try:
        async with asyncio.timeout(CATALOG_CACHE_OPERATION_TIMEOUT_SECONDS):
            client = _client()
            generation = _invalidation_generation
            if generation > _flushed_invalidation_generation:
                await client.incr(CATALOG_CACHE_VERSION_KEY)
                # Do not lose another invalidation arriving during the await.
                _flushed_invalidation_generation = max(_flushed_invalidation_generation, generation)
            result = await operation(client)
        _retry_after = 0.0
        return result
    except (RedisError, TimeoutError) as exc:
        now = time.monotonic()
        if now >= _retry_after:
            # Exception messages can contain connection details. Log only type.
            logger.warning("Catalog cache unavailable (%s); bypassing Redis for %s seconds",
                           type(exc).__name__, CATALOG_CACHE_RETRY_SECONDS)
        _retry_after = now + CATALOG_CACHE_RETRY_SECONDS
        # Never reuse possibly stale entries after reconnecting, including when
        # an admin mutation could not invalidate the cache during the outage.
        _invalidation_generation += 1
        return None
    finally:
        if recovering:
            _recovery_probe_running = False


async def get_catalog_cache(field: str) -> Any | None:
    async def read(client: Redis) -> str | None:
        version = await _catalog_cache_version(client)
        return await client.get(_entry_key(version, field))

    raw_value = await _with_cache(read)
    if raw_value is None:
        return None
    try:
        return json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        logger.warning("Catalog cache contains invalid JSON for field %s", field)
        return None


async def set_catalog_cache(
    field: str,
    value: object,
    *,
    ttl_seconds: int = CATALOG_CACHE_TTL_SECONDS,
) -> None:
    async def write(client: Redis) -> None:
        serialized = json.dumps(value, ensure_ascii=False, separators=(",", ":"), default=str)
        version = await _catalog_cache_version(client)
        await client.setex(_entry_key(version, field), ttl_seconds, serialized)

    try:
        await _with_cache(write)
    except (TypeError, ValueError):
        logger.warning("Catalog cache payload is not serializable for field %s", field)


async def invalidate_catalog_cache() -> None:
    """Drop every derived public catalog projection after an admin mutation."""
    global _invalidation_generation
    _invalidation_generation += 1

    async def flushed(client: Redis) -> None:
        return None

    # _with_cache flushes the pending generation before any subsequent access.
    # An outage never rolls back the saved admin mutation.
    await _with_cache(flushed)
