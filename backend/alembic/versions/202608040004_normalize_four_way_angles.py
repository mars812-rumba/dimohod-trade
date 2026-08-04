"""Merge four-way families split by missing angle units.

Revision ID: 202608040004
Revises: 202608040003
Create Date: 2026-08-04
"""

from collections.abc import Sequence
import re
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import Connection

from app.db.catalog_item_rules import confirmed_four_way_angle


revision: str = "202608040004"
down_revision: str | None = "202608040003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PREVIOUS_STATE_KEY = "_four_way_angle_previous_state"

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
    sa.column("angle_deg", sa.Integer()),
    sa.column("attributes", sa.JSON()),
    sa.column("is_active", sa.Boolean()),
)


def marked_attributes(attributes: dict | None, previous_state: dict) -> dict:
    original = dict(attributes or {})
    values = dict(original)
    values.setdefault(PREVIOUS_STATE_KEY, {**previous_state, "attributes": original})
    return values


def four_way_angle(name: str, attributes: dict | None) -> int | None:
    logical_name = (attributes or {}).get("logical_item_name")
    for value in (logical_name, name):
        if not value:
            continue
        confirmed = confirmed_four_way_angle(str(value))
        if confirmed is not None:
            return confirmed
        match = re.search(r"к\s*/\s*о\s+90\s*(?:гр|°)?", str(value), re.IGNORECASE)
        if match:
            return 90
    return None


def normalized_four_way_sku_name(name: str) -> str:
    pattern = re.compile(
        r"^четверник\s+с\s+к\s*/\s*о\s+90\s*(?:гр|°)?",
        re.IGNORECASE,
    )
    return pattern.sub("Четверник с К/О 90°", name, count=1)


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


def category_id(bind: Connection, slug: str) -> uuid.UUID | None:
    statement = sa.select(categories.c.id).where(categories.c.slug == slug)
    return bind.execute(statement).scalar_one_or_none()


def merge_four_way_category(
    bind: Connection,
    category_slug: str,
    public_prefix: str,
) -> dict[uuid.UUID, uuid.UUID]:
    resolved_category_id = category_id(bind, category_slug)
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
            products.c.product_kind == "четверник",
            products.c.is_active.is_(True),
        )
        .order_by(products.c.name.asc(), products.c.slug.asc())
    ).all()
    group = [row for row in rows if four_way_angle(row.name, row.extra_attributes) == 90]
    if not group:
        return {}

    canonical = next((row for row in group if "°" in row.name), group[0])
    original_skus = {
        row.id: bind.execute(
            sa.select(
                skus.c.id,
                skus.c.product_id,
                skus.c.article,
                skus.c.name,
                skus.c.slug,
                skus.c.angle_deg,
                skus.c.attributes,
                skus.c.is_active,
            ).where(skus.c.product_id == row.id)
        ).all()
        for row in group
    }

    replacements: dict[uuid.UUID, uuid.UUID] = {}
    prefix_separator = "-" if public_prefix == "Сэндвич" else " "
    for row in group:
        replacements[row.id] = canonical.id
        product_attributes = marked_attributes(
            row.extra_attributes,
            {"name": row.name, "slug": row.slug, "is_active": row.is_active},
        )
        product_attributes["logical_item_name"] = "Четверник с К/О 90гр"
        product_attributes["catalog_angle_deg"] = 90
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
                    "angle_deg": sku_row.angle_deg,
                    "is_active": sku_row.is_active,
                },
            )
            sku_attributes["angle_deg"] = 90
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
                    name=normalized_four_way_sku_name(sku_row.name),
                    slug=target_slug,
                    angle_deg=90,
                    attributes=sku_attributes,
                )
            )

        bind.execute(
            sa.update(products)
            .where(products.c.id == row.id)
            .values(
                name=(
                    f"{public_prefix}{prefix_separator}четверник с К/О 90°"
                    if row.id == canonical.id
                    else row.name
                ),
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
    replacements = {}
    replacements.update(
        merge_four_way_category(
            bind,
            "odnokonturnye-chetverniki",
            "Одноконтурный",
        )
    )
    replacements.update(
        merge_four_way_category(bind, "sendvich-chetverniki", "Сэндвич")
    )
    rewrite_compatible_product_ids(bind, replacements)


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
                product_id=uuid.UUID(previous["product_id"]),
                name=previous["name"],
                slug=previous["slug"],
                angle_deg=previous["angle_deg"],
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
                name=previous["name"],
                slug=previous["slug"],
                is_active=previous["is_active"],
                extra_attributes=previous.get("attributes", attributes),
            )
        )
