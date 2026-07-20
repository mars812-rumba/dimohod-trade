"""Add variant fields to SKUs.

Revision ID: 202607200002
Revises: 202607170001
Create Date: 2026-07-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202607200002"
down_revision: str | None = "202607170001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("skus", sa.Column("slug", sa.String(length=240), nullable=True))
    op.add_column("skus", sa.Column("material", sa.String(length=120), nullable=True))
    op.add_column("skus", sa.Column("steel_grade", sa.String(length=32), nullable=True))
    op.add_column("skus", sa.Column("wall_thickness_mm", sa.Numeric(5, 2), nullable=True))
    op.add_column("skus", sa.Column("diameter_mm", sa.Integer(), nullable=True))
    op.add_column("skus", sa.Column("outer_diameter_mm", sa.Integer(), nullable=True))
    op.add_column("skus", sa.Column("contour", sa.String(length=32), nullable=True))
    op.add_column("skus", sa.Column("insulation_mm", sa.Integer(), nullable=True))
    op.add_column("skus", sa.Column("length_mm", sa.Integer(), nullable=True))
    op.add_column("skus", sa.Column("angle_deg", sa.Integer(), nullable=True))

    op.create_index("ix_skus_slug", "skus", ["slug"])
    op.create_unique_constraint("uq_skus_product_id_slug", "skus", ["product_id", "slug"])


def downgrade() -> None:
    op.drop_constraint("uq_skus_product_id_slug", "skus", type_="unique")
    op.drop_index("ix_skus_slug", table_name="skus")

    op.drop_column("skus", "angle_deg")
    op.drop_column("skus", "length_mm")
    op.drop_column("skus", "insulation_mm")
    op.drop_column("skus", "contour")
    op.drop_column("skus", "outer_diameter_mm")
    op.drop_column("skus", "diameter_mm")
    op.drop_column("skus", "wall_thickness_mm")
    op.drop_column("skus", "steel_grade")
    op.drop_column("skus", "material")
    op.drop_column("skus", "slug")
