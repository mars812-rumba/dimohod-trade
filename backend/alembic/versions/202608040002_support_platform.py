"""Normalize support caps and add the sandwich support platform.

Revision ID: 202608040002
Revises: 202608040001
Create Date: 2026-08-04
"""

from collections.abc import Sequence
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import Connection

from app.db.support_platform_data import SUPPORT_PLATFORM_SKUS


revision: str = "202608040002"
down_revision: str | None = "202608040001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SEED_NAMESPACE = uuid.UUID("57e461f7-ddb7-494e-9d8b-1987b4c39fb4")
PREVIOUS_STATE_KEY = "_support_catalog_previous_state"
PLATFORM_PRODUCT_SLUG = "sendvich-opornaya-ploschadka"
SUPPORT_CAP_PRODUCT_SLUG = "sendvich-zaglushka-opornaya"

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
    sa.column("short_description", sa.String()),
    sa.column("description", sa.Text()),
    sa.column("brand", sa.String()),
    sa.column("material", sa.String()),
    sa.column("wall_thickness_mm", sa.Numeric()),
    sa.column("diameter_mm", sa.Integer()),
    sa.column("steel_grade", sa.String()),
    sa.column("contour", sa.String()),
    sa.column("insulation_mm", sa.Integer()),
    sa.column("max_temperature_c", sa.Integer()),
    sa.column("product_kind", sa.String()),
    sa.column("purpose", postgresql.JSONB()),
    sa.column("extra_attributes", postgresql.JSONB()),
    sa.column("source_name", sa.String()),
    sa.column("application_tags", sa.JSON()),
    sa.column("compatibility_notes", sa.Text()),
    sa.column("is_active", sa.Boolean()),
)
skus = sa.table(
    "skus",
    sa.column("id", sa.Uuid()),
    sa.column("product_id", sa.Uuid()),
    sa.column("article", sa.String()),
    sa.column("name", sa.String()),
    sa.column("slug", sa.String()),
    sa.column("material", sa.String()),
    sa.column("steel_grade", sa.String()),
    sa.column("wall_thickness_mm", sa.Numeric()),
    sa.column("diameter_mm", sa.Integer()),
    sa.column("outer_diameter_mm", sa.Integer()),
    sa.column("contour", sa.String()),
    sa.column("insulation_mm", sa.Integer()),
    sa.column("length_mm", sa.Integer()),
    sa.column("angle_deg", sa.Integer()),
    sa.column("price_rub", sa.Numeric()),
    sa.column("stock_status", sa.String()),
    sa.column("attributes", sa.JSON()),
    sa.column("is_active", sa.Boolean()),
)


def stable_id(kind: str, value: str) -> uuid.UUID:
    return uuid.uuid5(SEED_NAMESPACE, f"{kind}:{value}")


def category_id(bind: Connection, slug: str) -> uuid.UUID | None:
    statement = sa.select(categories.c.id).where(categories.c.slug == slug)
    return bind.execute(statement).scalar_one_or_none()


def marked_attributes(attributes: dict | None, previous_state: dict) -> dict:
    original = dict(attributes or {})
    values = dict(original)
    values.setdefault(PREVIOUS_STATE_KEY, {**previous_state, "attributes": original})
    return values


def support_cap_sku_name(name: str) -> str:
    if name.casefold().startswith("заглушка опорная"):
        return name
    if name.casefold().startswith("заглушка"):
        return f"Заглушка опорная{name[len('Заглушка'):]}"
    return name


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


def disable_one_wall_caps(bind: Connection) -> set[uuid.UUID]:
    one_wall_category_id = category_id(bind, "zaglushki")
    if one_wall_category_id is None:
        return set()
    rows = bind.execute(
        sa.select(
            products.c.id,
            products.c.name,
            products.c.slug,
            products.c.is_active,
            products.c.extra_attributes,
        ).where(
            products.c.category_id == one_wall_category_id,
            products.c.product_kind == "заглушка",
            products.c.is_active.is_(True),
        )
    ).all()
    product_ids = {row.id for row in rows}
    for row in rows:
        attributes = marked_attributes(
            row.extra_attributes,
            {"name": row.name, "slug": row.slug, "is_active": row.is_active},
        )
        bind.execute(
            sa.update(products)
            .where(products.c.id == row.id)
            .values(is_active=False, extra_attributes=attributes)
        )

    if not product_ids:
        return product_ids
    sku_rows = bind.execute(
        sa.select(
            skus.c.id,
            skus.c.product_id,
            skus.c.name,
            skus.c.slug,
            skus.c.is_active,
            skus.c.attributes,
        )
        .where(skus.c.product_id.in_(product_ids))
    ).all()
    for row in sku_rows:
        attributes = marked_attributes(
            row.attributes,
            {
                "product_id": str(row.product_id),
                "name": row.name,
                "slug": row.slug,
                "is_active": row.is_active,
            },
        )
        bind.execute(
            sa.update(skus)
            .where(skus.c.id == row.id)
            .values(is_active=False, attributes=attributes)
        )
    return product_ids


