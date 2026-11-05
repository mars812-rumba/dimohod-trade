"""Reconstruct a catalog in a NEW loopback recovery database, never production.

Schema migrations run up to the import boundary, then the historical prices are
loaded before subsequent data migrations. This preserves their corrections.
"""

import argparse
import asyncio
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

from sqlalchemy import func, select, text
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.db.import_price_list import import_price_list, logical_item_name
from app.db.seed_compatibility_rules import seed_compatibility_rules
from app.db.session import AsyncSessionLocal, engine
from app.modules.catalog.models import Category
from app.modules.compatibility.models import CompatibilityRule
from app.modules.products.models import SKU, NeedsReview, Product

BACKEND = Path(__file__).resolve().parents[2]


def recovery_database_only() -> None:
    url = make_url(settings.database_url)
    if (url.host not in {"localhost", "127.0.0.1"}
            or url.database != "dimohod_recovery" or url.port != 55432):
        raise ValueError("Recovery requires loopback port 55432 and database dimohod_recovery")


async def ensure_fresh_database() -> None:
    async with engine.connect() as connection:
        tables = await connection.scalar(text(
            "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
        ))
        if tables:
            raise ValueError("Database is not empty; recovery will not overwrite existing data")


async def ensure_empty_import_boundary() -> None:
    async with engine.connect() as connection:
        revision = await connection.scalar(text("SELECT version_num FROM alembic_version"))
        if revision != "202608010002":
            raise ValueError("Resume requires the exact pre-import migration boundary")
        for table in ["categories", "products", "skus", "needs_review", "compatibility_rules"]:
            if await connection.scalar(text(f"SELECT count(*) FROM {table}")):
                raise ValueError("Resume refuses a database containing catalog records")


async def ensure_imported_boundary() -> None:
    async with engine.connect() as connection:
        if await connection.scalar(text("SELECT version_num FROM alembic_version")) != "202608010002":
            raise ValueError("Migration resume requires the pre-import migration boundary")
        for sheet in ["голые", "Лист1"]:
            count = await connection.scalar(select(func.count()).select_from(SKU).where(
                SKU.attributes["source_sheet"].as_string() == sheet
            ))
            if not count:
                raise ValueError(f"Missing imported source sheet: {sheet}")


def migrate(target: str) -> None:
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", target], cwd=BACKEND, check=True)


def source_info(path: Path) -> dict[str, object]:
    data = path.read_bytes()
    return {"file": path.name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}


def media_exists(item: dict) -> bool:
    url = urlsplit(str(item.get("url", "")))
    if url.scheme or url.netloc or not url.path.startswith("/media/catalog/"):
        return False
    root = Path(settings.media_storage_dir).resolve()
    path = (root / unquote(url.path.removeprefix("/media/"))).resolve()
    return path.is_relative_to(root / "catalog") and path.is_file()


def name_key(value: str) -> str:
    return re.sub(r"\W+", "", logical_item_name(value).casefold())


