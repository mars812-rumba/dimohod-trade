"""Complete the owner-confirmed 115/215 catalog aliases used by the BOM.

Revision ID: 202610030002
Revises: 202610030001
Create Date: 2026-10-03
"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.db.sandwich_diameter_aliases import (
    PRICE_ALIAS_KEY,
    outer_fitting_215_alias,
    single_wall_115_alias,
)

revision: str = "202610030002"
down_revision: str | None = "202610030001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


products = sa.table(
    "products",
    sa.column("id", sa.Uuid()),
    sa.column("slug", sa.String()),
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
    sa.column("created_at", sa.DateTime(timezone=True)),
    sa.column("updated_at", sa.DateTime(timezone=True)),
)


def _insert_aliases(bind: sa.Connection, source_rows: list[dict], builder) -> None:
    existing_articles = set(bind.execute(sa.select(skus.c.article)).scalars())
    for source in source_rows:
        values = builder(source)
        if values["article"] in existing_articles:
            continue
        bind.execute(
            sa.insert(skus).values(
                id=uuid.uuid4(),
                **values,
                created_at=sa.func.now(),
                updated_at=sa.func.now(),
            )
        )
        existing_articles.add(values["article"])


def upgrade() -> None:
    bind = op.get_bind()
    one_wall_sources = bind.execute(
        sa.select(skus).where(
            skus.c.diameter_mm == 120,
            skus.c.outer_diameter_mm.is_(None),
            skus.c.contour == "одностенный",
        )
    ).mappings().all()
    _insert_aliases(bind, list(one_wall_sources), single_wall_115_alias)

    skirt_sources = bind.execute(
        sa.select(skus)
        .join(products, products.c.id == skus.c.product_id)
        .where(
            products.c.slug == "dekorativnaya-yubka",
            skus.c.diameter_mm == 220,
            skus.c.outer_diameter_mm.is_(None),
        )
    ).mappings().all()
    _insert_aliases(bind, list(skirt_sources), outer_fitting_215_alias)


def downgrade() -> None:
    bind = op.get_bind()
    alias_ids = []
    rows = bind.execute(
        sa.select(skus.c.id, skus.c.diameter_mm, skus.c.outer_diameter_mm, skus.c.attributes)
        .where(
            skus.c.outer_diameter_mm.is_(None),
            skus.c.diameter_mm.in_([115, 215]),
        )
    ).all()
    for sku_id, diameter_mm, _outer_diameter_mm, raw_attributes in rows:
        alias = dict(raw_attributes or {}).get(PRICE_ALIAS_KEY)
        if not isinstance(alias, dict):
            continue
        source_diameter = alias.get("source_diameter_mm")
        if (diameter_mm, source_diameter) in {(115, 120), (215, 220)}:
            alias_ids.append(sku_id)
    if alias_ids:
        bind.execute(sa.delete(skus).where(skus.c.id.in_(alias_ids)))
