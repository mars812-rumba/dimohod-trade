from __future__ import annotations

import argparse
import asyncio
import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from sqlalchemy import select

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.media.images import CatalogImageError, encode_catalog_image, store_encoded_catalog_image
from app.modules.catalog.models import Category
from app.modules.products.models import Product, SKU


RASTER_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


@dataclass(frozen=True)
class Conversion:
    source: str
    source_bytes: int
    url: str
    thumbnail_url: str
    webp_bytes: int
    thumbnail_bytes: int
    width: int
    height: int
    content_sha256: str


def source_files(storage_root: Path) -> list[Path]:
    catalog_root = storage_root / "catalog"
    if not catalog_root.exists():
        return []
    candidates = sorted(
        path
        for path in catalog_root.rglob("*")
        if path.is_file()
        and path.suffix.lower() in RASTER_SUFFIXES
        and not path.name.endswith(".thumb.webp")
    )
    original_stems = {
        (path.parent, path.stem)
        for path in candidates
        if path.suffix.lower() != ".webp"
    }
    result: list[Path] = []
    for path in candidates:
        if path.suffix.lower() != ".webp":
            result.append(path)
            continue
        if (path.parent, path.stem) in original_stems:
            continue
        collision_source_exists = any(
            path.stem.endswith(f"-{suffix}")
            and (path.parent / f"{path.stem[: -(len(suffix) + 1)]}.{suffix}").is_file()
            for suffix in ("jpg", "jpeg", "png")
        )
        if not collision_source_exists:
            result.append(path)
    return result


def versioned_media_url(path: Path, storage_root: Path) -> str:
    relative = path.relative_to(storage_root)
    return f"/media/{relative.as_posix()}?v={path.stat().st_mtime_ns}"


def conversion_for_file(
    path: Path,
    storage_root: Path,
    *,
    write: bool,
    output_stem: str | None = None,
) -> Conversion:
    content = path.read_bytes()
    encoded = encode_catalog_image(content)
    output_stem = output_stem or path.stem
    destination = path.parent / f"{output_stem}.webp"
    thumbnail = path.parent / f"{output_stem}.thumb.webp"
    if write:
        stored = store_encoded_catalog_image(encoded, path.parent, f"{output_stem}.webp")
        destination = stored.path
        thumbnail = stored.thumbnail_path
        webp_bytes = destination.stat().st_size
        thumbnail_bytes = thumbnail.stat().st_size
    else:
        webp_bytes = len(encoded.main)
        thumbnail_bytes = len(encoded.thumbnail)
    return Conversion(
        source=path.relative_to(storage_root).as_posix(),
        source_bytes=len(content),
        url=(
            versioned_media_url(destination, storage_root)
            if write
            else f"/media/{destination.relative_to(storage_root).as_posix()}"
        ),
        thumbnail_url=(
            versioned_media_url(thumbnail, storage_root)
            if write
            else f"/media/{thumbnail.relative_to(storage_root).as_posix()}"
        ),
        webp_bytes=webp_bytes,
        thumbnail_bytes=thumbnail_bytes,
        width=encoded.width,
        height=encoded.height,
        content_sha256=encoded.content_sha256,
    )


def convert_catalog(
    storage_root: Path,
    *,
    write: bool,
) -> tuple[list[Conversion], list[dict[str, str]]]:
    conversions: list[Conversion] = []
    failures: list[dict[str, str]] = []
    sources = source_files(storage_root)
    stem_counts: dict[tuple[Path, str], int] = {}
    for source in sources:
        key = (source.parent, source.stem)
        stem_counts[key] = stem_counts.get(key, 0) + 1
    for source in sources:
        output_stem = source.stem
        if stem_counts[(source.parent, source.stem)] > 1:
            output_stem = f"{source.stem}-{source.suffix.lower().removeprefix('.')}"
        try:
            conversions.append(
                conversion_for_file(
                    source,
                    storage_root,
                    write=write,
                    output_stem=output_stem,
                )
            )
        except (CatalogImageError, OSError) as exc:
            failures.append({"source": str(source), "error": str(exc)})
    return conversions, failures


