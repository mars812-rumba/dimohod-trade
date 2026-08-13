"""Add passage assemblies, flanges, consoles, and verified price variants.

Revision ID: 202608040001
Revises: 202608010002
Create Date: 2026-08-04
"""

from collections.abc import Sequence
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import Connection

from app.db.passage_catalog_data import (
    CATEGORY_SEEDS,
    PASSAGE_GLASS_RETIRED_SKU_ARTICLES,
    PRODUCT_SEEDS,
    SOURCE_NAME,
)


revision: str = "202608040001"
down_revision: str | None = "202608010002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SEED_NAMESPACE = uuid.UUID("120ecb42-d2cb-4d18-9be2-c84f2526a652")
REVIEW_ID = uuid.UUID("b3814e98-ad51-5fb2-a246-20f6a264740f")

categories = sa.table(
    "categories",
    sa.column("id", sa.Uuid()),
    sa.column("parent_id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("slug", sa.String()),
    sa.column("description", sa.Text()),
    sa.column("sort_order", sa.Integer()),
    sa.column("is_active", sa.Boolean()),
    sa.column("indexing_policy", sa.String()),
    sa.column("extra_attributes", postgresql.JSONB()),
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
needs_review = sa.table(
    "needs_review",
    sa.column("id", sa.Uuid()),
    sa.column("source_file", sa.Text()),
    sa.column("source_sheet", sa.String()),
    sa.column("source_section", sa.Text()),
    sa.column("source_row_key", sa.String()),
    sa.column("field_name", sa.String()),
    sa.column("raw_value", sa.Text()),
    sa.column("reason", sa.Text()),
)


def stable_id(kind: str, value: str) -> uuid.UUID:
    return uuid.uuid5(SEED_NAMESPACE, f"{kind}:{value}")


def category_id(bind: Connection, slug: str) -> uuid.UUID | None:
    return bind.execute(sa.select(categories.c.id).where(categories.c.slug == slug)).scalar_one_or_none()


def upsert_category(bind: Connection, *, slug: str, name: str, parent_id: uuid.UUID | None, sort_order: int) -> uuid.UUID:
    identifier = category_id(bind, slug) or stable_id("category", slug)
    statement = postgresql.insert(categories).values(
        id=identifier,
        parent_id=parent_id,
        name=name,
        slug=slug,
        description=None,
        sort_order=sort_order,
        is_active=True,
        indexing_policy="index",
        extra_attributes={},
    )
    bind.execute(
        statement.on_conflict_do_update(
            index_elements=[categories.c.slug],
            set_={
                "parent_id": parent_id,
                "name": name,
                "sort_order": sort_order,
                "is_active": True,
            },
        )
    )
    return identifier


def ensure_fastener_category(bind: Connection) -> uuid.UUID:
    existing_id = category_id(bind, "homuty-i-krepezh")
    if existing_id is not None:
        return existing_id
    return upsert_category(
        bind,
        slug="homuty-i-krepezh",
        name="Хомуты и крепеж",
        parent_id=None,
        sort_order=60,
    )


def upsert_product(bind: Connection, seed, resolved_category_id: uuid.UUID) -> uuid.UUID:
    existing_id = bind.execute(
        sa.select(products.c.id).where(products.c.slug == seed.slug)
    ).scalar_one_or_none()
    identifier = existing_id or stable_id("product", seed.slug)
    values = {
        "id": identifier,
        "category_id": resolved_category_id,
        "name": seed.name,
        "slug": seed.slug,
        "short_description": seed.short_description,
        "description": None,
        "brand": "Дымоход Трейд",
        "material": None,
        "wall_thickness_mm": None,
        "diameter_mm": None,
        "steel_grade": None,
        "contour": None,
        "insulation_mm": None,
        "max_temperature_c": None,
        "product_kind": seed.product_kind,
        "purpose": [],
        "extra_attributes": {**seed.extra_attributes, "variant_model": "logical_product"},
        "source_name": SOURCE_NAME,
        "application_tags": list(seed.application_tags),
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
    return identifier


def upsert_sku(bind: Connection, product_id: uuid.UUID, seed) -> None:
    values = {
        "id": stable_id("sku", seed.article),
        "product_id": product_id,
        "article": seed.article,
        "name": seed.name,
        "slug": seed.slug,
        "material": seed.material,
        "steel_grade": seed.steel_grade,
        "wall_thickness_mm": seed.wall_thickness_mm,
        "diameter_mm": None,
        "outer_diameter_mm": None,
        "contour": None,
        "insulation_mm": None,
        "length_mm": None,
        "angle_deg": None,
        "price_rub": seed.price_rub,
        "stock_status": "unknown",
        "attributes": {**seed.attributes, "source_sheet": seed.attributes.get("source_sheet", "Фланцы")},
        "is_active": True,
    }
    statement = postgresql.insert(skus).values(**values)
    bind.execute(
        statement.on_conflict_do_update(
            index_elements=[skus.c.article],
            set_={key: value for key, value in values.items() if key not in {"id", "article"}},
        )
    )


def normalize_power_clamp(bind: Connection, fastener_category_id: uuid.UUID) -> None:
    product_id = bind.execute(
        sa.select(products.c.id)
        .where(
            products.c.category_id == fastener_category_id,
            products.c.is_active.is_(True),
            sa.func.lower(products.c.name).like("%хомут силов%"),
        )
        .order_by(products.c.name.asc())
        .limit(1)
    ).scalar_one_or_none()
    if product_id is None:
        return

    attributes = bind.execute(
        sa.select(products.c.extra_attributes).where(products.c.id == product_id)
    ).scalar_one_or_none() or {}
    bind.execute(
        sa.update(products)
        .where(products.c.id == product_id)
        .values(
            name="Хомут силовой для консоли",
            extra_attributes={
                **attributes,
                "confirmed_wall_thickness_mm": "0.8",
                "installation_role": "console_clamp",
            },
        )
    )
    bind.execute(
        sa.update(skus)
        .where(skus.c.product_id == product_id, skus.c.wall_thickness_mm == sa.literal(0.5))
        .values(is_active=False)
    )
    bind.execute(
        sa.update(skus)
        .where(skus.c.product_id == product_id, skus.c.wall_thickness_mm == sa.literal(0.8))
        .values(is_active=True)
    )
    bind.execute(
        sa.update(skus)
        .where(skus.c.product_id == product_id, skus.c.wall_thickness_mm.is_(None))
        .values(wall_thickness_mm=sa.literal(0.8), is_active=True)
    )


def upgrade() -> None:
    bind = op.get_bind()
    resolved_categories: dict[str, uuid.UUID] = {}
    for seed in CATEGORY_SEEDS:
        parent_id = resolved_categories.get(seed.parent_slug) if seed.parent_slug else None
        resolved_categories[seed.slug] = upsert_category(
            bind,
            slug=seed.slug,
            name=seed.name,
            parent_id=parent_id,
            sort_order=seed.sort_order,
        )
    resolved_categories["homuty-i-krepezh"] = ensure_fastener_category(bind)

    for seed in PRODUCT_SEEDS:
        product_id = upsert_product(bind, seed, resolved_categories[seed.category_slug])
        for sku in seed.skus:
            upsert_sku(bind, product_id, sku)

    normalize_power_clamp(bind, resolved_categories["homuty-i-krepezh"])

    review_statement = postgresql.insert(needs_review).values(
        id=REVIEW_ID,
        source_file="prices/price_list.json",
        source_sheet="Фланцы",
        source_section="Хомут в перекрытие",
        source_row_key="raw_rows:diameter-boundary-d300",
        field_name="diameter_range",
        raw_value="до Д300 / от Д300",
        reason="Граница D300 присутствует в обоих ценовых диапазонах; требуется ручное уточнение.",
    )
    bind.execute(review_statement.on_conflict_do_nothing(index_elements=[needs_review.c.id]))


def downgrade() -> None:
    bind = op.get_bind()
    articles = [sku.article for product in PRODUCT_SEEDS for sku in product.skus]
    articles.extend(PASSAGE_GLASS_RETIRED_SKU_ARTICLES)
    bind.execute(sa.delete(skus).where(skus.c.article.in_(articles)))
    bind.execute(sa.delete(products).where(products.c.slug.in_([seed.slug for seed in PRODUCT_SEEDS])))
    bind.execute(sa.delete(needs_review).where(needs_review.c.id == REVIEW_ID))

    fastener_category_id = category_id(bind, "homuty-i-krepezh")
    if fastener_category_id is not None:
        power_clamp_id = bind.execute(
            sa.select(products.c.id).where(
                products.c.category_id == fastener_category_id,
                products.c.name == "Хомут силовой для консоли",
            )
        ).scalar_one_or_none()
        if power_clamp_id is not None:
            bind.execute(
                sa.update(products)
                .where(products.c.id == power_clamp_id)
                .values(name="Одноконтурный хомут силовой")
            )
            bind.execute(sa.update(skus).where(skus.c.product_id == power_clamp_id).values(is_active=True))

    for slug in reversed([seed.slug for seed in CATEGORY_SEEDS]):
        bind.execute(sa.delete(categories).where(categories.c.slug == slug))
