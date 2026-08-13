"""Remove indoor-only copy from single-wall product cards.

Revision ID: 202608110002
Revises: 202608110001
Create Date: 2026-08-11
"""

import re
from collections import defaultdict
from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from alembic import op


revision: str = "202608110002"
down_revision: str | None = "202608110001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BACKUP_KEY = "_single_wall_indoor_copy_previous"
KNOWLEDGE_KEYS = (
    "purpose",
    "installationZones",
    "compatibleWith",
    "incompatibleWith",
    "installationVariants",
    "selectionRules",
    "installationWarnings",
    "fireSafety",
    "requiredInputData",
)

products = sa.table(
    "products",
    sa.column("id", sa.Uuid()),
    sa.column("contour", sa.String()),
    sa.column("short_description", sa.String()),
    sa.column("description", sa.Text()),
    sa.column("purpose", sa.JSON()),
    sa.column("compatibility_notes", sa.Text()),
    sa.column("extra_attributes", sa.JSON()),
)

skus = sa.table(
    "skus",
    sa.column("id", sa.Uuid()),
    sa.column("product_id", sa.Uuid()),
    sa.column("contour", sa.String()),
    sa.column("attributes", sa.JSON()),
)

compatibility_rules = sa.table(
    "compatibility_rules",
    sa.column("code", sa.String()),
    sa.column("is_active", sa.Boolean()),
)


def _is_single_wall(value: str | None) -> bool:
    normalized = (value or "").lower().replace("ё", "е").replace("-", "_")
    return any(token in normalized for token in ("одноконтур", "одностен", "single_wall"))


def _is_retired_sentence(value: str, *, single_wall_context: bool) -> bool:
    normalized = value.lower().replace("ё", "е")
    mentions_single_wall = "одноконтур" in normalized or "одностен" in normalized
    outdoor = any(token in normalized for token in ("улиц", "холодн", "чердак", "кровл", "наружн", "тепл", "стартов"))
    indoor = any(token in normalized for token in ("помещ", "внутри", "тепл", "стартов"))
    restriction = any(token in normalized for token in ("только", "исключительно", "нельзя", "не долж", "запрещ", "допуска"))
    placement = any(token in normalized for token in ("совмест", "подход", "предназнач", "использ", "примен", "установ", "размещ"))
    short_zone = indoor and len(normalized.split()) <= 6
    return (
        (mentions_single_wall and (outdoor or indoor) and (restriction or placement))
        or (single_wall_context and indoor and (restriction or placement or short_zone))
        or (outdoor and "сэндвич" in normalized and "только" in normalized)
    )


def _clean_text(value: str | None, *, single_wall_context: bool) -> str | None:
    if not value:
        return value
    chunks = re.split(r"(?<=[.!?])([ \t\r\n]+)", value)
    kept: list[str] = []
    for index in range(0, len(chunks), 2):
        sentence = chunks[index]
        separator = chunks[index + 1] if index + 1 < len(chunks) else ""
        if _is_retired_sentence(sentence, single_wall_context=single_wall_context):
            continue
        kept.extend((sentence, separator))
    return re.sub(r"\n{3,}", "\n\n", "".join(kept)).strip()


def _clean_list(value: Any, *, single_wall_context: bool) -> Any:
    if not isinstance(value, list):
        return value
    return [
        cleaned
        for item in value
        if isinstance(item, str)
        if (cleaned := _clean_text(item, single_wall_context=single_wall_context))
    ]


