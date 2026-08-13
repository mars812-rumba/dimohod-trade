"""Remove the retired single-wall outdoor rule from SEO copy.

Revision ID: 202608110001
Revises: 202608060001
Create Date: 2026-08-11
"""

import re
from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from alembic import op


revision: str = "202608110001"
down_revision: str | None = "202608060001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BACKUP_KEY = "_single_wall_outdoor_seo_previous"
SEO_KNOWLEDGE_LIST_KEYS = (
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
    sa.column("short_description", sa.String()),
    sa.column("description", sa.Text()),
    sa.column("extra_attributes", sa.JSON()),
)

skus = sa.table(
    "skus",
    sa.column("id", sa.Uuid()),
    sa.column("attributes", sa.JSON()),
)


def _is_retired_rule_sentence(value: str) -> bool:
    normalized = value.lower().replace("ё", "е")
    mentions_single_wall = "одноконтур" in normalized or "одностен" in normalized
    mentions_zone = any(
        token in normalized
        for token in ("улиц", "холодн", "чердак", "кровл", "наружн", "тепл", "стартов")
    )
    is_restriction = any(
        token in normalized
        for token in ("только", "нельзя", "не долж", "запрещ", "допуска")
    )
    sandwich_only_outdoors = mentions_zone and "сэндвич" in normalized and "только" in normalized
    return (mentions_single_wall and mentions_zone and is_restriction) or sandwich_only_outdoors


def _clean_text(value: str | None) -> str | None:
    if not value:
        return value
    chunks = re.split(r"(?<=[.!?])([ \t\r\n]+)", value)
    kept: list[str] = []
    for index in range(0, len(chunks), 2):
        sentence = chunks[index]
        separator = chunks[index + 1] if index + 1 < len(chunks) else ""
        if _is_retired_rule_sentence(sentence):
            continue
        kept.extend((sentence, separator))
    return re.sub(r"\n{3,}", "\n\n", "".join(kept)).strip()


def _clean_knowledge(value: Any) -> Any:
    if not isinstance(value, dict):
        return value
    result = dict(value)
    for key in SEO_KNOWLEDGE_LIST_KEYS:
        raw_values = result.get(key)
        if not isinstance(raw_values, list):
            continue
        result[key] = [
            cleaned
            for raw_value in raw_values
            if isinstance(raw_value, str)
            if (cleaned := _clean_text(raw_value))
        ]
    return result


def _clean_sku_seo(value: Any) -> Any:
    if not isinstance(value, dict):
        return value
    result = dict(value)
    for key in ("short_description", "description", "seo_description"):
        if isinstance(result.get(key), str):
            result[key] = _clean_text(result[key])
    return result


def upgrade() -> None:
    bind = op.get_bind()
    product_rows = bind.execute(
        sa.select(
            products.c.id,
            products.c.short_description,
            products.c.description,
            products.c.extra_attributes,
        )
    ).mappings()
    for row in product_rows:
        values: dict[str, Any] = {}
        backup: dict[str, Any] = {}

        for field in ("short_description", "description"):
            original = row[field]
            cleaned = _clean_text(original)
            if cleaned != original:
                values[field] = cleaned
                backup[field] = original

        attributes = dict(row["extra_attributes"] or {})
        cleaned_attributes = dict(attributes)
        seo_description = attributes.get("seo_description")
        if isinstance(seo_description, str):
            cleaned_description = _clean_text(seo_description)
            if cleaned_description != seo_description:
                cleaned_attributes["seo_description"] = cleaned_description
                backup["seo_description"] = seo_description

        knowledge = attributes.get("seo_knowledge")
        cleaned_knowledge = _clean_knowledge(knowledge)
        if cleaned_knowledge != knowledge:
            cleaned_attributes["seo_knowledge"] = cleaned_knowledge
            backup["seo_knowledge"] = knowledge

        if backup:
            cleaned_attributes[BACKUP_KEY] = backup
            values["extra_attributes"] = cleaned_attributes
            bind.execute(sa.update(products).where(products.c.id == row["id"]).values(**values))

    sku_rows = bind.execute(sa.select(skus.c.id, skus.c.attributes)).mappings()
    for row in sku_rows:
        attributes = dict(row["attributes"] or {})
        sku_seo = attributes.get("sku_seo")
        cleaned_sku_seo = _clean_sku_seo(sku_seo)
        if cleaned_sku_seo == sku_seo:
            continue
        attributes[BACKUP_KEY] = {"sku_seo": sku_seo}
        attributes["sku_seo"] = cleaned_sku_seo
        bind.execute(
            sa.update(skus).where(skus.c.id == row["id"]).values(attributes=attributes)
        )


def downgrade() -> None:
    bind = op.get_bind()
    product_rows = bind.execute(
        sa.select(
            products.c.id,
            products.c.short_description,
            products.c.description,
            products.c.extra_attributes,
        )
    ).mappings()
    for row in product_rows:
        attributes = dict(row["extra_attributes"] or {})
        backup = attributes.pop(BACKUP_KEY, None)
        if not isinstance(backup, dict):
            continue
        values: dict[str, Any] = {"extra_attributes": attributes}
        for field in ("short_description", "description"):
            if field in backup:
                values[field] = backup[field]
        for field in ("seo_description", "seo_knowledge"):
            if field in backup:
                attributes[field] = backup[field]
        bind.execute(sa.update(products).where(products.c.id == row["id"]).values(**values))

    sku_rows = bind.execute(sa.select(skus.c.id, skus.c.attributes)).mappings()
    for row in sku_rows:
        attributes = dict(row["attributes"] or {})
        backup = attributes.pop(BACKUP_KEY, None)
        if not isinstance(backup, dict) or "sku_seo" not in backup:
            continue
        attributes["sku_seo"] = backup["sku_seo"]
        bind.execute(
            sa.update(skus).where(skus.c.id == row["id"]).values(attributes=attributes)
        )
