"""Add confirmed inner-steel selection profiles to pipe SKUs.

Revision ID: 202608050001
Revises: 202608040005
Create Date: 2026-08-05
"""

from collections.abc import Sequence
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.db.steel_selection_profiles import PROFILE_ATTRIBUTE, steel_selection_profile


revision: str = "202608050001"
down_revision: str | None = "202608040005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PREVIOUS_STATE_KEY = "_steel_selection_profile_previous_state"
RULE_CODE = "aisi_430_inner_pipe_limited"
RULE_ID = uuid.UUID("b68441dd-e0a5-57dc-bc10-6e91eadf2f0a")
GAS_RULE_CODE = "gas_boiler_steel_review"
GAS_RULE_PREVIOUS_CONDITIONS = {
    "source_type": "gas_boiler",
    "steel_grade": {"not_in": ["AISI 304", "AISI 316", "AISI 316L"]},
}
GAS_RULE_CONDITIONS = {
    "source_type": "gas_boiler",
    "steel_grade": {"not_in": ["AISI 304", "AISI 316", "AISI 316L", "AISI 321"]},
}

products = sa.table(
    "products",
    sa.column("id", sa.Uuid()),
    sa.column("product_kind", sa.String()),
)
skus = sa.table(
    "skus",
    sa.column("id", sa.Uuid()),
    sa.column("product_id", sa.Uuid()),
    sa.column("steel_grade", sa.String()),
    sa.column("attributes", sa.JSON()),
)
compatibility_rules = sa.table(
    "compatibility_rules",
    sa.column("id", sa.Uuid()),
    sa.column("code", sa.String()),
    sa.column("name", sa.String()),
    sa.column("description", sa.Text()),
    sa.column("rule_type", sa.String()),
    sa.column("applies_to_product_kind", sa.String()),
    sa.column("conditions", postgresql.JSONB()),
    sa.column("result", postgresql.JSONB()),
    sa.column("severity", sa.String()),
    sa.column("message", sa.Text()),
    sa.column("is_active", sa.Boolean()),
)


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.select(skus.c.id, skus.c.steel_grade, skus.c.attributes)
        .select_from(skus.join(products, products.c.id == skus.c.product_id))
        .where(products.c.product_kind == "труба")
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
        bind.execute(
            sa.update(skus).where(skus.c.id == row.id).values(attributes=attributes)
        )

    existing_rule_id = bind.execute(
        sa.select(compatibility_rules.c.id).where(compatibility_rules.c.code == RULE_CODE)
    ).scalar_one_or_none()
    if existing_rule_id is None:
        bind.execute(
            sa.insert(compatibility_rules).values(
                id=RULE_ID,
                code=RULE_CODE,
                name="AISI 430 имеет ограниченное применение во внутренней трубе",
                description=(
                    "Подтвержденный владельцем эконом-вариант без конденсата, который не "
                    "следует выбирать автоматически для внутреннего дымового канала."
                ),
                rule_type="variant",
                applies_to_product_kind="труба",
                conditions={"steel_grade": "AISI 430"},
                result={"autoselect_allowed": False, "needs_review": True},
                severity="warning",
                message=(
                    "AISI 430 — эконом-вариант для внутреннего канала без конденсата. "
                    "Для основного подбора рекомендуются другие марки стали; вариант "
                    "требует подтверждения специалистом."
                ),
                is_active=True,
            )
        )

    bind.execute(
        sa.update(compatibility_rules)
        .where(compatibility_rules.c.code == GAS_RULE_CODE)
        .values(conditions=GAS_RULE_CONDITIONS)
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
        bind.execute(
            sa.update(skus).where(skus.c.id == row.id).values(attributes=attributes)
        )
    bind.execute(
        sa.delete(compatibility_rules).where(
            compatibility_rules.c.id == RULE_ID,
            compatibility_rules.c.code == RULE_CODE,
        )
    )
    bind.execute(
        sa.update(compatibility_rules)
        .where(compatibility_rules.c.code == GAS_RULE_CODE)
        .values(conditions=GAS_RULE_PREVIOUS_CONDITIONS)
    )
