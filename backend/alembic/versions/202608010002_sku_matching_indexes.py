"""Add partial indexes for active SKU matching.

Revision ID: 202608010002
Revises: 202608010001
Create Date: 2026-08-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202608010002"
down_revision: str | None = "202608010001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_skus_active_tube_match",
        "skus",
        [
            "product_id",
            "diameter_mm",
            "outer_diameter_mm",
            "insulation_mm",
            "steel_grade",
            "material",
        ],
        unique=False,
        postgresql_where=sa.text("is_active = true"),
    )
    op.create_index(
        "ix_skus_active_fastener_match",
        "skus",
        [
            "product_id",
            sa.text("COALESCE(outer_diameter_mm, diameter_mm)"),
            "material",
            "steel_grade",
        ],
        unique=False,
        postgresql_where=sa.text("is_active = true"),
    )


def downgrade() -> None:
    op.drop_index("ix_skus_active_fastener_match", table_name="skus")
    op.drop_index("ix_skus_active_tube_match", table_name="skus")
