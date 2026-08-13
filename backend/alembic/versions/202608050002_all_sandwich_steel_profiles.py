"""Extend confirmed inner-steel profiles to every sandwich product.

Revision ID: 202608050002
Revises: 202608050001
Create Date: 2026-08-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.db.steel_selection_profiles import PROFILE_ATTRIBUTE, steel_selection_profile


revision: str = "202608050002"
down_revision: str | None = "202608050001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PREVIOUS_STATE_KEY = "_all_sandwich_steel_profile_previous_state"
RULE_CODE = "aisi_430_inner_pipe_limited"

products = sa.table(
    "products",
    sa.column("id", sa.Uuid()),
    sa.column("contour", sa.String()),
)
skus = sa.table(
    "skus",
    sa.column("id", sa.Uuid()),
    sa.column("product_id", sa.Uuid()),
    sa.column("steel_grade", sa.String()),
    sa.column("contour", sa.String()),
    sa.column("attributes", sa.JSON()),
)
compatibility_rules = sa.table(
    "compatibility_rules",
    sa.column("code", sa.String()),
    sa.column("name", sa.String()),
    sa.column("description", sa.Text()),
    sa.column("applies_to_product_kind", sa.String()),
    sa.column("conditions", postgresql.JSONB()),
)


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.select(
            skus.c.id,
            skus.c.steel_grade,
            skus.c.attributes,
        )
        .select_from(skus.join(products, products.c.id == skus.c.product_id))
        .where(sa.or_(skus.c.contour == "сэндвич", products.c.contour == "сэндвич"))
    ).all()
    for row in rows:
        profile = steel_selection_profile(row.steel_grade)
        if profile is None:
            continue
        attributes = dict(row.attributes or {})
        attributes.setdefault(
            PREVIOUS_STATE_KEY,
            {
                "present": PROFILE_ATTRIBUTE in attributes,
                "value": attributes.get(PROFILE_ATTRIBUTE),
            },
        )
        attributes[PROFILE_ATTRIBUTE] = profile
        bind.execute(sa.update(skus).where(skus.c.id == row.id).values(attributes=attributes))

    bind.execute(
        sa.update(compatibility_rules)
        .where(compatibility_rules.c.code == RULE_CODE)
        .values(
            name="AISI 430 имеет ограниченное применение во внутреннем дымовом канале",
            description=(
                "Подтвержденный владельцем эконом-вариант без конденсата, который не следует "
                "выбирать автоматически для внутреннего дымового канала сэндвич-элементов."
            ),
            applies_to_product_kind=None,
            conditions={"contour": "сэндвич", "steel_grade": "AISI 430"},
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.select(skus.c.id, skus.c.attributes)).all()
    for row in rows:
        attributes = dict(row.attributes or {})
        previous = attributes.pop(PREVIOUS_STATE_KEY, None)
        if not isinstance(previous, dict):
            continue
        if previous.get("present"):
            attributes[PROFILE_ATTRIBUTE] = previous.get("value")
        else:
            attributes.pop(PROFILE_ATTRIBUTE, None)
        bind.execute(sa.update(skus).where(skus.c.id == row.id).values(attributes=attributes))

    bind.execute(
        sa.update(compatibility_rules)
        .where(compatibility_rules.c.code == RULE_CODE)
        .values(
            name="AISI 430 имеет ограниченное применение во внутренней трубе",
            description=(
                "Подтвержденный владельцем эконом-вариант без конденсата, который не следует "
                "выбирать автоматически для внутреннего дымового канала."
            ),
            applies_to_product_kind="труба",
            conditions={"steel_grade": "AISI 430"},
        )
    )