def media_path(url: str) -> str | None:
    path = urlsplit(url).path
    return path.removeprefix("/media/") if path.startswith("/media/") else None


def rewrite_media_values(value: Any, conversions: dict[str, Conversion]) -> tuple[Any, int]:
    if isinstance(value, list):
        rewritten: list[Any] = []
        changes = 0
        for item in value:
            updated, item_changes = rewrite_media_values(item, conversions)
            rewritten.append(updated)
            changes += item_changes
        return rewritten, changes
    if not isinstance(value, dict):
        return value, 0

    rewritten: dict[str, Any] = {}
    changes = 0
    for key, item in value.items():
        updated, item_changes = rewrite_media_values(item, conversions)
        rewritten[key] = updated
        changes += item_changes

    raw_url = rewritten.get("url")
    source = media_path(raw_url) if isinstance(raw_url, str) else None
    conversion = conversions.get(source or "")
    if conversion is None:
        return rewritten, changes
    rewritten.update(
        {
            "url": conversion.url,
            "thumbnail_url": conversion.thumbnail_url,
            "width": conversion.width,
            "height": conversion.height,
            "file_name": Path(urlsplit(conversion.url).path).name,
            "content_sha256": conversion.content_sha256,
        }
    )
    return rewritten, changes + 1


async def apply_database_references(
    conversions: list[Conversion],
    *,
    commit: bool,
    backup_file: Path,
) -> int:
    conversion_map = {item.source: item for item in conversions}
    backup: list[dict[str, Any]] = []
    changed = 0
    async with AsyncSessionLocal() as session:
        for model, label in ((Category, "category"), (Product, "product"), (SKU, "sku")):
            rows = list((await session.scalars(select(model))).all())
            for row in rows:
                attribute_name = "extra_attributes" if model is not SKU else "attributes"
                attributes = dict(getattr(row, attribute_name) or {})
                rewritten, row_changes = rewrite_media_values(attributes, conversion_map)
                if not row_changes:
                    continue
                backup.append(
                    {
                        "type": label,
                        "id": str(row.id),
                        "attribute": attribute_name,
                        "value": attributes,
                    }
                )
                setattr(row, attribute_name, rewritten)
                changed += row_changes

        backup_file.parent.mkdir(parents=True, exist_ok=True)
        backup_file.write_text(json.dumps(backup, ensure_ascii=False, indent=2), encoding="utf-8")
        if commit:
            await session.commit()
        else:
            await session.rollback()
    return changed


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description="Optimize catalog raster images into WebP variants"
    )
    result.add_argument("mode", choices=("audit", "convert", "apply"))
    result.add_argument("--commit", action="store_true", help="Commit DB changes in apply mode")
    result.add_argument("--storage", type=Path, default=Path(settings.media_storage_dir))
    result.add_argument("--report", type=Path)
    return result


async def main() -> None:
    args = parser().parse_args()
    storage_root = args.storage.resolve()
    write = args.mode in {"convert", "apply"}
    conversions, failures = convert_catalog(storage_root, write=write)
    timestamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    report = args.report or Path("../backups") / f"catalog-media-{timestamp}.json"
    payload: dict[str, Any] = {
        "mode": args.mode,
        "storage": str(storage_root),
        "conversions": [asdict(item) for item in conversions],
        "failures": failures,
    }
    if args.mode == "apply":
        backup_file = report.with_name(f"{report.stem}-database-backup.json")
        payload["database_references"] = await apply_database_references(
            conversions,
            commit=args.commit,
            backup_file=backup_file,
        )
        payload["database_committed"] = args.commit
        payload["database_backup"] = str(backup_file)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    source_bytes = sum(item.source_bytes for item in conversions)
    optimized_bytes = sum(item.webp_bytes + item.thumbnail_bytes for item in conversions)
    print(f"Images: {len(conversions)}, failures: {len(failures)}")
    print(f"Source: {source_bytes / 1048576:.2f} MiB")
    print(f"WebP + thumbnails: {optimized_bytes / 1048576:.2f} MiB")
    print(f"Report: {report}")
    if args.mode == "apply" and not args.commit:
        print("Database changes were rolled back. Re-run with --commit after reviewing the report.")


if __name__ == "__main__":
    asyncio.run(main())
