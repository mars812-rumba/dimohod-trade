"""Import reviewed category and product-family SEO content.

Revision ID: 202611130001
Revises: 202610220001
"""
from collections.abc import Sequence
import json
from pathlib import Path
from typing import Any

import sqlalchemy as sa
from alembic import op

revision: str = "202611130001"
down_revision: str | None = "202610220001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CONTENT_FILE = "dimohod-seo-content-20261113.json"
BACKUP_KEY = "_seo_content_20261113_previous"


def load_content() -> dict[str, list[dict[str, Any]]]:
    path = Path(__file__).resolve().parents[2] / "catalog_content" / CONTENT_FILE
    payload = json.loads(path.read_text(encoding="utf-8"))
    if len(payload.get("categories", [])) != 19 or len(payload.get("product_families", [])) != 36:
        raise ValueError("SEO content must contain exactly 19 categories and 36 product families")
    return payload


def upgraded_values(
    description: str | None,
    raw_attributes: dict[str, Any] | None,
    *,
    imported_description: str,
    imported_title: str,
    imported_meta: str,
) -> dict[str, Any] | None:
    attributes = dict(raw_attributes or {})
    if BACKUP_KEY in attributes:
        return None
    attributes[BACKUP_KEY] = {
        "description": description,
        "seo_title_present": "seo_title" in attributes,
        "seo_title": attributes.get("seo_title"),
        "seo_description_present": "seo_description" in attributes,
        "seo_description": attributes.get("seo_description"),
        "imported_description": imported_description,
        "imported_title": imported_title,
        "imported_meta": imported_meta,
    }
    attributes["seo_title"] = imported_title
    attributes["seo_description"] = imported_meta
    return {"description": imported_description, "extra_attributes": attributes}


def restored_values(
    description: str | None,
    raw_attributes: dict[str, Any] | None,
) -> dict[str, Any] | None:
    attributes = dict(raw_attributes or {})
    backup = attributes.pop(BACKUP_KEY, None)
    if not isinstance(backup, dict):
        return None

    restored_description = description
    if description == backup.get("imported_description"):
        restored_description = backup.get("description")
    for key, imported_key, present_key in (
        ("seo_title", "imported_title", "seo_title_present"),
        ("seo_description", "imported_meta", "seo_description_present"),
    ):
        if attributes.get(key) != backup.get(imported_key):
            continue
        if backup.get(present_key):
            attributes[key] = backup.get(key)
        else:
            attributes.pop(key, None)
    return {"description": restored_description, "extra_attributes": attributes}


def _tables() -> tuple[sa.Table, sa.Table]:
    metadata = sa.MetaData()
    categories = sa.Table(
        "categories",
        metadata,
        sa.Column("id", sa.Uuid()),
        sa.Column("parent_id", sa.Uuid()),
        sa.Column("name", sa.String()),
        sa.Column("description", sa.Text()),
        sa.Column("extra_attributes", sa.JSON()),
    )
    products = sa.Table(
        "products",
        metadata,
        sa.Column("id", sa.Uuid()),
        sa.Column("category_id", sa.Uuid()),
        sa.Column("name", sa.String()),
        sa.Column("description", sa.Text()),
        sa.Column("extra_attributes", sa.JSON()),
    )
    return categories, products


def upgrade() -> None:
    bind = op.get_bind()
    categories, products = _tables()
    content = load_content()

    category_rows = list(bind.execute(sa.select(categories)).mappings())
    category_by_id = {row["id"]: row for row in category_rows}
    category_lookup: dict[tuple[str, str], list[Any]] = {}
    for row in category_rows:
        parent = category_by_id.get(row["parent_id"])
        if parent is not None:
            category_lookup.setdefault((parent["name"], row["name"]), []).append(row)

    product_rows = list(bind.execute(sa.select(products)).mappings())
    product_lookup: dict[tuple[Any, str], list[Any]] = {}
    for row in product_rows:
        product_lookup.setdefault((row["category_id"], row["name"]), []).append(row)

    category_targets: list[tuple[Any, dict[str, Any]]] = []
    product_targets: list[tuple[Any, dict[str, Any]]] = []
    errors: list[str] = []
    for item in content["categories"]:
        path = item.get("catalog_path")
        matches = category_lookup.get(tuple(path or []), [])
        if len(matches) != 1:
            errors.append(f"category {path!r}: found {len(matches)}")
        else:
            category_targets.append((matches[0], item))
    for item in content["product_families"]:
        path = item.get("catalog_path") or []
        category_matches = category_lookup.get(tuple(path[:2]), [])
        matches = [] if len(category_matches) != 1 else product_lookup.get(
            (category_matches[0]["id"], item.get("name")), []
        )
        if len(path) != 3 or len(matches) != 1:
            errors.append(f"product family {path!r}: found {len(matches)}")
        else:
            product_targets.append((matches[0], item))
    if errors:
        raise ValueError("SEO content does not match the catalog: " + "; ".join(errors))

    for row, item in category_targets:
        values = upgraded_values(
            row["description"],
            row["extra_attributes"],
            imported_description=item["seo_description"],
            imported_title=item["seo_title"],
            imported_meta=item["meta_description"],
        )
        if values is not None:
            bind.execute(categories.update().where(categories.c.id == row["id"]).values(**values))
    for row, item in product_targets:
        values = upgraded_values(
            row["description"],
            row["extra_attributes"],
            imported_description=item["description"],
            imported_title=item["seo_title"],
            imported_meta=item["meta_description"],
        )
        if values is not None:
            bind.execute(products.update().where(products.c.id == row["id"]).values(**values))


def downgrade() -> None:
    bind = op.get_bind()
    categories, products = _tables()
    for table in (categories, products):
        for row in bind.execute(sa.select(table)).mappings():
            values = restored_values(row["description"], row["extra_attributes"])
            if values is not None:
                bind.execute(table.update().where(table.c.id == row["id"]).values(**values))