def merge_sandwich_support_caps(bind: Connection) -> tuple[uuid.UUID | None, set[uuid.UUID]]:
    sandwich_category_id = category_id(bind, "sendvich-zaglushki")
    if sandwich_category_id is None:
        return None, set()
    rows = bind.execute(
        sa.select(
            products.c.id,
            products.c.name,
            products.c.slug,
            products.c.is_active,
            products.c.extra_attributes,
        )
        .where(
            products.c.category_id == sandwich_category_id,
            products.c.product_kind == "заглушка",
            products.c.is_active.is_(True),
        )
        .order_by(products.c.name.asc(), products.c.slug.asc())
    ).all()
    if not rows:
        return None, set()

    canonical = next((row for row in rows if row.slug == SUPPORT_CAP_PRODUCT_SLUG), None)
    canonical = canonical or next((row for row in rows if "опорн" in row.name.casefold()), rows[0])
    old_product_ids = {row.id for row in rows}

    slug_owner = bind.execute(
        sa.select(products.c.id).where(products.c.slug == SUPPORT_CAP_PRODUCT_SLUG)
    ).scalar_one_or_none()
    canonical_slug = (
        SUPPORT_CAP_PRODUCT_SLUG if slug_owner in (None, canonical.id) else canonical.slug
    )

    for row in rows:
        product_attributes = marked_attributes(
            row.extra_attributes,
            {"name": row.name, "slug": row.slug, "is_active": row.is_active},
        )
        sku_rows = bind.execute(
            sa.select(
                skus.c.id,
                skus.c.product_id,
                skus.c.article,
                skus.c.name,
                skus.c.slug,
                skus.c.is_active,
                skus.c.attributes,
            ).where(skus.c.product_id == row.id)
        ).all()
        for sku_row in sku_rows:
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
                    name=support_cap_sku_name(sku_row.name),
                    slug=target_slug,
                    attributes=sku_attributes,
                )
            )

        product_attributes.update(
            {
                "variant_model": (
                    "logical_product" if row.id == canonical.id else "merged_legacy_product"
                ),
                "catalog_role": "sandwich_support_cap",
            }
        )
        if row.id != canonical.id:
            product_attributes.update(
                {
                    "merged_into_product_id": str(canonical.id),
                    "merged_into_product_slug": canonical_slug,
                }
            )
        product_values = {
            "name": "Сэндвич-заглушка опорная" if row.id == canonical.id else row.name,
            "slug": canonical_slug if row.id == canonical.id else row.slug,
            "is_active": row.id == canonical.id,
            "extra_attributes": product_attributes,
        }
        if row.id == canonical.id:
            product_values["contour"] = "сэндвич"
        bind.execute(
            sa.update(products).where(products.c.id == row.id).values(**product_values)
        )
    return canonical.id, old_product_ids


