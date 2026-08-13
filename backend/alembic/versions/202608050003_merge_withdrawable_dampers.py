"""Merge withdrawable damper families split by thickness labels.

Revision ID: 202608050003
Revises: 202608050002
Create Date: 2026-08-05
"""

from collections.abc import Sequence
import re
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import Connection

from app.db.catalog_item_rules import is_withdrawable_damper


revision: str = "202608050003"
down_revision: str | None = "202608050002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PREVIOUS_STATE_KEY = "_withdrawable_damper_previous_state"

categories = sa.table(
    "categories",
    sa.column("id", sa.Uuid()),
    sa.column("slug", sa.String()),
)
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
    sa.column("article", sa.String()),
    sa.column("name", sa.String()),
    sa.column("slug", sa.String()),
    sa.column("attributes", sa.JSON()),
    sa.column("is_active", sa.Boolean()),
)


def marked_attributes(attributes: dict | None, previous_state: dict) -> dict:
    original = dict(attributes or {})
    values = dict(original)
    values.setdefault(PREVIOUS_STATE_KEY, {**previous_state, "attributes": original})
    return values


def withdrawable_product(name: str, attributes: dict | None) -> bool:
    values = attributes or {}
    for key in ("logical_item_name", "raw_item_name"):
        value = values.get(key)
        if value and is_withdrawable_damper(str(value)):
            return True
    stripped = re.sub(
        r"^(?:сэндвич-|одноконтурн(?:ый|ая|ое)\s+)",
        "",
        name.strip(),
        flags=re.IGNORECASE,
    )
    return is_withdrawable_damper(stripped)


def normalized_sku_name(name: str) -> str:
    return re.sub(
        r"^шибер\s+(?:выдвиж(?:ной)?|выдв)"
        r"(?:\s+(?:0?[.,]?5\s*/\s*0?[.,]?8|0?[.,]?8\s*/\s*0?[.,]?8|0?[.,]?8))?",
        "Шибер выдвижной",
        name,
        count=1,
        flags=re.IGNORECASE,
    )


def unique_sku_slug(
    bind: Connection,
    product_id: uuid.UUID,
    sku_id: uuid.UUID,
    preferred: str,
    article: str,
) -> str:
    candidate = preferred[:240]
    suffix = 1
    while bind.execute(
        sa.select(skus.c.id).where(
            skus.c.product_id == product_id,
            skus.c.slug == candidate,
            skus.c.id != sku_id,
        )
    ).scalar_one_or_none() is not None:
        ending = article.casefold() if suffix == 1 else f"{article.casefold()}-{suffix}"
        candidate = f"{preferred[: 239 - len(ending)]}-{ending}"
        suffix += 1
    return candidate


def merge_category(
    bind: Connection,
    category_slug: str,
    public_name: str,
) -> dict[uuid.UUID, uuid.UUID]:
    resolved_category_id = bind.execute(
        sa.select(categories.c.id).where(categories.c.slug == category_slug)
    ).scalar_one_or_none()
    if resolved_category_id is None:
        return {}

    rows = bind.execute(
        sa.select(
            products.c.id,
            products.c.name,
            products.c.slug,
            products.c.extra_attributes,
            products.c.is_active,
        )
        .where(
            products.c.category_id == resolved_category_id,
            products.c.product_kind == "шибер",
            products.c.is_active.is_(True),
        )
        .order_by(products.c.name.asc(), products.c.slug.asc())
    ).all()
    group = [row for row in rows if withdrawable_product(row.name, row.extra_attributes)]
    if not group:
        return {}

    canonical = next(
        (row for row in group if row.name.casefold() == public_name.casefold()),
        group[0],
    )
    original_skus = {
        row.id: bind.execute(
            sa.select(
                skus.c.id,
                skus.c.product_id,
                skus.c.article,
                skus.c.name,
                skus.c.slug,
                skus.c.attributes,
                skus.c.is_active,
            ).where(skus.c.product_id == row.id)
        ).all()
        for row in group
    }

    replacements: dict[uuid.UUID, uuid.UUID] = {}
    for row in group:
        replacements[row.id] = canonical.id
        product_attributes = marked_attributes(
            row.extra_attributes,
            {"name": row.name, "slug": row.slug, "is_active": row.is_active},
        )
        product_attributes["logical_item_name"] = "Шибер выдвижной"
        if row.id != canonical.id:
            product_attributes.update(
                {
                    "variant_model": "merged_legacy_product",
                    "merged_into_product_id": str(canonical.id),
                    "merged_into_product_slug": canonical.slug,
                }
            )

        for sku_row in original_skus[row.id]:
            sku_attributes = marked_attributes(
                sku_row.attributes,
                {
                    "product_id": str(sku_row.product_id),
                    "name": sku_row.name,
                    "slug": sku_row.slug,
                    "is_active": sku_row.is_active,
                },
            )
            preferred_slug = sku_row.slug or sku_row.article.casefold()
            target_slug = unique_sku_slug(
                bind,
                canonical.id,
                sku_row.id,
                preferred_slug,
                sku_row.article,
            )
            bind.execute(
                sa.update(skus)
                .where(skus.c.id == sku_row.id)
                .values(
                    product_id=canonical.id,
                    name=normalized_sku_name(sku_row.name),
                    slug=target_slug,
                    attributes=sku_attributes,
                )
            )

        bind.execute(
            sa.update(products)
            .where(products.c.id == row.id)
            .values(
                name=public_name if row.id == canonical.id else row.name,
                is_active=row.id == canonical.id,
                extra_attributes=product_attributes,
            )
        )
    return replacements


