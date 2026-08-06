"""Normalize family slugs used by public diameter URLs.

Revision ID: 202608060001
Revises: 202608050007
Create Date: 2026-08-06
"""

import re
import unicodedata
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "202608060001"
down_revision: str | None = "202608050007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PREVIOUS_SLUG_KEY = "_seo_public_slug_previous"
KIND_SLUG_ALIASES = {
    "тройник": ("troynik", "troi-nik"),
    "четверник": ("chetvernik", "chetver-nik"),
}

products = sa.table(
    "products",
    sa.column("id", sa.Uuid()),
    sa.column("slug", sa.String()),
    sa.column("product_kind", sa.String()),
    sa.column("extra_attributes", sa.JSON()),
)


def slugify(value: str) -> str:
    translit = {
        "а": "a",
        "б": "b",
        "в": "v",
        "г": "g",
        "д": "d",
        "е": "e",
        "ё": "e",
        "ж": "zh",
        "з": "z",
        "и": "i",
        "й": "y",
        "к": "k",
        "л": "l",
        "м": "m",
        "н": "n",
        "о": "o",
        "п": "p",
        "р": "r",
        "с": "s",
        "т": "t",
        "у": "u",
        "ф": "f",
        "х": "h",
        "ц": "c",
        "ч": "ch",
        "ш": "sh",
        "щ": "sch",
        "ъ": "",
        "ы": "y",
        "ь": "",
        "э": "e",
        "ю": "yu",
        "я": "ya",
    }
    normalized = unicodedata.normalize("NFKD", value.lower())
    normalized = "".join(translit.get(character, character) for character in normalized)
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")


def normalized_slug(slug: str, product_kind: str | None) -> str:
    if not product_kind:
        return slug
    kinds = KIND_SLUG_ALIASES.get(product_kind, (slugify(product_kind),))
    value = slug
    for kind in kinds:
        value = re.sub(
            rf"(^|-){re.escape(kind)}-{re.escape(kind)}(?=-|$)",
            rf"\1{kind}",
            value,
            count=1,
        )
    return re.sub(r"-(\d+)-gr-\1gr(?=-|$)", r"-\1-gr", value, count=1)


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.select(
            products.c.id,
            products.c.slug,
            products.c.product_kind,
            products.c.extra_attributes,
        )
    ).mappings().all()
    used = {row["slug"] for row in rows}
    for row in rows:
        old_slug = row["slug"]
        new_slug = normalized_slug(old_slug, row["product_kind"])
        if new_slug == old_slug or new_slug in used:
            continue
        attributes = dict(row["extra_attributes"] or {})
        attributes.setdefault(PREVIOUS_SLUG_KEY, old_slug)
        bind.execute(
            sa.update(products)
            .where(products.c.id == row["id"])
            .values(slug=new_slug, extra_attributes=attributes)
        )
        used.remove(old_slug)
        used.add(new_slug)


def downgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.select(products.c.id, products.c.slug, products.c.extra_attributes)
    ).mappings().all()
    used = {row["slug"] for row in rows}
    for row in rows:
        attributes = dict(row["extra_attributes"] or {})
        previous = attributes.pop(PREVIOUS_SLUG_KEY, None)
        if not isinstance(previous, str) or not previous or previous in used:
            continue
        bind.execute(
            sa.update(products)
            .where(products.c.id == row["id"])
            .values(slug=previous, extra_attributes=attributes)
        )
        used.remove(row["slug"])
        used.add(previous)
