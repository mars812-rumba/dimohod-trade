"""Remove the synthetic demo sandwich pipe from the real catalog.

Revision ID: 202608040005
Revises: 202608040004
Create Date: 2026-08-04
"""

from collections.abc import Sequence
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import Connection


revision: str = "202608040005"
down_revision: str | None = "202608040004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

LEGACY_PRODUCT_SLUG = "sendvich-truba-115-200-nerzhaveyushchaya-stal-08"
CANONICAL_PRODUCT_NAME = "Сэндвич-труба"
PREVIOUS_STATE_KEY = "_demo_sandwich_pipe_previous_state"

products = sa.table(
    "products",
    sa.column("id", sa.Uuid()),
    sa.column("category_id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("slug", sa.String()),
    sa.column("product_kind", sa.String()),
    sa.column("extra_attributes", postgresql.JSONB()),
    sa.column("is_active", sa.Boolean()),
)
skus = sa.table(
    "skus",
    sa.column("id", sa.Uuid()),
    sa.column("product_id", sa.Uuid()),
    sa.column("attributes", sa.JSON()),
    sa.column("is_active", sa.Boolean()),
)


def marked_attributes(attributes: dict | None, previous_state: dict) -> dict:
    original = dict(attributes or {})
    values = dict(original)
    values.setdefault(PREVIOUS_STATE_KEY, {**previous_state, "attributes": original})
    return values


def find_canonical_product_id(
    bind: Connection,
    category_id: uuid.UUID,
    legacy_product_id: uuid.UUID,
) -> uuid.UUID | None:
    sku_count = sa.func.count(skus.c.id)
    statement = (
        sa.select(products.c.id)
        .select_from(products.outerjoin(skus, skus.c.product_id == products.c.id))
        .where(
            products.c.category_id == category_id,
            products.c.id != legacy_product_id,
            products.c.name == CANONICAL_PRODUCT_NAME,
            products.c.product_kind == "труба",
            products.c.is_active.is_(True),
        )
        .group_by(products.c.id)
        .order_by(sku_count.desc(), products.c.id.asc())
        .limit(1)
    )
    return bind.execute(statement).scalar_one_or_none()


def rewrite_compatible_product_ids(
    bind: Connection,
    legacy_product_id: uuid.UUID,
    canonical_product_id: uuid.UUID | None,
) -> None:
    rows = bind.execute(
        sa.select(
            products.c.id,
            products.c.extra_attributes,
            products.c.is_active,
        )
    ).all()
    for row in rows:
        attributes = dict(row.extra_attributes or {})
        raw_ids = attributes.get("compatible_product_ids")
        if not isinstance(raw_ids, list):
            continue

        rewritten: list[str] = []
        changed = False
        for value in raw_ids:
            try:
                identifier = uuid.UUID(str(value))
            except (TypeError, ValueError):
                changed = True
                continue
            if identifier == legacy_product_id:
                changed = True
                identifier = canonical_product_id
            if identifier is None or identifier == row.id:
                continue
            normalized = str(identifier)
            if normalized not in rewritten:
                rewritten.append(normalized)

        if not changed and rewritten == raw_ids:
            continue
        attributes = marked_attributes(
            attributes,
            {"is_active": row.is_active},
        )
        attributes["compatible_product_ids"] = rewritten
        bind.execute(
            sa.update(products)
            .where(products.c.id == row.id)
            .values(extra_attributes=attributes)
        )


def upgrade() -> None:
    bind = op.get_bind()
    legacy = bind.execute(
        sa.select(
            products.c.id,
            products.c.category_id,
            products.c.slug,
            products.c.is_active,
            products.c.extra_attributes,
        ).where(products.c.slug == LEGACY_PRODUCT_SLUG)
    ).one_or_none()
    if legacy is None:
        return

    canonical_product_id = find_canonical_product_id(
        bind,
        legacy.category_id,
        legacy.id,
    )

    legacy_attributes = marked_attributes(
        legacy.extra_attributes,
        {"is_active": legacy.is_active},
    )
    legacy_attributes.update(
        {
            "variant_model": "removed_synthetic_demo_product",
            "catalog_note": (
                "Synthetic MVP demo; prices and articles are absent from the source JSON "
                "price list."
            ),
        }
    )
    if canonical_product_id is not None:
        legacy_attributes["merged_into_product_id"] = str(canonical_product_id)

    bind.execute(
        sa.update(products)
        .where(products.c.id == legacy.id)
        .values(is_active=False, extra_attributes=legacy_attributes)
    )

    sku_rows = bind.execute(
        sa.select(
            skus.c.id,
            skus.c.attributes,
            skus.c.is_active,
        ).where(skus.c.product_id == legacy.id)
    ).all()
    for row in sku_rows:
        attributes = marked_attributes(
            row.attributes,
            {"is_active": row.is_active},
        )
        attributes["catalog_status"] = "removed_synthetic_demo_sku"
        bind.execute(
            sa.update(skus)
            .where(skus.c.id == row.id)
            .values(is_active=False, attributes=attributes)
        )

    rewrite_compatible_product_ids(bind, legacy.id, canonical_product_id)


def downgrade() -> None:
    bind = op.get_bind()

    sku_rows = bind.execute(sa.select(skus.c.id, skus.c.attributes)).all()
    for row in sku_rows:
        attributes = dict(row.attributes or {})
        previous = attributes.pop(PREVIOUS_STATE_KEY, None)
        if not isinstance(previous, dict):
            continue
        bind.execute(
            sa.update(skus)
            .where(skus.c.id == row.id)
            .values(
                is_active=previous["is_active"],
                attributes=previous.get("attributes", attributes),
            )
        )

    product_rows = bind.execute(
        sa.select(products.c.id, products.c.extra_attributes)
    ).all()
    for row in product_rows:
        attributes = dict(row.extra_attributes or {})
        previous = attributes.pop(PREVIOUS_STATE_KEY, None)
        if not isinstance(previous, dict):
            continue
        bind.execute(
            sa.update(products)
            .where(products.c.id == row.id)
            .values(
                is_active=previous["is_active"],
                extra_attributes=previous.get("attributes", attributes),
            )
        )
