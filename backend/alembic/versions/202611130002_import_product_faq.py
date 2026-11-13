"""Import reviewed FAQ for all catalog product families.

Revision ID: 202611130002
Revises: 202611130001
"""
from collections.abc import Sequence
from copy import deepcopy
import json
from pathlib import Path
from typing import Any

import sqlalchemy as sa
from alembic import op

revision: str = "202611130002"
down_revision: str | None = "202611130001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CONTENT_FILE = "dimohod-faq-content-20261113.json"
BACKUP_KEY = "_faq_content_20261113_previous"
FAQ_KEYS = ("faq_draft", "faq", "faq_configured")


def load_content() -> dict[str, list[dict[str, Any]]]:
    path = Path(__file__).resolve().parents[2] / "catalog_content" / CONTENT_FILE
    payload = json.loads(path.read_text(encoding="utf-8"))
    families = payload.get("product_families", [])
    if len(families) != 36 or sum(len(item.get("faq", [])) for item in families) != 72:
        raise ValueError("FAQ content must contain exactly 36 product families and 72 items")
    return payload


def public_faq_items(item: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for faq in item["faq"]:
        research = faq.get("research") or {}
        question_sources = ", ".join(research.get("question_source_ids") or [])
        answer_sources = ", ".join(research.get("answer_source_ids") or [])
        evidence = [
            f"Происхождение вопроса: {research.get('question_origin', 'не указано')}",
            f"Источники вопроса: {question_sources or 'не указаны'}",
            f"Источники ответа: {answer_sources or 'не указаны'}",
            f"Проверено: {research.get('checked_at', 'не указано')}; статус: {research.get('answer_status', 'не указан')}",
        ]
        result.append(
            {
                "question": faq["question"].strip(),
                "answer": faq["answer"].strip(),
                "evidence": evidence,
                "is_visible": True,
            }
        )
    return result


def upgraded_attributes(
    raw_attributes: dict[str, Any] | None,
    imported_faq: list[dict[str, Any]],
) -> dict[str, Any] | None:
    attributes = dict(raw_attributes or {})
    if BACKUP_KEY in attributes:
        return None
    attributes[BACKUP_KEY] = {
        "previous": {
            key: {"present": key in attributes, "value": deepcopy(attributes.get(key))}
            for key in FAQ_KEYS
        },
        "imported": {
            "faq_draft": deepcopy(imported_faq),
            "faq": deepcopy(imported_faq),
            "faq_configured": True,
        },
    }
    attributes["faq_draft"] = deepcopy(imported_faq)
    attributes["faq"] = deepcopy(imported_faq)
    attributes["faq_configured"] = True
    return attributes


def restored_attributes(raw_attributes: dict[str, Any] | None) -> dict[str, Any] | None:
    attributes = dict(raw_attributes or {})
    backup = attributes.pop(BACKUP_KEY, None)
    if not isinstance(backup, dict):
        return None
    previous = backup.get("previous") or {}
    imported = backup.get("imported") or {}
    faq_was_edited = any(
        attributes.get(key) != imported.get(key)
        for key in ("faq_draft", "faq")
    )
    for key in FAQ_KEYS:
        if key == "faq_configured" and faq_was_edited:
            continue
        if attributes.get(key) != imported.get(key):
            continue
        old = previous.get(key) or {}
        if old.get("present"):
            attributes[key] = old.get("value")
        else:
            attributes.pop(key, None)
    return attributes


def _tables() -> tuple[sa.Table, sa.Table]:
    metadata = sa.MetaData()
    categories = sa.Table(
        "categories",
        metadata,
        sa.Column("id", sa.Uuid()),
        sa.Column("parent_id", sa.Uuid()),
        sa.Column("name", sa.String()),
    )
    products = sa.Table(
        "products",
        metadata,
        sa.Column("id", sa.Uuid()),
        sa.Column("category_id", sa.Uuid()),
        sa.Column("name", sa.String()),
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

    targets: list[tuple[Any, dict[str, Any]]] = []
    errors: list[str] = []
    seen_paths: set[tuple[str, ...]] = set()
    for item in content["product_families"]:
        path = tuple(item.get("catalog_path") or [])
        if path in seen_paths:
            errors.append(f"duplicate path {path!r}")
            continue
        seen_paths.add(path)
        category_matches = category_lookup.get(path[:2], [])
        matches = [] if len(category_matches) != 1 else product_lookup.get(
            (category_matches[0]["id"], item.get("name")), []
        )
        if len(path) != 3 or len(matches) != 1:
            errors.append(f"product family {path!r}: found {len(matches)}")
        else:
            targets.append((matches[0], item))
    if errors:
        raise ValueError("FAQ content does not match the catalog: " + "; ".join(errors))

    for row, item in targets:
        values = upgraded_attributes(row["extra_attributes"], public_faq_items(item))
        if values is not None:
            bind.execute(
                products.update()
                .where(products.c.id == row["id"])
                .values(extra_attributes=values)
            )


def downgrade() -> None:
    bind = op.get_bind()
    _categories, products = _tables()
    for row in bind.execute(sa.select(products)).mappings():
        values = restored_attributes(row["extra_attributes"])
        if values is not None:
            bind.execute(
                products.update()
                .where(products.c.id == row["id"])
                .values(extra_attributes=values)
            )
