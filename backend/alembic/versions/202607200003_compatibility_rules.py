"""Add compatibility rules.

Revision ID: 202607200003
Revises: 202607200002
Create Date: 2026-07-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202607200003"
down_revision: str | None = "202607200002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "compatibility_rules",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=220), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("rule_type", sa.String(length=64), nullable=False, server_default="variant"),
        sa.Column("applies_to_product_kind", sa.String(length=64), nullable=True),
        sa.Column(
            "conditions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "result",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("severity", sa.String(length=24), nullable=False, server_default="info"),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_compatibility_rules_code", "compatibility_rules", ["code"])
    op.create_index(
        "ix_compatibility_rules_applies_to_product_kind",
        "compatibility_rules",
        ["applies_to_product_kind"],
    )


def downgrade() -> None:
    op.drop_index("ix_compatibility_rules_applies_to_product_kind", table_name="compatibility_rules")
    op.drop_index("ix_compatibility_rules_code", table_name="compatibility_rules")
    op.drop_table("compatibility_rules")
