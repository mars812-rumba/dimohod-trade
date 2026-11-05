"""Optional, reversible TEST DATA. Not imported by the application or migrations."""

import argparse
import asyncio
import json
import uuid
from decimal import Decimal
from pathlib import Path

from app.core.config import settings
from app.db.models import SKU, Product
from app.db.recover_catalog import counts, recovery_database_only
from app.db.session import AsyncSessionLocal, engine
from sqlalchemy import or_, select

KEY = "recovery_temporary_price"
PRICE = Decimal("100.00")
MISSING = [
    ("odnostennyi-krepezh-homut-silovoi", diameter, None) for diameter in (215, 350, 400)
] + [("dekorativnaya-yubka", diameter, "AISI 430") for diameter in (350, 400)]
FIELDS = ("name", "diameter_mm", "outer_diameter_mm", "material", "steel_grade", "stock_status")


async def run(rollback: bool):
    recovery_database_only()
    changes = {"created": [], "priced_existing": [], "removed": [], "restored": [], "preserved_edits": []}
    async with AsyncSessionLocal() as session:
        if rollback:
            rows = list((await session.scalars(select(SKU))).all())
            for row in rows:
                marker = (row.attributes or {}).get(KEY)
                if not isinstance(marker, dict):
                    continue
                if row.price_rub != PRICE or (marker.get("created") and any(
                    getattr(row, field) != marker["snapshot"][field] for field in FIELDS
                )):
                    changes["preserved_edits"].append(row.article)
                    continue
                if marker.get("created"):
                    await session.delete(row)
                    changes["removed"].append(row.article)
                else:
                    previous = marker["previous_price_rub"]
                    row.price_rub = None if previous is None else Decimal(previous)
                    attrs = dict(row.attributes); attrs.pop(KEY)
                    row.attributes = attrs
                    changes["restored"].append(row.article)
        else:
            rows = list((await session.scalars(select(SKU).where(
                SKU.is_active.is_(True), or_(SKU.price_rub.is_(None), SKU.price_rub <= 0)
            ))).all())
            for row in rows:
                attrs = dict(row.attributes or {})
                attrs[KEY] = {"created": False, "price_rub": str(PRICE),
                              "previous_price_rub": None if row.price_rub is None else str(row.price_rub),
                              "source": "Owner request, 2026-11-04: temporary test prices"}
                row.attributes = attrs; row.price_rub = PRICE
                changes["priced_existing"].append(row.article)
            for family_slug, diameter, required_steel in MISSING:
                product = await session.scalar(select(Product).where(Product.slug == family_slug))
                if product is None:
                    raise ValueError(f"Required family is missing: {family_slug}")
                # If an actual variant has been added since the coverage report, keep it.
                actual = await session.scalar(select(SKU).where(
                    SKU.product_id == product.id, SKU.diameter_mm == diameter,
                    SKU.outer_diameter_mm.is_(None), SKU.is_active.is_(True),
                    *([SKU.steel_grade == required_steel] if required_steel else []),
                ))
                if actual is not None:
                    continue
                kind = "SKIRT" if required_steel else "POWER-CLAMP"
                article = f"RECOVERY-TEMP-{kind}-D{diameter}"
                row = SKU(id=uuid.uuid5(uuid.NAMESPACE_URL, "dimohod-recovery:"+article),
                          product_id=product.id, article=article,
                          name=f"[ТЕСТ] {product.name} Ø{diameter} — временная цена",
                          slug=f"recovery-temp-d{diameter}", diameter_mm=diameter,
                          outer_diameter_mm=None, steel_grade=required_steel,
                          material="нержавеющая сталь" if required_steel else None,
                          stock_status="unknown", price_rub=PRICE, is_active=True)
                # Steel/material on skirt stubs are requested matching inputs from
                # the existing BOM, not a claim that a real execution is stocked.
                row.attributes = {KEY: {"created": True, "price_rub": str(PRICE),
                    "source": "Owner request, 2026-11-04: temporary test prices",
                    "technical_status": "Test matching values; actual execution requires confirmation",
                    "snapshot": {field: getattr(row, field) for field in FIELDS}},
                    "recovery_placeholder": True}
                session.add(row)
                changes["created"].append(article)
        await session.commit()
    changes["counts"] = await counts()
    runtime = Path(settings.media_storage_dir).parent
    (runtime / "temporary-prices.json").write_text(json.dumps(changes, ensure_ascii=False, indent=2)+"\n")
    report_path = runtime / "recovery-report.json"
    if report_path.exists():
        report = json.loads(report_path.read_text())
        report["temporary_prices"] = changes
        report["counts"] = changes["counts"]
        report.setdefault("owner_decisions", {})["missing_clamps_and_skirts"] = (
            "Rolled back temporary prices" if rollback else
            "Temporary test SKUs at 100 RUB; confirmed historical prices unchanged (2026-11-04)"
        )
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2)+"\n")
    await engine.dispose()
    print(json.dumps(changes, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--apply", action="store_true")
    action.add_argument("--rollback", action="store_true")
    args = parser.parse_args()
    asyncio.run(run(args.rollback))
