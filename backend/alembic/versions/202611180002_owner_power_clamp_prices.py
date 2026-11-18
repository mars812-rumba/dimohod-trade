"""Apply the owner's photographed AISI 430 / 0.8 mm power-clamp price row.

Revision ID: 202611180002
Revises: 202611180001
"""
from collections.abc import Sequence
from decimal import Decimal
from typing import Any

import sqlalchemy as sa
from alembic import op

revision: str = "202611180002"
down_revision: str | None = "202611180001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PRODUCT_SLUG = "odnostennyi-krepezh-homut-silovoi"
BACKUP_KEY = "_owner_power_clamp_price_20261118_previous"
SOURCE = "Owner-confirmed photograph screens-1795002636-6be84847-01.jpg, row 66, 2026-11-18"
# Exact displayed ruble amounts, not a rounding formula applied to old prices.
PRICES = {
    100: Decimal("705"), 110: Decimal("713"), 120: Decimal("720"),
    130: Decimal("727"), 140: Decimal("736"), 150: Decimal("744"),
    160: Decimal("779"), 180: Decimal("797"), 200: Decimal("882"),
    210: Decimal("887"), 220: Decimal("899"), 230: Decimal("904"),
    250: Decimal("1001"), 280: Decimal("1025"), 300: Decimal("1122"),
}

products = sa.table("products", sa.column("id", sa.Uuid()), sa.column("slug", sa.String()))
skus = sa.table(
    "skus", sa.column("id", sa.Uuid()), sa.column("product_id", sa.Uuid()),
    sa.column("article", sa.String()), sa.column("diameter_mm", sa.Integer()),
    sa.column("outer_diameter_mm", sa.Integer()), sa.column("material", sa.String()),
    sa.column("steel_grade", sa.String()), sa.column("wall_thickness_mm", sa.Numeric()),
    sa.column("is_active", sa.Boolean()), sa.column("price_rub", sa.Numeric()),
    sa.column("attributes", sa.JSON()),
)


def target_price(row: dict[str, Any]) -> Decimal | None:
    attrs = row.get("attributes") or {}
    if (row.get("product_slug") != PRODUCT_SLUG or not row.get("is_active")
            or row.get("steel_grade") != "AISI 430"
            or row.get("wall_thickness_mm") != Decimal("0.8")
            or (row.get("material") or "").strip().lower() != "нержавеющая сталь"
            or row.get("outer_diameter_mm") is not None
            or str(row.get("article", "")).startswith("RECOVERY-TEMP-")
            or attrs.get("recovery_placeholder") is True):
        return None
    return PRICES.get(row.get("diameter_mm"))


def corrected_values(row: dict[str, Any]) -> dict[str, Any] | None:
    price = target_price(row)
    attrs = dict(row.get("attributes") or {})
    if price is None or BACKUP_KEY in attrs:
        return None
    previous = row.get("price_rub")
    # Retain provenance even if a price already happens to equal the photograph.
    attrs[BACKUP_KEY] = {"before": None if previous is None else str(previous),
                         "after": str(price), "source": SOURCE}
    return {"price_rub": price, "attributes": attrs}


def restored_values(row: dict[str, Any]) -> dict[str, Any] | None:
    attrs = dict(row.get("attributes") or {})
    previous = attrs.pop(BACKUP_KEY, None)
    if not isinstance(previous, dict):
        return None
    changes: dict[str, Any] = {"attributes": attrs}
    # Do not overwrite subsequent price edits made in the admin panel.
    if row.get("price_rub") is not None and Decimal(str(row["price_rub"])) == Decimal(previous["after"]):
        changes["price_rub"] = None if previous["before"] is None else Decimal(previous["before"])
    return changes


def selected_rows(bind: sa.Connection) -> list[dict[str, Any]]:
    return [dict(row) for row in bind.execute(
        sa.select(skus, products.c.slug.label("product_slug"))
        .join(products, products.c.id == skus.c.product_id)
        .where(products.c.slug == PRODUCT_SLUG)
    ).mappings()]


def upgrade() -> None:
    bind = op.get_bind()
    rows = selected_rows(bind)
    # Empty fresh databases may not have a catalog yet. A populated family must
    # contain every confirmed diameter: fail before any update if data is missing.
    present = {row["diameter_mm"] for row in rows if target_price(row) is not None}
    if rows and present != set(PRICES):
        raise ValueError(f"Missing real AISI 430 / 0.8 power clamps: {sorted(set(PRICES) - present)}")
    for row in rows:
        values = corrected_values(row)
        if values:
            bind.execute(sa.update(skus).where(skus.c.id == row["id"]).values(**values))


def downgrade() -> None:
    bind = op.get_bind()
    for row in selected_rows(bind):
        values = restored_values(row)
        if values:
            bind.execute(sa.update(skus).where(skus.c.id == row["id"]).values(**values))
