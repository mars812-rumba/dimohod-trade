"""Add editable customer BOMs.

Revision ID: 202608250001
Revises: 202608240001
Create Date: 2026-08-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202608250001"
down_revision: str | None = "202608240001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "boms",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("reference", sa.String(length=40), nullable=False),
        sa.Column("lead_id", sa.String(length=64), nullable=True),
        sa.Column("customer_name", sa.String(length=100), nullable=False),
        sa.Column("contact_method", sa.String(length=20), nullable=False),
        sa.Column("contact", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("profile_name", sa.String(length=180), nullable=True),
        sa.Column("source_url", sa.String(length=1000), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="RUB"),
        sa.Column("measurements", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("review_items", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("calculation_errors", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("manager_comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "status IN ('draft', 'submitted', 'in_review', 'approved', 'sent', 'archived')",
            name=op.f("ck_boms_status_valid"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_boms")),
        sa.UniqueConstraint("reference", name=op.f("uq_boms_reference")),
    )
    op.create_index(op.f("ix_boms_lead_id"), "boms", ["lead_id"])
    op.create_index(op.f("ix_boms_reference"), "boms", ["reference"])
    op.create_index(op.f("ix_boms_status"), "boms", ["status"])

    op.create_table(
        "bom_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("bom_id", sa.Uuid(), nullable=False),
        sa.Column("sku_id", sa.Uuid(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("item_key", sa.String(length=180), nullable=False),
        sa.Column("label", sa.String(length=240), nullable=False),
        sa.Column("article", sa.String(length=120), nullable=True),
        sa.Column("sku_name", sa.String(length=220), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_rub", sa.Numeric(12, 2), nullable=True),
        sa.Column("characteristics", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("match_status", sa.String(length=20), nullable=False, server_default="missing"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("position >= 0", name=op.f("ck_bom_items_position_nonnegative")),
        sa.CheckConstraint("quantity > 0", name=op.f("ck_bom_items_quantity_positive")),
        sa.CheckConstraint(
            "unit_price_rub IS NULL OR unit_price_rub >= 0",
            name=op.f("ck_bom_items_price_nonnegative"),
        ),
        sa.ForeignKeyConstraint(
            ["bom_id"], ["boms.id"], name=op.f("fk_bom_items_bom_id_boms"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["sku_id"], ["skus.id"], name=op.f("fk_bom_items_sku_id_skus"), ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_bom_items")),
    )
    op.create_index(op.f("ix_bom_items_bom_id"), "bom_items", ["bom_id"])
    op.create_index(op.f("ix_bom_items_sku_id"), "bom_items", ["sku_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_bom_items_sku_id"), table_name="bom_items")
    op.drop_index(op.f("ix_bom_items_bom_id"), table_name="bom_items")
    op.drop_table("bom_items")
    op.drop_index(op.f("ix_boms_status"), table_name="boms")
    op.drop_index(op.f("ix_boms_reference"), table_name="boms")
    op.drop_index(op.f("ix_boms_lead_id"), table_name="boms")
    op.drop_table("boms")
