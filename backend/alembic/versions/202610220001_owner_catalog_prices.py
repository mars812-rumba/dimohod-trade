"""Owner-confirmed wool and diameter-only support-platform prices, 2026-10-22.

Revision ID: 202610220001
Revises: 202610040001
"""
from collections.abc import Sequence
from decimal import Decimal
from typing import Any

import sqlalchemy as sa
from alembic import op

revision: str = "202610220001"
down_revision: str | None = "202610040001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

WOOL_SLUG = "komplekt-vaty-dlya-prohodnogo-stakana"
PLATFORM_SLUG = "sendvich-opornaya-ploschadka"
BACKUP_KEY = "_owner_catalog_price_20261022_previous"
WOOL_PRICE = Decimal("1300")
# Exact AISI 316 row from the owner's photograph, confirmed on 2026-10-22.
# No markup; the same amount applies to every steel grade at that diameter.
PLATFORM_PRICES = {
    (100, 200): Decimal("3381"),
    (110, 210): Decimal("3419"),
    (120, 220): Decimal("3438"),
    (130, 230): Decimal("3576"),
    (140, 240): Decimal("3641"),
    (150, 250): Decimal("3769"),
    (160, 260): Decimal("3862"),
    (180, 280): Decimal("4106"),
    (200, 300): Decimal("4417"),
    (250, 350): Decimal("4897"),
    (280, 380): Decimal("4990"),
    (300, 400): Decimal("5185"),
}
# Existing owner-confirmed alias from 2026-10-03, not a new diameter price.
DIAMETER_ALIASES = {(115, 215): (120, 220)}

products = sa.table("products", sa.column("id", sa.Uuid()), sa.column("slug", sa.String()))
skus = sa.table(
    "skus", sa.column("id", sa.Uuid()), sa.column("product_id", sa.Uuid()),
    sa.column("diameter_mm", sa.Integer()), sa.column("outer_diameter_mm", sa.Integer()),
    sa.column("price_rub", sa.Numeric()), sa.column("attributes", sa.JSON()),
)


def target_price(row: dict[str, Any]) -> Decimal | None:
    if row["product_slug"] == WOOL_SLUG:
        return WOOL_PRICE
    if row["product_slug"] != PLATFORM_SLUG:
        return None
    pair = (row["diameter_mm"], row["outer_diameter_mm"])
    pair = DIAMETER_ALIASES.get(pair, pair)
    if pair not in PLATFORM_PRICES:
        raise ValueError(f"No owner-confirmed support-platform price for diameter {pair}")
    return PLATFORM_PRICES[pair]


def corrected_values(row: dict[str, Any]) -> dict[str, Any] | None:
    price = target_price(row)
    if price is None:
        return None
    attrs = dict(row.get("attributes") or {})
    previous = row.get("price_rub")
    if BACKUP_KEY in attrs or (previous is not None and Decimal(str(previous)) == price):
        return None
    attrs[BACKUP_KEY] = {
        "before": None if previous is None else str(previous),
        "after": str(price),
    }
    return {"price_rub": price, "attributes": attrs}


def restored_values(row: dict[str, Any]) -> dict[str, Any] | None:
    attrs = dict(row.get("attributes") or {})
    previous = attrs.pop(BACKUP_KEY, None)
    if not isinstance(previous, dict):
        return None
    changes: dict[str, Any] = {"attributes": attrs}
    price = row.get("price_rub")
    # Preserve price changes made by an administrator after this migration.
    if price is not None and Decimal(str(price)) == Decimal(previous["after"]):
        changes["price_rub"] = None if previous["before"] is None else Decimal(previous["before"])
    return changes


def selected_rows(bind: sa.Connection) -> list[dict[str, Any]]:
    return [dict(row) for row in bind.execute(
        sa.select(skus, products.c.slug.label("product_slug"))
        .join(products, products.c.id == skus.c.product_id)
        .where(products.c.slug.in_((WOOL_SLUG, PLATFORM_SLUG)))
    ).mappings()]


def upgrade() -> None:
    bind = op.get_bind()
    # Validate all diameters before the first update; never partially price a family.
    updates = [(row["id"], corrected_values(row)) for row in selected_rows(bind)]
    for sku_id, values in updates:
        if values:
            bind.execute(sa.update(skus).where(skus.c.id == sku_id).values(**values))


def downgrade() -> None:
    bind = op.get_bind()
    for row in selected_rows(bind):
        values = restored_values(row)
        if values:
            bind.execute(sa.update(skus).where(skus.c.id == row["id"]).values(**values))
