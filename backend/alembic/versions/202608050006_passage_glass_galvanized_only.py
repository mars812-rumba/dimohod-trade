"""Keep the floor passage glass in galvanized steel only.

Revision ID: 202608050006
Revises: 202608050005
Create Date: 2026-08-05
"""

from collections.abc import Sequence
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.db.passage_catalog_data import (
    PASSAGE_GLASS_RETIRED_SKU_ARTICLES,
    PASSAGE_GLASS_SKUS,
)


revision: str = "202608050006"
down_revision: str | None = "202608050005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PREVIOUS_STATE_KEY = "_passage_glass_galvanized_only_previous_state"
SEED_NAMESPACE = uuid.UUID("120ecb42-d2cb-4d18-9be2-c84f2526a652")
ADDED_SIZE_ARTICLES = (
    "DT-PASSAGE-GLASS-GALV-D100-200",
    "DT-PASSAGE-GLASS-GALV-D300-400",
)

products = sa.table(
    "products",
    sa.column("id", sa.Uuid()),
    sa.column("slug", sa.String()),
    sa.column("short_description", sa.String()),
    sa.column("extra_attributes", sa.JSON()),
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


def stable_sku_id(article: str) -> uuid.UUID:
    return uuid.uuid5(SEED_NAMESPACE, f"sku:{article}")


def upsert_galvanized_sizes(bind, product_id: uuid.UUID) -> None:
    for seed in PASSAGE_GLASS_SKUS:
        values = {
            "id": stable_sku_id(seed.article),
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
            "attributes": {**seed.attributes, "source_sheet": "Фланцы"},
            "is_active": True,
        }
        statement = postgresql.insert(skus).values(**values)
        bind.execute(
            statement.on_conflict_do_update(
                index_elements=[skus.c.article],
                set_={
                    key: value
                    for key, value in values.items()
                    if key not in {"id", "article"}
                },
            )
        )


def upgrade() -> None:
    bind = op.get_bind()
    product = bind.execute(
        sa.select(
            products.c.id,
            products.c.short_description,
            products.c.extra_attributes,
        ).where(products.c.slug == "prohodnoy-stakan")
    ).mappings().one_or_none()
    if product is None:
        return

    attributes = dict(product["extra_attributes"] or {})
    attributes.setdefault(
        PREVIOUS_STATE_KEY,
        {
            "short_description": product["short_description"],
            "owner_confirmed_material_present": "owner_confirmed_material" in attributes,
            "owner_confirmed_material": attributes.get("owner_confirmed_material"),
        },
    )
    attributes["owner_confirmed_material"] = "оцинковка"
    attributes["owner_confirmed_size_variants"] = 3
    bind.execute(
        sa.update(products)
        .where(products.c.id == product["id"])
        .values(
            short_description=(
                "Три оцинкованных исполнения по размеру основания и диапазону диаметра трубы."
            ),
            extra_attributes=attributes,
        )
    )
    upsert_galvanized_sizes(bind, product["id"])
    bind.execute(
        sa.update(skus)
        .where(
            skus.c.product_id == product["id"],
            skus.c.article.in_(PASSAGE_GLASS_RETIRED_SKU_ARTICLES),
        )
        .values(is_active=False)
    )


def downgrade() -> None:
    bind = op.get_bind()
    product = bind.execute(
        sa.select(
            products.c.id,
            products.c.extra_attributes,
        ).where(products.c.slug == "prohodnoy-stakan")
    ).mappings().one_or_none()
    if product is None:
        return

    attributes = dict(product["extra_attributes"] or {})
    previous = attributes.pop(PREVIOUS_STATE_KEY, None)
    values: dict[str, object] = {"extra_attributes": attributes}
    if isinstance(previous, dict):
        values["short_description"] = previous.get("short_description")
        if previous.get("owner_confirmed_material_present"):
            attributes["owner_confirmed_material"] = previous.get(
                "owner_confirmed_material"
            )
        else:
            attributes.pop("owner_confirmed_material", None)
        attributes.pop("owner_confirmed_size_variants", None)
    bind.execute(
        sa.update(products).where(products.c.id == product["id"]).values(**values)
    )
    bind.execute(
        sa.delete(skus).where(
            skus.c.product_id == product["id"],
            skus.c.article.in_(ADDED_SIZE_ARTICLES),
        )
    )
    bind.execute(
        sa.update(skus)
        .where(
            skus.c.product_id == product["id"],
            skus.c.article == "DT-PASSAGE-GLASS-GALV-D210-280",
        )
        .values(
            name="Проходной стакан, Ø 210–280 мм, оцинковка",
            slug="galv-d210-280",
            price_rub=sa.literal(1760),
            attributes={
                "diameter_range": "210–280 мм",
                "diameter_min_mm": 210,
                "diameter_max_mm": 280,
                "source_sheet": "Фланцы",
            },
        )
    )
    bind.execute(
        sa.update(skus)
        .where(
            skus.c.product_id == product["id"],
            skus.c.article.in_(PASSAGE_GLASS_RETIRED_SKU_ARTICLES),
        )
        .values(is_active=True)
    )
