"""Backfill structured outer-pipe fields from legacy price section titles.

Revision ID: 202608050005
Revises: 202608050004
Create Date: 2026-08-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.db.price_section_attributes import outer_pipe_attributes


revision: str = "202608050005"
down_revision: str | None = "202608050004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PREVIOUS_STATE_KEY = "_outer_pipe_attributes_previous_state"
OUTER_KEYS = (
    "outer_material",
    "outer_steel_grade",
    "outer_wall_thickness_mm",
)

skus = sa.table(
    "skus",
    sa.column("id", sa.Uuid()),
    sa.column("contour", sa.String()),
    sa.column("attributes", sa.JSON()),
)


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.select(skus.c.id, skus.c.attributes).where(skus.c.contour == "сэндвич")
    ).all()
    for sku_id, raw_attributes in rows:
        attributes = dict(raw_attributes or {})
        recovered = outer_pipe_attributes(attributes)
        if not recovered["outer_material"]:
            continue
        attributes.setdefault(
            PREVIOUS_STATE_KEY,
            {
                key: {
                    "present": key in attributes,
                    "value": attributes.get(key),
                }
                for key in OUTER_KEYS
            },
        )
        attributes.update(recovered)
        bind.execute(
            sa.update(skus).where(skus.c.id == sku_id).values(attributes=attributes)
        )


def downgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.select(skus.c.id, skus.c.attributes)).all()
    for sku_id, raw_attributes in rows:
        attributes = dict(raw_attributes or {})
        previous = attributes.pop(PREVIOUS_STATE_KEY, None)
        if not isinstance(previous, dict):
            continue
        for key in OUTER_KEYS:
            state = previous.get(key)
            if isinstance(state, dict) and state.get("present"):
                attributes[key] = state.get("value")
            else:
                attributes.pop(key, None)
        bind.execute(
            sa.update(skus).where(skus.c.id == sku_id).values(attributes=attributes)
        )