async def restore_media(path: Path) -> dict[str, object]:
    records = json.loads(path.read_text(encoding="utf-8"))
    report: dict[str, object] = {"attached": [], "unresolved": []}
    # Reuse the actual historical slug normalization instead of guessing aliases.
    module_path = BACKEND / "alembic/versions/202608060001_normalize_public_product_slugs.py"
    spec = importlib.util.spec_from_file_location("recovery_slug_normalization", module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    lengths_spec = importlib.util.spec_from_file_location("recovery_photo_lengths",
        BACKEND / "alembic/versions/202608220001_sandwich_pipe_media_lengths.py")
    lengths_module = importlib.util.module_from_spec(lengths_spec)
    lengths_spec.loader.exec_module(lengths_module)
    async with AsyncSessionLocal() as session:
        products = list((await session.scalars(select(Product))).all())
        categories = list((await session.scalars(select(Category))).all())
        skus = list((await session.scalars(select(SKU))).all())
        for record in records:
            values = record.get("value") or {}
            kind = record.get("type")
            candidates = []
            if kind == "product":
                candidates = [p for p in products if str(p.id) == record["id"]]
                if not candidates:
                    legacy = values.get("legacy_product_slugs_sample", [])
                    candidates = [p for p in products if any(
                        module.normalized_slug(slug, p.product_kind) == p.slug for slug in legacy
                    )]
                if not candidates and values.get("raw_item_name"):
                    contour = "сэндвич" if values.get("outer_diameter_mm") else "одностенный"
                    candidates = [p for p in products if p.contour == contour and name_key(
                        (p.extra_attributes or {}).get("logical_item_name", "")
                    ) == name_key(values["raw_item_name"])]
                media = [item for item in values.get("media", []) if media_exists(item)]
                attribute, key = "extra_attributes", "media"
            elif kind == "category":
                cover = values.get("category_cover") or {}
                parts = urlsplit(cover.get("url", "")).path.split("/")
                slug = parts[-2] if len(parts) > 1 else ""
                candidates = [c for c in categories if c.slug == slug]
                media = [cover] if media_exists(cover) else []
                attribute, key = "extra_attributes", "category_cover"
            elif kind == "sku":
                media = values.get("sku_media") or ([values["sku_photo"]] if values.get("sku_photo") else [])
                media = [item for item in media if media_exists(item)]
                articles = {urlsplit(item["url"]).path.split("/")[-2].casefold() for item in media}
                candidates = [s for s in skus if s.article.casefold() in articles]
                attribute, key = "attributes", "sku_media"
            else:
                continue
            if len(candidates) != 1 or not media:
                report["unresolved"].append({"type": kind, "old_id": record["id"],
                                             "candidates": len(candidates), "existing_images": len(media)})
                continue
            row = candidates[0]
            if kind == "product" and row.slug == "sendvich-truba":
                media = lengths_module.sandwich_pipe_media(media) or media
            attrs = dict(getattr(row, attribute) or {})
            attrs[key] = media[0] if kind == "category" else media
            setattr(row, attribute, attrs)
            report["attached"].append({"type": kind, "old_id": record["id"],
                                       "key": row.article if kind == "sku" else row.slug,
                                       "images": len(media)})
        await session.commit()
    return report


async def counts() -> dict[str, int]:
    async with AsyncSessionLocal() as session:
        return {model.__tablename__: await session.scalar(select(func.count()).select_from(model))
                for model in [Category, Product, SKU, CompatibilityRule, NeedsReview]}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--price-list", type=Path, required=True)
    parser.add_argument("--sandwich-prices", type=Path, required=True)
    parser.add_argument("--media-backup", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--resume-import", action="store_true",
                        help="Resume only an empty database at the pre-import migration boundary")
    parser.add_argument("--resume-migrations", action="store_true",
                        help="Resume data migrations only after both source sheets were imported")
    args = parser.parse_args()
    recovery_database_only()
    report = {"sources": [source_info(p) for p in
                           [args.price_list, args.sandwich_prices, args.media_backup]],
              "limitations": ["Historical prices; current stock unknown", "No historical customers or estimates restored",
                              "Ambiguous media associations are left unresolved"]}

    async def start():
        if args.resume_migrations:
            await ensure_imported_boundary()
        elif args.resume_import:
            await ensure_empty_import_boundary()
        else:
            await ensure_fresh_database()
        await engine.dispose()
    asyncio.run(start())
    if not args.resume_import and not args.resume_migrations:
        migrate("202608010002")

    async def import_prices():
        report["single_wall_import"] = await import_price_list(args.price_list, "голые")
        report["sandwich_import"] = await import_price_list(args.sandwich_prices, "Лист1")
        await engine.dispose()
    if not args.resume_migrations:
        asyncio.run(import_prices())
    else:
        report["import_resume"] = "Reusing both imported source sheets at revision 202608010002"
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")
    migrate("head")

    async def finish():
        report["compatibility_rules"] = await seed_compatibility_rules()
        report["media"] = await restore_media(args.media_backup)
        report["counts"] = await counts()
        await engine.dispose()
    asyncio.run(finish())
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")
    print(json.dumps(report["counts"], ensure_ascii=False))
    print("Recovery report:", args.report)


if __name__ == "__main__":
    main()
