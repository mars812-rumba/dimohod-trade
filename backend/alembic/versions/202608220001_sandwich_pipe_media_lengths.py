"""Assign sandwich-pipe photos to confirmed SKU length groups.

Revision ID: 202608220001
Revises: 202608110002
Create Date: 2026-08-22
"""

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from alembic import op


revision: str = "202608220001"
down_revision: str | None = "202608110002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BACKUP_KEY = "_sandwich_pipe_media_previous"
PHOTO_LENGTHS = {
    "photo-1": [1000],
    "photo-2": [150, 250, 350],
    "photo-3": [500, 750],
}

products = sa.table(
    "products",
    sa.column("id", sa.Uuid()),
    sa.column("slug", sa.String()),
    sa.column("is_active", sa.Boolean()),
    sa.column("extra_attributes", sa.JSON()),
)


def sandwich_pipe_media(raw_media: Any) -> list[dict[str, Any]] | None:
    if not isinstance(raw_media, list):
        return None
    result: list[dict[str, Any]] = []
    matched = set()
    for raw_item in raw_media:
        if not isinstance(raw_item, dict):
            result.append(raw_item)
            continue
        item = dict(raw_item)
        url = item.get("url")
        photo_key = next(
            (key for key in PHOTO_LENGTHS if isinstance(url, str) and f"/{key}." in url),
            None,
        )
        if photo_key:
            item["role"] = "general"
            item["scope"] = "variant"
            item["lengths_mm"] = PHOTO_LENGTHS[photo_key]
            matched.add(photo_key)
        result.append(item)
    return result if matched == set(PHOTO_LENGTHS) else None


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.select(products.c.id, products.c.extra_attributes).where(
            products.c.slug == "sendvich-truba",
            products.c.is_active.is_(True),
        )
    ).mappings()
    for row in rows:
        attributes = dict(row["extra_attributes"] or {})
        updated_media = sandwich_pipe_media(attributes.get("media"))
        if updated_media is None or updated_media == attributes.get("media"):
            continue
        attributes[BACKUP_KEY] = attributes.get("media")
        attributes["media"] = updated_media
        bind.execute(
            sa.update(products)
            .where(products.c.id == row["id"])
            .values(extra_attributes=attributes)
        )


def downgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.select(products.c.id, products.c.extra_attributes).where(
            products.c.slug == "sendvich-truba",
        )
    ).mappings()
    for row in rows:
        attributes = dict(row["extra_attributes"] or {})
        previous = attributes.pop(BACKUP_KEY, None)
        if not isinstance(previous, list):
            continue
        attributes["media"] = previous
        bind.execute(
            sa.update(products)
            .where(products.c.id == row["id"])
            .values(extra_attributes=attributes)
        )
