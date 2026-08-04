import argparse
import asyncio
import re
import unicodedata
from collections import Counter, defaultdict
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.catalog_item_rules import normalized_price_item_name
from app.db.session import AsyncSessionLocal
from app.modules.catalog.models import Category  # noqa: F401
from app.modules.products.models import Product, SKU

ONE_WALL_PREFIXES = {
    "труба": "Одноконтурная",
    "ревизия": "Одноконтурная",
    "заглушка": "Одноконтурная",
}


def slugify(value: str, max_len: int = 180) -> str:
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
    value = unicodedata.normalize("NFKD", value.lower())
    value = "".join(translit.get(ch, ch) for ch in value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value[:max_len].strip("-") or "item"


def raw_item_name(product: Product) -> str:
    value = product.extra_attributes.get("raw_item_name") or product.extra_attributes.get(
        "logical_item_name"
    )
    source_name = str(value).strip() if value else product.name
    return normalized_price_item_name(source_name, product.contour)


def logical_item_name(value: str) -> str:
    value = re.sub(r"L\s*=\s*\d+\s*мм\b", "", value, flags=re.IGNORECASE)
    value = re.sub(r"(\d+)\s*градусов", r"\1 гр", value, flags=re.IGNORECASE)
    value = re.sub(r"\bØ?\s*\d+(?:\s*/\s*\d+)?\s*мм?\b", "", value, flags=re.IGNORECASE)
    return " ".join(value.replace("ё", "е").split()).strip(" ,-") or value.strip()


def normalized_product_kind(product: Product) -> str:
    text = raw_item_name(product).lower().replace("ё", "е")
    if "конденсат" in text:
        return "конденсатоотвод"
    return product.product_kind or "unknown_kind"


def angle_deg(value: str, attrs: dict[str, Any]) -> int | None:
    attr_value = attrs.get("angle_deg")
    if isinstance(attr_value, int):
        return attr_value
    match = re.search(r"(\d+)\s*(?:гр|°)", value, re.IGNORECASE)
    return int(match.group(1)) if match else None


def int_attr(attrs: dict[str, Any], key: str) -> int | None:
    value = attrs.get(key)
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


def insulation_mm_from_attrs(attrs: dict[str, Any], product_attrs: dict[str, Any]) -> int | None:
    direct = int_attr(attrs, "insulation_mm") or int_attr(product_attrs, "insulation_mm")
    if direct is not None:
        return direct

    for key in ("source_section", "insulation_material"):
        value = attrs.get(key) or product_attrs.get(key)
        if not value:
            continue
        match = re.search(r"толщина\s*([0-9]+)\s*мм", str(value), re.IGNORECASE)
        if match:
            return int(match.group(1))
    return None


def source_text(attrs: dict[str, Any], product_attrs: dict[str, Any]) -> str:
    parts = [
        str(attrs.get("source_section") or ""),
        str(product_attrs.get("source_section") or ""),
        str(attrs.get("raw_item_name") or ""),
        str(product_attrs.get("raw_item_name") or ""),
    ]
    return " / ".join(part for part in parts if part)


def material_from_attrs(attrs: dict[str, Any], product_attrs: dict[str, Any]) -> str | None:
    text = source_text(attrs, product_attrs).upper()
    if "AISI" in text or "НЕРЖ" in text:
        return "нержавеющая сталь"
    if "ОЦИНК" in text:
        return "оцинковка"
    return None


def steel_grade_from_attrs(attrs: dict[str, Any], product_attrs: dict[str, Any]) -> str | None:
    match = re.search(r"AISI\s*([0-9]{3}[A-Z]?)", source_text(attrs, product_attrs), re.IGNORECASE)
    return f"AISI {match.group(1).upper()}" if match else None


def wall_thickness_from_attrs(attrs: dict[str, Any], product_attrs: dict[str, Any]) -> Decimal | None:
    direct = decimal_attr(attrs.get("wall_thickness_mm")) or decimal_attr(product_attrs.get("wall_thickness_mm"))
    if direct is not None:
        return direct
    match = re.search(
        r"толщина\s*([0-9]+(?:[,.][0-9]+)?)\s*мм",
        source_text(attrs, product_attrs),
        re.IGNORECASE,
    )
    if not match:
        return None
    value = Decimal(match.group(1).replace(",", "."))
    return value if value <= Decimal("5") else None


def logical_key(product: Product) -> tuple[str, str, str, int | None]:
    name = raw_item_name(product)
    angle = angle_deg(name, product.extra_attributes)
    kind = normalized_product_kind(product)
    return (
        product.contour or "unknown_contour",
        kind,
        logical_item_name(name).lower(),
        angle if kind == "отвод" else None,
    )


def logical_name(product: Product) -> str:
    base_name = re.sub(
        r"(\d+)\s*гр(?:адусов)?",
        r"\1°",
        logical_item_name(raw_item_name(product)),
        flags=re.IGNORECASE,
    )
    base_lower = base_name[:1].lower() + base_name[1:]
    if product.contour == "сэндвич":
        return f"Сэндвич-{base_lower}".strip()[:220]

    kind = normalized_product_kind(product)
    prefix = ONE_WALL_PREFIXES.get(kind, "Одноконтурный")
    return f"{prefix} {base_lower}".strip()[:220]


def logical_slug(product: Product) -> str:
    contour = product.contour or "catalog"
    kind = normalized_product_kind(product)
    parts = [contour, kind, logical_item_name(raw_item_name(product))]
    angle = angle_deg(raw_item_name(product), product.extra_attributes)
    if kind == "отвод" and angle is not None:
        parts.append(f"{angle}gr")
    return slugify("-".join(parts), max_len=220)


def decimal_attr(value: Any) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except Exception:
        return None


def variant_slug(product: Product, sku: SKU, used_slugs: set[str]) -> str:
    attrs = sku.attributes or {}
    diameter_mm = sku.diameter_mm or int_attr(attrs, "diameter_mm") or product.diameter_mm
    outer_diameter_mm = (
        sku.outer_diameter_mm
        or int_attr(attrs, "outer_diameter_mm")
        or int_attr(product.extra_attributes, "outer_diameter_mm")
    )
    length_mm = sku.length_mm or int_attr(attrs, "length_mm") or int_attr(product.extra_attributes, "length_mm")
    angle = sku.angle_deg or int_attr(attrs, "angle_deg") or angle_deg(raw_item_name(product), attrs)
    steel_grade = sku.steel_grade or product.steel_grade
    material = sku.material or product.material
    wall_thickness_mm = sku.wall_thickness_mm or product.wall_thickness_mm
    insulation_mm = sku.insulation_mm or product.insulation_mm

    parts: list[str] = []
    if diameter_mm is not None:
        parts.append(f"d{diameter_mm}")
    if outer_diameter_mm is not None:
        parts.append(str(outer_diameter_mm))
    if length_mm is not None:
        parts.append(f"l{length_mm}")
    if angle is not None:
        parts.append(f"a{angle}")
    if steel_grade:
        parts.append(steel_grade.replace(" ", "").lower())
    elif material:
        parts.append(slugify(material, max_len=32))
    if wall_thickness_mm is not None:
        parts.append(f"t{str(wall_thickness_mm).replace('.', '')}")
    if insulation_mm is not None:
        parts.append(f"ins{insulation_mm}")

    base_slug = slugify("-".join(parts) or sku.article, max_len=220)
    candidate = base_slug
    if candidate in used_slugs:
        candidate = slugify(f"{base_slug}-{sku.article}", max_len=220)
    suffix = 2
    while candidate in used_slugs:
        candidate = slugify(f"{base_slug}-{suffix}", max_len=220)
        suffix += 1
    used_slugs.add(candidate)
    return candidate


def populate_sku_variant_fields(product: Product, sku: SKU, used_slugs: set[str]) -> None:
    attrs = sku.attributes or {}
    product_attrs = product.extra_attributes or {}

    if sku.slug and sku.slug not in used_slugs:
        used_slugs.add(sku.slug)
    else:
        sku.slug = variant_slug(product, sku, used_slugs)
    sku.material = sku.material or product.material or attrs.get("material") or material_from_attrs(attrs, product_attrs)
    sku.steel_grade = (
        sku.steel_grade or product.steel_grade or attrs.get("steel_grade") or steel_grade_from_attrs(attrs, product_attrs)
    )
    sku.wall_thickness_mm = sku.wall_thickness_mm or product.wall_thickness_mm
    sku.diameter_mm = sku.diameter_mm or int_attr(attrs, "diameter_mm") or product.diameter_mm
    sku.outer_diameter_mm = (
        sku.outer_diameter_mm or int_attr(attrs, "outer_diameter_mm") or int_attr(product_attrs, "outer_diameter_mm")
    )
    sku.contour = sku.contour or product.contour or attrs.get("contour")
    sku.insulation_mm = sku.insulation_mm or product.insulation_mm or insulation_mm_from_attrs(attrs, product_attrs)
    sku.length_mm = sku.length_mm or int_attr(attrs, "length_mm") or int_attr(product_attrs, "length_mm")
    sku.angle_deg = sku.angle_deg or int_attr(attrs, "angle_deg") or angle_deg(raw_item_name(product), attrs)

    if sku.wall_thickness_mm is None:
        sku.wall_thickness_mm = wall_thickness_from_attrs(attrs, product_attrs)

    sku.attributes = {
        **attrs,
        "diameter_mm": sku.diameter_mm,
        "outer_diameter_mm": sku.outer_diameter_mm,
        "length_mm": sku.length_mm,
        "angle_deg": sku.angle_deg,
        "material": sku.material,
        "steel_grade": sku.steel_grade,
        "wall_thickness_mm": str(sku.wall_thickness_mm) if sku.wall_thickness_mm is not None else None,
        "contour": sku.contour,
        "insulation_mm": sku.insulation_mm,
    }


async def unique_product_slug(session: AsyncSession, base_slug: str, product: Product) -> str:
    candidate = base_slug
    suffix = 2
    while True:
        existing = await session.scalar(select(Product).where(Product.slug == candidate, Product.id != product.id))
        if existing is None:
            return candidate
        candidate = slugify(f"{base_slug}-{suffix}", max_len=220)
        suffix += 1


async def group_products_into_variants(*, dry_run: bool = False) -> dict[str, Any]:
    stats: Counter[str] = Counter()

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Product)
            .where(
                Product.is_active.is_(True),
                Product.product_kind.is_not(None),
                Product.contour.is_not(None),
            )
            .options(selectinload(Product.skus))
            .order_by(Product.created_at.asc(), Product.slug.asc())
        )
        products = list(result.scalars())

        groups: dict[tuple[str, str, str, int | None], list[Product]] = defaultdict(list)
        for product in products:
            groups[logical_key(product)].append(product)

        stats["active_products_seen"] = len(products)
        stats["logical_groups"] = len(groups)

        for group_products in groups.values():
            canonical = group_products[0]
            base_slug = logical_slug(canonical)
            canonical.slug = await unique_product_slug(session, base_slug, canonical)
            canonical.name = logical_name(canonical)
            canonical.product_kind = normalized_product_kind(canonical)
            canonical.short_description = f"{canonical.name}. Варианты по диаметру, стали, длине и цене."
            canonical.material = None
            canonical.wall_thickness_mm = None
            canonical.diameter_mm = None
            canonical.steel_grade = None
            canonical.insulation_mm = None
            canonical.extra_attributes = {
                **(canonical.extra_attributes or {}),
                "variant_model": "logical_product",
                "legacy_product_count": len(group_products),
                "legacy_product_slugs_sample": [product.slug for product in group_products[:50]],
            }

            used_variant_slugs: set[str] = set()
            for product in group_products:
                for sku in product.skus:
                    populate_sku_variant_fields(product, sku, used_variant_slugs)
                    if sku.product_id != canonical.id:
                        sku.product_id = canonical.id
                        stats["skus_reassigned"] += 1
                    stats["skus_touched"] += 1

                if product.id != canonical.id:
                    product.is_active = False
                    product.extra_attributes = {
                        **(product.extra_attributes or {}),
                        "merged_into_product_id": str(canonical.id),
                        "merged_into_product_slug": canonical.slug,
                        "variant_model": "merged_legacy_product",
                    }
                    stats["products_deactivated"] += 1

            stats["logical_products_touched"] += 1

        if dry_run:
            await session.rollback()
        else:
            await session.commit()

    stats["dry_run"] = int(dry_run)
    return dict(stats)


async def main() -> None:
    parser = argparse.ArgumentParser(description="Group legacy Product rows into logical Products with SKU variants.")
    parser.add_argument("--dry-run", action="store_true", help="Compute changes and rollback.")
    args = parser.parse_args()

    result = await group_products_into_variants(dry_run=args.dry_run)
    for key in sorted(result):
        print(f"{key}: {result[key]}")


if __name__ == "__main__":
    asyncio.run(main())
