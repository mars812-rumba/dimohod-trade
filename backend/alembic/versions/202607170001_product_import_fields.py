"""Add product import fields and needs review log.

Revision ID: 202607170001
Revises: 202607160001
Create Date: 2026-07-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202607170001"
down_revision: str | None = "202607160001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("products", sa.Column("steel_grade", sa.String(length=32), nullable=True))
    op.add_column("products", sa.Column("contour", sa.String(length=32), nullable=True))
    op.add_column("products", sa.Column("insulation_mm", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("max_temperature_c", sa.Integer(), nullable=True))
    op.add_column("products", sa.Column("product_kind", sa.String(length=64), nullable=True))
    op.add_column(
        "products",
        sa.Column(
            "purpose",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "products",
        sa.Column(
            "extra_attributes",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column("products", sa.Column("source_name", sa.String(length=160), nullable=True))

    op.create_table(
        "needs_review",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_file", sa.Text(), nullable=False),
        sa.Column("source_sheet", sa.String(length=120), nullable=True),
        sa.Column("source_section", sa.Text(), nullable=True),
        sa.Column("source_row_key", sa.String(length=160), nullable=True),
        sa.Column("field_name", sa.String(length=120), nullable=False),
        sa.Column("raw_value", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_needs_review_source_file", "needs_review", ["source_file"])
    op.create_index("ix_needs_review_field_name", "needs_review", ["field_name"])


def downgrade() -> None:
    op.drop_index("ix_needs_review_field_name", table_name="needs_review")
    op.drop_index("ix_needs_review_source_file", table_name="needs_review")
    op.drop_table("needs_review")

    op.drop_column("products", "source_name")
    op.drop_column("products", "extra_attributes")
    op.drop_column("products", "purpose")
    op.drop_column("products", "product_kind")
    op.drop_column("products", "max_temperature_c")
    op.drop_column("products", "insulation_mm")
    op.drop_column("products", "contour")
    op.drop_column("products", "steel_grade")
