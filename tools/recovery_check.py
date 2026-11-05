"""Verify only a loopback recovery API; never send leads or emails."""

import asyncio
import json
from pathlib import Path

import httpx
from app.core.config import settings
from app.db.recover_catalog import counts, recovery_database_only, restore_media
from app.db.session import AsyncSessionLocal, engine
from app.modules.products.models import SKU, NeedsReview, Product
from sqlalchemy import select


async def main():
    recovery_database_only()
    root = Path(__file__).resolve().parents[1]
    runtime = Path(settings.media_storage_dir).parent
    report_path = runtime / "recovery-report.json"
    report = json.loads(report_path.read_text())
    report["media"] = await restore_media(root / "backups/catalog-media-20260811-211040-database-backup.json")
    headers = {"X-BOM-Admin-Token": settings.bom_admin_token}
    checks = {}
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8101", timeout=30) as client:
        response = await client.get("/api/v1/catalog/tree")
        response.raise_for_status()
        checks["catalog_root_categories"] = len(response.json()["items"])
        assert (await client.get("/api/v1/admin/products")).status_code == 401
        response = await client.get("/api/v1/admin/products", headers=headers)
        response.raise_for_status()
        checks["admin_products"] = response.json()["total"]
        params = {"product_kind": "труба", "category": "sendvich-truby", "diameter": "115:215",
                  "length_mm": 1000, "steel_grade": "AISI 304", "wall_thickness_mm": "0.8",
                  "outer_steel_grade": "AISI 430", "outer_wall_thickness_mm": "0.5"}
        response = await client.get("/api/v1/products", params=params)
        response.raise_for_status()
        assert response.json()["items"], "No exact SKU for a core configurator query"
        item = response.json()["items"][0]
        checks["exact_115_215_match"] = {key: item.get(key) for key in
                                        ["article", "price_rub", "diameter_mm", "outer_diameter_mm", "length_mm"]}
        response = await client.get("/api/v1/products/sendvich-truba")
        response.raise_for_status()
        product = response.json()
        checks["family_detail_skus"] = len({s["id"] for s in product["skus"]}
                                          | {s[0] for s in product.get("compact_skus", [])})
        photo_urls = [p["url"] for p in product.get("media", [])]
        if not photo_urls and item.get("primary_image"):
            photo_urls = [item["primary_image"]["url"]]
        assert photo_urls, "Product photos were not restored"
        for url in photo_urls[:3]:
            assert (await client.get(url)).status_code == 200
        checks["media_readable"] = True
        response = await client.get("/api/v1/admin/customers", headers=headers)
        response.raise_for_status()
        checks["historical_customers"] = response.json()["total"]
        assert checks["historical_customers"] == 0
        assert (await client.get("/media/customers/test.json")).status_code == 404
        # Exercise actual admin persistence, then remove only this test's SKU.
        async with AsyncSessionLocal() as session:
            family = await session.scalar(select(Product).where(Product.slug == "sendvich-truba"))
            family_id = str(family.id)
        test_id = None
        try:
            response = await client.post(f"/api/v1/admin/products/{family_id}/skus", headers=headers,
                json={"article": "RECOVERY-SMOKE-ONLY", "name": "Recovery persistence check", "is_active": False,
                      "price_rub": "123.45", "stock_status": "unknown"})
            response.raise_for_status()
            test_id = response.json()["id"]
            response = await client.patch(f"/api/v1/admin/skus/{test_id}", headers=headers,
                                           json={"price_rub": "234.56"})
            response.raise_for_status()
            assert response.json()["price_rub"] == "234.56"
            response = await client.delete(f"/api/v1/admin/skus/{test_id}", headers=headers)
            response.raise_for_status()
            assert response.json()["is_active"] is False
            checks["admin_sku_create_update_deactivate"] = True
        finally:
            if test_id:
                async with AsyncSessionLocal() as session:
                    sku = await session.scalar(select(SKU).where(SKU.article == "RECOVERY-SMOKE-ONLY"))
                    if sku is not None and str(sku.id) == test_id:
                        await session.delete(sku)
                        await session.commit()
    async with AsyncSessionLocal() as session:
        reviews = list((await session.scalars(select(NeedsReview))).all())
        report["needs_review"] = [{key: getattr(row, key) for key in
                                    ["source_sheet", "source_section", "source_row_key", "field_name", "raw_value", "reason"]}
                                   for row in reviews]
    report["counts"] = await counts()
    report["checks"] = checks
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str) + "\n")
    await engine.dispose()
    print(json.dumps(checks, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