def _clean_knowledge(value: Any, *, single_wall_context: bool) -> Any:
    if not isinstance(value, dict):
        return value
    result = dict(value)
    for key in KNOWLEDGE_KEYS:
        if key in result:
            result[key] = _clean_list(result[key], single_wall_context=single_wall_context)
    return result


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.update(compatibility_rules)
        .where(compatibility_rules.c.code == "single_wall_indoor_only")
        .values(is_active=False)
    )
    sku_rows = list(bind.execute(sa.select(skus.c.id, skus.c.product_id, skus.c.contour, skus.c.attributes)).mappings())
    contours_by_product: dict[Any, list[str]] = defaultdict(list)
    for row in sku_rows:
        if row["contour"]:
            contours_by_product[row["product_id"]].append(row["contour"])

    product_rows = bind.execute(sa.select(products)).mappings()
    for row in product_rows:
        sku_contours = contours_by_product[row["id"]]
        single_wall_context = _is_single_wall(row["contour"]) or (
            bool(sku_contours) and all(_is_single_wall(value) for value in sku_contours)
        )
        values: dict[str, Any] = {}
        backup: dict[str, Any] = {}
        for field in ("short_description", "description", "compatibility_notes"):
            original = row[field]
            cleaned = _clean_text(original, single_wall_context=single_wall_context)
            if cleaned != original:
                values[field] = cleaned
                backup[field] = original

        purpose = row["purpose"]
        cleaned_purpose = _clean_list(purpose, single_wall_context=single_wall_context)
        if cleaned_purpose != purpose:
            values["purpose"] = cleaned_purpose
            backup["purpose"] = purpose

        attributes = dict(row["extra_attributes"] or {})
        cleaned_attributes = dict(attributes)
        for field in ("seo_description",):
            if isinstance(attributes.get(field), str):
                cleaned = _clean_text(attributes[field], single_wall_context=single_wall_context)
                if cleaned != attributes[field]:
                    cleaned_attributes[field] = cleaned
                    backup[field] = attributes[field]
        knowledge = attributes.get("seo_knowledge")
        cleaned_knowledge = _clean_knowledge(knowledge, single_wall_context=single_wall_context)
        if cleaned_knowledge != knowledge:
            cleaned_attributes["seo_knowledge"] = cleaned_knowledge
            backup["seo_knowledge"] = knowledge
        if backup:
            cleaned_attributes[BACKUP_KEY] = backup
            values["extra_attributes"] = cleaned_attributes
            bind.execute(sa.update(products).where(products.c.id == row["id"]).values(**values))

    for row in sku_rows:
        attributes = dict(row["attributes"] or {})
        sku_seo = attributes.get("sku_seo")
        if not isinstance(sku_seo, dict):
            continue
        cleaned_seo = dict(sku_seo)
        for field in ("short_description", "description", "seo_description"):
            if isinstance(cleaned_seo.get(field), str):
                cleaned_seo[field] = _clean_text(
                    cleaned_seo[field],
                    single_wall_context=_is_single_wall(row["contour"]),
                )
        if cleaned_seo != sku_seo:
            attributes[BACKUP_KEY] = {"sku_seo": sku_seo}
            attributes["sku_seo"] = cleaned_seo
            bind.execute(sa.update(skus).where(skus.c.id == row["id"]).values(attributes=attributes))


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.update(compatibility_rules)
        .where(compatibility_rules.c.code == "single_wall_indoor_only")
        .values(is_active=True)
    )
    for row in bind.execute(sa.select(products)).mappings():
        attributes = dict(row["extra_attributes"] or {})
        backup = attributes.pop(BACKUP_KEY, None)
        if not isinstance(backup, dict):
            continue
        values: dict[str, Any] = {"extra_attributes": attributes}
        for field in ("short_description", "description", "purpose", "compatibility_notes"):
            if field in backup:
                values[field] = backup[field]
        for field in ("seo_description", "seo_knowledge"):
            if field in backup:
                attributes[field] = backup[field]
        bind.execute(sa.update(products).where(products.c.id == row["id"]).values(**values))

    for row in bind.execute(sa.select(skus.c.id, skus.c.attributes)).mappings():
        attributes = dict(row["attributes"] or {})
        backup = attributes.pop(BACKUP_KEY, None)
        if not isinstance(backup, dict) or "sku_seo" not in backup:
            continue
        attributes["sku_seo"] = backup["sku_seo"]
        bind.execute(sa.update(skus).where(skus.c.id == row["id"]).values(attributes=attributes))
