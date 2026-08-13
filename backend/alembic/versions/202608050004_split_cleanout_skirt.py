"""Split the shared cleanout/skirt price row into two sellable families.

Revision ID: 202608050004
Revises: 202608050003
Create Date: 2026-08-05
"""

from collections.abc import Sequence
import re
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import Connection


revision: str = "202608050004"
down_revision: str | None = "202608050003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SEED_NAMESPACE = uuid.UUID("6a1f1105-acde-48bd-a845-aab8ed8ff5d4")

categories = sa.table(
    "categories",
    sa.column("id", sa.Uuid()),
    sa.column("slug", sa.String()),
)
products = sa.table(
    "products",
    sa.column("id", sa.Uuid()),
    sa.column("category_id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("slug", sa.String()),
    sa.column("short_description", sa.String()),
    sa.column("description", sa.Text()),
    sa.column("brand", sa.String()),
    sa.column("material", sa.String()),
    sa.column("wall_thickness_mm", sa.Numeric()),
    sa.column("diameter_mm", sa.Integer()),
    sa.column("steel_grade", sa.String()),
    sa.column("contour", sa.String()),
    sa.column("insulation_mm", sa.Integer()),
    sa.column("max_temperature_c", sa.Integer()),
    sa.column("product_kind", sa.String()),
    sa.column("purpose", postgresql.JSONB()),
    sa.column("extra_attributes", postgresql.JSONB()),
    sa.column("source_name", sa.String()),
    sa.column("application_tags", sa.JSON()),
    sa.column("compatibility_notes", sa.Text()),
    sa.column("is_active", sa.Boolean()),
)
skus = sa.table(
    "skus",
    sa.column("id", sa.Uuid()),
    sa.column("product_id", sa.Uuid()),
    sa.column("article", sa.String()),
    sa.column("name", sa.String()),
    sa.column("slug", sa.String()),
    sa.column("material", sa.String()),
    sa.column("steel_grade", sa.String()),
    sa.column("wall_thickness_mm", sa.Numeric()),
    sa.column("diameter_mm", sa.Integer()),
    sa.column("outer_diameter_mm", sa.Integer()),
    sa.column("contour", sa.String()),
    sa.column("insulation_mm", sa.Integer()),
    sa.column("length_mm", sa.Integer()),
    sa.column("angle_deg", sa.Integer()),
    sa.column("price_rub", sa.Numeric()),
    sa.column("stock_status", sa.String()),
    sa.column("attributes", sa.JSON()),
    sa.column("is_active", sa.Boolean()),
)


def combined_price_family(name: str, attributes: dict | None) -> bool:
    values = attributes or {}
    candidates = (
        name,
        str(values.get("logical_item_name") or ""),
        str(values.get("source_price_item_name") or ""),
    )
    return any("прочистка/юбка" in value.casefold().replace("ё", "е") for value in candidates)


def split_article(article: str, code: str) -> str:
    base_article = article.replace("-CLEANOUT-", "-").replace("-SKIRT-", "-")
    return re.sub(r"(-D\d+(?:-\d+)?)$", rf"-{code}\1", base_article, count=1)


def split_sku_name(name: str, public_name: str) -> str:
    return re.sub(r"прочистка\s*/\s*юбка", public_name, name, count=1, flags=re.IGNORECASE)


def marked_attributes(attributes: dict | None, public_name: str) -> dict:
    values = dict(attributes or {})
    values.update(
        {
            "raw_item_name": "Прочистка/юбка",
            "catalog_item_name": public_name,
            "owner_confirmed_price_row_split": True,
        }
    )
    return values


def upgrade() -> None:
    bind = op.get_bind()
    revision_category_id = bind.execute(
        sa.select(categories.c.id).where(categories.c.slug == "revizii")
    ).scalar_one_or_none()
    wall_passage_category_id = bind.execute(
        sa.select(categories.c.id).where(
            categories.c.slug == "uzly-prohoda-sten-i-perekrytiy"
        )
    ).scalar_one_or_none()
    if revision_category_id is None or wall_passage_category_id is None:
        raise RuntimeError("Required cleanout or wall-passage category is missing")

    candidates = bind.execute(
        sa.select(products).where(
            products.c.is_active.is_(True),
            products.c.product_kind == "ревизия",
        )
    ).mappings().all()
    source = next(
        (
            row
            for row in candidates
            if combined_price_family(row["name"], row["extra_attributes"])
        ),
        None,
    )
    if source is None:
        return

    cleanout_id = source["id"]
    skirt_id = uuid.uuid5(SEED_NAMESPACE, "product:dekorativnaya-yubka")
    source_attributes = dict(source["extra_attributes"] or {})
    common_attributes = {
        **source_attributes,
        "source_price_item_name": "Прочистка/юбка",
        "owner_confirmed_price_row_split": True,
    }

    bind.execute(
        sa.update(products)
        .where(products.c.id == cleanout_id)
        .values(
            category_id=revision_category_id,
            name="Прочистка",
            slug="odnostennyy-reviziya-prochistka",
            short_description=None,
            product_kind="ревизия",
            extra_attributes={**common_attributes, "logical_item_name": "Прочистка"},
        )
    )

    skirt_values = {
        key: source[key]
        for key in (
            "description",
            "brand",
            "material",
            "wall_thickness_mm",
            "diameter_mm",
            "steel_grade",
            "contour",
            "insulation_mm",
            "max_temperature_c",
            "purpose",
            "source_name",
            "compatibility_notes",
        )
    }
    skirt_values.update(
        {
            "id": skirt_id,
            "category_id": wall_passage_category_id,
            "name": "Декоративная юбка",
            "slug": "dekorativnaya-yubka",
            "short_description": None,
            "product_kind": "декоративная_юбка",
            "extra_attributes": {
                **common_attributes,
                "logical_item_name": "Декоративная юбка",
            },
            "application_tags": [],
            "is_active": True,
        }
    )
    bind.execute(postgresql.insert(products).values(**skirt_values))

    source_skus = bind.execute(
        sa.select(skus).where(skus.c.product_id == cleanout_id)
    ).mappings().all()
    for source_sku in source_skus:
        original_article = source_sku["article"]
        cleanout_article = split_article(original_article, "CLEANOUT")
        skirt_article = split_article(original_article, "SKIRT")
        bind.execute(
            sa.update(skus)
            .where(skus.c.id == source_sku["id"])
            .values(
                article=cleanout_article,
                name=split_sku_name(source_sku["name"], "Прочистка"),
                attributes=marked_attributes(source_sku["attributes"], "Прочистка"),
            )
        )

        skirt_sku_id = uuid.uuid5(SEED_NAMESPACE, f"sku:{source_sku['id']}:skirt")
        skirt_sku_values = {
            key: source_sku[key]
            for key in (
                "slug",
                "material",
                "steel_grade",
                "wall_thickness_mm",
                "diameter_mm",
                "outer_diameter_mm",
                "contour",
                "insulation_mm",
                "length_mm",
                "angle_deg",
                "price_rub",
                "stock_status",
                "is_active",
            )
        }
        skirt_sku_values.update(
            {
                "id": skirt_sku_id,
                "product_id": skirt_id,
                "article": skirt_article,
                "name": split_sku_name(source_sku["name"], "Декоративная юбка"),
                "attributes": {
                    **marked_attributes(source_sku["attributes"], "Декоративная юбка"),
                    "split_from_sku_id": str(source_sku["id"]),
                },
            }
        )
        bind.execute(postgresql.insert(skus).values(**skirt_sku_values))


def downgrade() -> None:
    bind = op.get_bind()
    skirt_id = bind.execute(
        sa.select(products.c.id).where(products.c.slug == "dekorativnaya-yubka")
    ).scalar_one_or_none()
    cleanout_id = bind.execute(
        sa.select(products.c.id).where(products.c.slug == "odnostennyy-reviziya-prochistka")
    ).scalar_one_or_none()
    if cleanout_id is None:
        return
    if skirt_id is not None:
        bind.execute(sa.delete(products).where(products.c.id == skirt_id))

    cleanout_skus = bind.execute(
        sa.select(skus.c.id, skus.c.article, skus.c.name, skus.c.attributes).where(
            skus.c.product_id == cleanout_id
        )
    ).all()
    for sku_id, article, name, attributes in cleanout_skus:
        restored_attributes = dict(attributes or {})
        for key in (
            "catalog_item_name",
            "owner_confirmed_price_row_split",
        ):
            restored_attributes.pop(key, None)
        bind.execute(
            sa.update(skus)
            .where(skus.c.id == sku_id)
            .values(
                article=article.replace("-CLEANOUT-", "-"),
                name=re.sub(r"^Прочистка", "Прочистка/юбка", name),
                attributes=restored_attributes,
            )
        )

    product_attributes = bind.execute(
        sa.select(products.c.extra_attributes).where(products.c.id == cleanout_id)
    ).scalar_one()
    restored_product_attributes = dict(product_attributes or {})
    restored_product_attributes.pop("owner_confirmed_price_row_split", None)
    restored_product_attributes["logical_item_name"] = "Прочистка/юбка"
    bind.execute(
        sa.update(products)
        .where(products.c.id == cleanout_id)
        .values(
            name="Одноконтурная прочистка/юбка",
            slug="odnostennyy-reviziya-prochistka-yubka",
            extra_attributes=restored_product_attributes,
        )
    )