def rewrite_compatible_product_ids(
    bind: Connection,
    replacements: dict[uuid.UUID, uuid.UUID],
) -> None:
    if not replacements:
        return
    rows = bind.execute(
        sa.select(
            products.c.id,
            products.c.name,
            products.c.slug,
            products.c.is_active,
            products.c.extra_attributes,
        )
    ).all()
    for row in rows:
        attributes = dict(row.extra_attributes or {})
        raw_ids = attributes.get("compatible_product_ids")
        if not isinstance(raw_ids, list):
            continue
        rewritten: list[str] = []
        for value in raw_ids:
            try:
                identifier = uuid.UUID(str(value))
            except (TypeError, ValueError):
                continue
            replacement = replacements.get(identifier, identifier)
            normalized = str(replacement)
            if replacement != row.id and normalized not in rewritten:
                rewritten.append(normalized)
        if rewritten == raw_ids:
            continue
        attributes = marked_attributes(
            attributes,
            {"name": row.name, "slug": row.slug, "is_active": row.is_active},
        )
        attributes["compatible_product_ids"] = rewritten
        bind.execute(
            sa.update(products).where(products.c.id == row.id).values(extra_attributes=attributes)
        )


def upgrade() -> None:
    bind = op.get_bind()
    replacements: dict[uuid.UUID, uuid.UUID] = {}
    replacements.update(merge_category(bind, "shibery", "Одноконтурный шибер выдвижной"))
    replacements.update(merge_category(bind, "sendvich-shibery", "Сэндвич-шибер выдвижной"))
    rewrite_compatible_product_ids(bind, replacements)


def downgrade() -> None:
    bind = op.get_bind()
    sku_rows = bind.execute(sa.select(skus.c.id, skus.c.attributes)).all()
    for row in sku_rows:
        attributes = dict(row.attributes or {})
        previous = attributes.pop(PREVIOUS_STATE_KEY, None)
        if not isinstance(previous, dict) or "product_id" not in previous:
            continue
        bind.execute(
            sa.update(skus)
            .where(skus.c.id == row.id)
            .values(
                product_id=uuid.UUID(previous["product_id"]),
                name=previous["name"],
                slug=previous["slug"],
                is_active=previous["is_active"],
                attributes=previous.get("attributes", attributes),
            )
        )

    product_rows = bind.execute(sa.select(products.c.id, products.c.extra_attributes)).all()
    for row in product_rows:
        attributes = dict(row.extra_attributes or {})
        previous = attributes.pop(PREVIOUS_STATE_KEY, None)
        if not isinstance(previous, dict):
            continue
        bind.execute(
            sa.update(products)
            .where(products.c.id == row.id)
            .values(
                name=previous["name"],
                slug=previous["slug"],
                is_active=previous["is_active"],
                extra_attributes=previous.get("attributes", attributes),
            )
        )
