"""Add owner-confirmed 115/215 sandwich variants at 120/220 prices.

Revision ID: 202610030001
Revises: 202609070001
Create Date: 2026-10-03
"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from app.db.sandwich_diameter_aliases import PRICE_ALIAS_KEY, sandwich_115_215_alias

revision: str = "202610030001"
down_revision: str | None = "202609070001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


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


def upgrade() -> None:
    bind = op.get_bind()
    source_rows = bind.execute(
        sa.select(skus).where(
            skus.c.diameter_mm == 120,
            skus.c.outer_diameter_mm == 220,
            skus.c.contour == "сэндвич",
        )
    ).mappings().all()
    existing_articles = set(
        bind.execute(
            sa.select(skus.c.article).where(
                skus.c.diameter_mm == 115,
                skus.c.outer_diameter_mm == 215,
            )
        ).scalars()
    )

    for source in source_rows:
        values = sandwich_115_215_alias(source)
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


def downgrade() -> None:
    bind = op.get_bind()
    alias_ids = []
    rows = bind.execute(
        sa.select(skus.c.id, skus.c.attributes).where(
            skus.c.diameter_mm == 115,
            skus.c.outer_diameter_mm == 215,
        )
    ).all()
    for sku_id, raw_attributes in rows:
        attributes = dict(raw_attributes or {})
        if PRICE_ALIAS_KEY in attributes:
            alias_ids.append(sku_id)
    if alias_ids:
        bind.execute(sa.delete(skus).where(skus.c.id.in_(alias_ids)))
