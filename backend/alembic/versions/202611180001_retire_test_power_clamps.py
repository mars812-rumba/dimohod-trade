"""Retire three recovery-only power clamps; retain rows and saved quotations.

Revision ID: 202611180001
Revises: 202611130002
"""
from collections.abc import Sequence
from decimal import Decimal

import sqlalchemy as sa
from alembic import op

revision: str = "202611180001"
down_revision: str | None = "202611130002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BACKUP_KEY = "_retired_test_power_clamp_20261118"
ARTICLES = tuple(f"RECOVERY-TEMP-POWER-CLAMP-D{d}" for d in (215, 350, 400))
products = sa.table("products", sa.column("id", sa.Uuid()), sa.column("slug", sa.String()))
skus = sa.table("skus", sa.column("id", sa.Uuid()), sa.column("product_id", sa.Uuid()),
                sa.column("article", sa.String()), sa.column("is_active", sa.Boolean()),
                sa.column("price_rub", sa.Numeric()), sa.column("attributes", sa.JSON()))


def retired_values(row: dict) -> dict | None:
    attrs = dict(row.get("attributes") or {})
    # Never disable a real replacement or a subsequently confirmed/edited execution.
    if (row["article"] not in ARTICLES or not row["is_active"] or BACKUP_KEY in attrs
            or attrs.get("recovery_placeholder") is not True
            or row["price_rub"] != Decimal("100.00")):
        return None
    attrs[BACKUP_KEY] = True
    return {"is_active": False, "attributes": attrs}


def restored_values(row: dict) -> dict | None:
    attrs = dict(row.get("attributes") or {})
    if not attrs.pop(BACKUP_KEY, False):
        return None
    # Only restore untouched test data. Preserve later price/attribute changes.
    values = {"attributes": attrs}
    if attrs.get("recovery_placeholder") is True and row["price_rub"] == Decimal("100.00"):
        values["is_active"] = True
    return values


def rows(bind):
    return bind.execute(sa.select(skus).join(products, products.c.id == skus.c.product_id)
                        .where(products.c.slug == "odnostennyi-krepezh-homut-silovoi",
                               skus.c.article.in_(ARTICLES))).mappings().all()


def upgrade() -> None:
    bind = op.get_bind()
    for row in rows(bind):
        values = retired_values(dict(row))
        if values:
            bind.execute(sa.update(skus).where(skus.c.id == row["id"]).values(**values))


def downgrade() -> None:
    bind = op.get_bind()
    for row in rows(bind):
        values = restored_values(dict(row))
        if values:
            bind.execute(sa.update(skus).where(skus.c.id == row["id"]).values(**values))
