from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)

CATALOG_CACHE_PREFIX = "dimohod-trade:public-catalog"
CATALOG_CACHE_VERSION_KEY = f"{CATALOG_CACHE_PREFIX}:version"
CATALOG_CACHE_TTL_SECONDS = 300

_redis_client: Redis | None = None


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
        )
    return _redis_client


async def _catalog_cache_version() -> int:
    client = _client()
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


async def get_catalog_cache(field: str) -> Any | None:
    try:
        client = _client()
        version = await _catalog_cache_version()
        raw_value = await client.get(_entry_key(version, field))
    except RedisError as exc:
        logger.warning("Catalog cache read failed: %s", exc)
        return None
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
    try:
        serialized = json.dumps(
            value,
            ensure_ascii=False,
            separators=(",", ":"),
            default=str,
        )
        client = _client()
        version = await _catalog_cache_version()
        await client.setex(_entry_key(version, field), ttl_seconds, serialized)
    except (RedisError, TypeError, ValueError) as exc:
        logger.warning("Catalog cache write failed: %s", exc)


async def invalidate_catalog_cache() -> None:
    """Drop every derived public catalog projection after an admin mutation."""
    try:
        await _client().incr(CATALOG_CACHE_VERSION_KEY)
    except RedisError as exc:
        # A cache outage must not roll back an already committed admin change.
        logger.warning("Catalog cache invalidation failed: %s", exc)