def upsert_support_platform(bind: Connection, fastener_category_id: uuid.UUID) -> uuid.UUID:
    existing_id = bind.execute(
        sa.select(products.c.id).where(products.c.slug == PLATFORM_PRODUCT_SLUG)
    ).scalar_one_or_none()
    product_id = existing_id or stable_id("product", PLATFORM_PRODUCT_SLUG)
    values = {
        "id": product_id,
        "category_id": fastener_category_id,
        "name": "Сэндвич-опорная площадка",
        "slug": PLATFORM_PRODUCT_SLUG,
        "short_description": (
            "Опорная площадка для узла с универсальной консолью. "
            "Варианты по диаметру и марке внутренней стали."
        ),
        "description": None,
        "brand": "Дымоход Трейд",
        "material": None,
        "wall_thickness_mm": None,
        "diameter_mm": None,
        "steel_grade": None,
        "contour": "сэндвич",
        "insulation_mm": None,
        "max_temperature_c": None,
        "product_kind": "опорная_площадка",
        "purpose": [],
        "extra_attributes": {
            "variant_model": "logical_product",
            "price_source_sheet": "Фланцы",
            "price_source_row_key": "raw_rows:Площадка",
            "installation_role": "console_support_platform",
        },
        "source_name": "Дымоход Трейд price_list.json",
        "application_tags": ["стена", "консоль"],
        "compatibility_notes": None,
        "is_active": True,
    }
    statement = postgresql.insert(products).values(**values)
    bind.execute(
        statement.on_conflict_do_update(
            index_elements=[products.c.slug],
            set_={key: value for key, value in values.items() if key not in {"id", "slug"}},
        )
    )

    for seed in SUPPORT_PLATFORM_SKUS:
        sku_values = {
            "id": stable_id("sku", seed.article),
            "product_id": product_id,
            "article": seed.article,
            "name": seed.name,
            "slug": seed.slug,
            "material": "нержавеющая сталь",
            "steel_grade": seed.steel_grade,
            "wall_thickness_mm": seed.wall_thickness_mm,
            "diameter_mm": seed.diameter_mm,
            "outer_diameter_mm": seed.outer_diameter_mm,
            "contour": "сэндвич",
            "insulation_mm": seed.insulation_mm,
            "length_mm": None,
            "angle_deg": None,
            "price_rub": seed.price_rub,
            "stock_status": "unknown",
            "attributes": {
                "source_sheet": "Фланцы",
                "source_row_key": "raw_rows:Площадка",
                "outer_material": "нержавеющая сталь",
                "outer_steel_grade": seed.outer_steel_grade,
                "outer_wall_thickness_mm": str(seed.outer_wall_thickness_mm),
                "installation_role": "console_support_platform",
            },
            "is_active": True,
        }
        statement = postgresql.insert(skus).values(**sku_values)
        bind.execute(
            statement.on_conflict_do_update(
                index_elements=[skus.c.article],
                set_={
                    key: value
                    for key, value in sku_values.items()
                    if key not in {"id", "article"}
                },
            )
        )
    return product_id


def rewrite_compatible_product_ids(
    bind: Connection,
    *,
    removed_ids: set[uuid.UUID],
    merged_ids: set[uuid.UUID],
    canonical_id: uuid.UUID | None,
    platform_id: uuid.UUID,
    console_id: uuid.UUID | None,
) -> None:
    rows = bind.execute(sa.select(products.c.id, products.c.extra_attributes)).all()
    for row in rows:
        attributes = dict(row.extra_attributes or {})
        raw_ids = attributes.get("compatible_product_ids")
        requested: list[str] | None = list(raw_ids) if isinstance(raw_ids, list) else None

        if row.id == platform_id and console_id is not None:
            requested = requested or []
            requested.append(str(console_id))
        if console_id is not None and row.id == console_id:
            requested = requested or []
            requested.append(str(platform_id))
        if requested is None:
            continue

        rewritten: list[str] = []
        for value in requested:
            try:
                identifier = uuid.UUID(str(value))
            except (TypeError, ValueError):
                continue
            if identifier in removed_ids:
                continue
            replacement = (
                canonical_id
                if identifier in merged_ids and canonical_id is not None
                else identifier
            )
            normalized = str(replacement)
            if replacement != row.id and normalized not in rewritten:
                rewritten.append(normalized)

        if rewritten == raw_ids:
            continue
        previous_state = {
            "name": bind.execute(
                sa.select(products.c.name).where(products.c.id == row.id)
            ).scalar_one(),
            "slug": bind.execute(
                sa.select(products.c.slug).where(products.c.id == row.id)
            ).scalar_one(),
            "is_active": bind.execute(
                sa.select(products.c.is_active).where(products.c.id == row.id)
            ).scalar_one(),
        }
        attributes = marked_attributes(attributes, previous_state)
        attributes["compatible_product_ids"] = rewritten
        bind.execute(
            sa.update(products).where(products.c.id == row.id).values(extra_attributes=attributes)
        )


def upgrade() -> None:
    bind = op.get_bind()
    fastener_category_id = category_id(bind, "homuty-i-krepezh")
    if fastener_category_id is None:
        raise RuntimeError("Category homuty-i-krepezh is required")

    removed_ids = disable_one_wall_caps(bind)
    canonical_id, merged_ids = merge_sandwich_support_caps(bind)
    platform_id = upsert_support_platform(bind, fastener_category_id)
    console_id = bind.execute(
        sa.select(products.c.id).where(products.c.slug == "konsol-universalnaya")
    ).scalar_one_or_none()
    rewrite_compatible_product_ids(
        bind,
        removed_ids=removed_ids,
        merged_ids=merged_ids,
        canonical_id=canonical_id,
        platform_id=platform_id,
        console_id=console_id,
    )


def downgrade() -> None:
    bind = op.get_bind()
    platform_id = bind.execute(
        sa.select(products.c.id).where(products.c.slug == PLATFORM_PRODUCT_SLUG)
    ).scalar_one_or_none()
    if platform_id is not None:
        bind.execute(sa.delete(skus).where(skus.c.product_id == platform_id))
        bind.execute(sa.delete(products).where(products.c.id == platform_id))

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
