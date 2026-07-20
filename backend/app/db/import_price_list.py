import argparse
import asyncio
import json
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.modules.catalog.models import Category
from app.modules.products.models import NeedsReview, Product, SKU


SOURCE_NAME = "Дымоход Трейд price_list.json"
BRAND = "Дымоход Трейд"
DEFAULT_SHEET = "голые"

CATEGORY_META: dict[str, tuple[str, str]] = {
    "труба": ("odnokonturnye-truby", "Одноконтурные трубы"),
    "отвод": ("odnokonturnye-otvody", "Одноконтурные отводы"),
    "тройник": ("odnokonturnye-troyniki", "Одноконтурные тройники"),
    "четверник": ("odnokonturnye-chetverniki", "Одноконтурные четверники"),
    "шибер": ("shibery", "Шиберы"),
    "ревизия": ("revizii", "Ревизии и прочистки"),
    "конденсатоотвод": ("kondensatootvody", "Конденсатоотводы"),
    "заглушка": ("zaglushki", "Заглушки"),
    "крепеж": ("homuty-i-krepezh", "Хомуты и крепеж"),
    "оголовок": ("ogolovki-i-deflektory", "Оголовки и дефлекторы"),
}


@dataclass(frozen=True)
class SectionSpec:
    title: str
    material: str | None
    steel_grade: str | None
    wall_thickness_mm: Decimal | None
    contour: str
    insulation_mm: int | None = None
    insulation_material: str | None = None
    outer_material: str | None = None
    outer_steel_grade: str | None = None
    outer_wall_thickness_mm: Decimal | None = None


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


def parse_diameter(raw: str) -> tuple[int | None, int | None]:
    nums = [int(x) for x in re.findall(r"\d+", str(raw))]
    if not nums:
        return None, None
    if "/" in str(raw) and len(nums) >= 2:
        return nums[0], nums[1]
    return nums[0], None


def parse_material_part(value: str) -> tuple[str | None, str | None, Decimal | None]:
    title_compact = " ".join(value.split())
    steel_grade = None
    steel_match = re.search(r"AISI\s*([0-9]{3}[A-Z]?)", title_compact, re.IGNORECASE)
    if steel_match:
        steel_grade = f"AISI {steel_match.group(1).upper()}"

    wall_thickness_mm = None
    thickness_match = re.search(r"толщина\s*([0-9]+(?:[,.][0-9]+)?)\s*мм?", title_compact, re.IGNORECASE)
    if thickness_match:
        wall_thickness_mm = Decimal(thickness_match.group(1).replace(",", "."))

    title_upper = title_compact.upper()
    if "НЕРЖ" in title_upper or steel_grade:
        material = "нержавеющая сталь"
    elif "ОЦИНК" in title_upper:
        material = "оцинковка"
    else:
        material = None

    return material, steel_grade, wall_thickness_mm


def parse_section(titles: list[str]) -> SectionSpec:
    clean_titles = [str(t).strip() for t in titles if str(t).strip()]
    title = " / ".join(clean_titles)

    inner_title = next((t for t in clean_titles if "внутрен" in t.lower()), title)
    outer_title = next((t for t in clean_titles if "наруж" in t.lower()), None)
    insulation_title = next((t for t in clean_titles if "изоляц" in t.lower()), None)

    material, steel_grade, wall_thickness_mm = parse_material_part(inner_title)
    outer_material = outer_steel_grade = None
    outer_wall_thickness_mm = None
    if outer_title is not None:
        outer_material, outer_steel_grade, outer_wall_thickness_mm = parse_material_part(outer_title)

    insulation_mm = None
    insulation_material = None
    if insulation_title is not None:
        insulation_match = re.search(r"толщина\s*([0-9]+)\s*мм", insulation_title, re.IGNORECASE)
        if insulation_match:
            insulation_mm = int(insulation_match.group(1))
        insulation_material = insulation_title.split("—", 1)[-1].strip() if "—" in insulation_title else insulation_title

    return SectionSpec(
        title=title,
        material=material,
        steel_grade=steel_grade,
        wall_thickness_mm=wall_thickness_mm,
        contour="сэндвич" if outer_title or insulation_title else "одностенный",
        insulation_mm=insulation_mm,
        insulation_material=insulation_material,
        outer_material=outer_material,
        outer_steel_grade=outer_steel_grade,
        outer_wall_thickness_mm=outer_wall_thickness_mm,
    )


def product_kind(name: str) -> str | None:
    text = name.lower().replace("ё", "е")
    if "труба" in text:
        return "труба"
    if "отвод" in text:
        return "отвод"
    if "тройник" in text:
        return "тройник"
    if "четверник" in text:
        return "четверник"
    if "зонт" in text or "дефлектор" in text or "оголовок" in text:
        return "оголовок"
    if "шибер" in text:
        return "шибер"
    if "прочист" in text or "ревиз" in text:
        return "ревизия"
    if "конденсат" in text:
        return "конденсатоотвод"
    if "заглуш" in text:
        return "заглушка"
    if "хомут" in text:
        return "крепеж"
    if "фланц" in text or "проход" in text:
        return "проходной_узел"
    return None


def parse_length_mm(name: str) -> int | None:
    match = re.search(r"L\s*=\s*(\d+)\s*мм", name, re.IGNORECASE)
    return int(match.group(1)) if match else None


def parse_angle_deg(name: str) -> int | None:
    match = re.search(r"(\d+)\s*гр", name, re.IGNORECASE)
    return int(match.group(1)) if match else None


def price_to_decimal(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    return Decimal(str(value)).quantize(Decimal("0.01"))


async def get_or_create_category(
    session: AsyncSession,
    slug: str,
    name: str,
    *,
    parent_id: Any = None,
    sort_order: int = 0,
) -> tuple[Category, bool]:
    category = await session.scalar(select(Category).where(Category.slug == slug))
    if category:
        changed = False
        if parent_id is not None and category.parent_id is None:
            category.parent_id = parent_id
            changed = True
        if category.name != name:
            category.name = name
            changed = True
        return category, changed

    category = Category(
        parent_id=parent_id,
        name=name,
        slug=slug,
        description=None,
        sort_order=sort_order,
    )
    session.add(category)
    await session.flush()
    return category, True


async def log_review(
    session: AsyncSession,
    *,
    source_file: str,
    source_sheet: str,
    source_section: str,
    source_row_key: str,
    field_name: str,
    raw_value: str | None,
    reason: str,
) -> None:
    session.add(
        NeedsReview(
            source_file=source_file,
            source_sheet=source_sheet,
            source_section=source_section,
            source_row_key=source_row_key,
            field_name=field_name,
            raw_value=raw_value,
            reason=reason,
        )
    )


def product_name(
    item_name: str,
    diameter_mm: int,
    outer_diameter_mm: int | None,
    section: SectionSpec,
) -> str:
    diameter_label = f"Ø{diameter_mm}/{outer_diameter_mm}" if outer_diameter_mm else f"Ø{diameter_mm}"
    parts = [item_name.strip(), diameter_label]
    if section.steel_grade:
        parts.append(section.steel_grade)
    elif section.material:
        parts.append(section.material)
    if section.wall_thickness_mm is not None:
        parts.append(f"{section.wall_thickness_mm} мм")
    if section.contour == "сэндвич" and section.insulation_mm is not None:
        parts.append(f"изоляция {section.insulation_mm} мм")
    return ", ".join(parts)[:220]


def root_category_meta(section: SectionSpec) -> tuple[str, str, int]:
    if section.contour == "сэндвич":
        return "sendvich-elementy", "Сэндвич-элементы", 40
    return "odnokonturnye-elementy", "Одноконтурные элементы", 30


def category_meta(section: SectionSpec) -> dict[str, tuple[str, str]]:
    if section.contour == "сэндвич":
        return {
            "труба": ("sendvich-truby", "Сэндвич-трубы"),
            "отвод": ("sendvich-otvody", "Сэндвич-отводы"),
            "тройник": ("sendvich-troyniki", "Сэндвич-тройники"),
            "четверник": ("sendvich-chetverniki", "Сэндвич-четверники"),
            "шибер": ("sendvich-shibery", "Сэндвич-шиберы"),
            "ревизия": ("sendvich-revizii", "Сэндвич-ревизии"),
            "конденсатоотвод": ("sendvich-kondensatootvody", "Сэндвич-конденсатоотводы"),
            "заглушка": ("sendvich-zaglushki", "Сэндвич-заглушки"),
            "крепеж": ("sendvich-krepezh", "Сэндвич-крепеж"),
            "оголовок": ("sendvich-ogolovki-i-deflektory", "Сэндвич-оголовки и дефлекторы"),
        }
    return CATEGORY_META


def import_code(sheet_name: str, section: SectionSpec) -> str:
    if section.contour == "сэндвич":
        return f"SW{section.insulation_mm or 0}"
    if sheet_name == "голые":
        return "GOLYE"
    return slugify(sheet_name, max_len=24).upper()


def product_slug_source(
    sheet_name: str,
    block_index: int,
    item_index: int,
    item_name: str,
    diameter_mm: int,
    outer_diameter_mm: int | None,
    section: SectionSpec,
) -> str:
    if section.contour == "сэндвич":
        return (
            f"sendvich-{section.insulation_mm or 0}-{block_index}-{item_index}-"
            f"{item_name}-d{diameter_mm}-{outer_diameter_mm or 0}"
        )
    return f"{sheet_name}-{block_index}-{item_index}-{item_name}-d{diameter_mm}"


async def import_price_list(path: Path, sheet_name: str) -> dict[str, Any]:
    source_file = str(path)
    source_name = f"Дымоход Трейд {path.name}"
    data = json.loads(path.read_text(encoding="utf-8"))
    blocks = data.get(sheet_name)
    if not isinstance(blocks, list):
        raise ValueError(f"Sheet {sheet_name!r} not found or has invalid structure")

    stats: Counter[str] = Counter()
    kind_stats: Counter[str] = Counter()
    diameter_stats: Counter[int] = Counter()
    review_stats: Counter[str] = Counter()

    async with AsyncSessionLocal() as session:
        await session.execute(
            delete(NeedsReview).where(
                NeedsReview.source_file == source_file,
                NeedsReview.source_sheet == sheet_name,
            )
        )

        categories: dict[str, Category] = {}

        for block_index, block in enumerate(blocks):
            if not ("items" in block and "columns" in block):
                continue

            section = parse_section(block.get("titles") or [])
            stats["sections"] += 1
            stats[f"sections_{section.contour}"] += 1

            root_slug, root_name, root_sort_order = root_category_meta(section)
            root, root_touched = await get_or_create_category(
                session,
                root_slug,
                root_name,
                sort_order=root_sort_order,
            )
            if root_touched:
                stats["categories_touched"] += 1

            for idx, (kind, (slug, name)) in enumerate(category_meta(section).items(), start=1):
                if slug in categories:
                    continue
                category, touched = await get_or_create_category(
                    session,
                    slug,
                    name,
                    parent_id=root.id,
                    sort_order=idx * 10,
                )
                categories[slug] = category
                if touched:
                    stats["categories_touched"] += 1

            for item_index, item in enumerate(block.get("items") or []):
                item_name = str(item.get("name") or "").strip()
                if not item_name:
                    continue

                kind = product_kind(item_name)
                if kind is None:
                    review_stats["category"] += 1
                    await log_review(
                        session,
                        source_file=source_file,
                        source_sheet=sheet_name,
                        source_section=section.title,
                        source_row_key=f"block:{block_index}:item:{item_index}",
                        field_name="product_kind",
                        raw_value=item_name,
                        reason="Не удалось однозначно определить категорию товара по названию",
                    )
                    continue

                meta = category_meta(section).get(kind)
                category = categories.get(meta[0]) if meta else None
                if category is None:
                    review_stats["category"] += 1
                    await log_review(
                        session,
                        source_file=source_file,
                        source_sheet=sheet_name,
                        source_section=section.title,
                        source_row_key=f"block:{block_index}:item:{item_index}",
                        field_name="product_kind",
                        raw_value=item_name,
                        reason=f"Нет категории назначения для product_kind={kind}",
                    )
                    continue

                kind_stats[kind] += 1
                length_mm = parse_length_mm(item_name)
                angle_deg = parse_angle_deg(item_name)

                for raw_diameter, raw_price in (item.get("prices") or {}).items():
                    price = price_to_decimal(raw_price)
                    if price is None:
                        continue

                    diameter_mm, outer_diameter_mm = parse_diameter(raw_diameter)
                    row_key = f"block:{block_index}:item:{item_index}:diameter:{raw_diameter}"
                    if diameter_mm is None:
                        review_stats["diameter"] += 1
                        await log_review(
                            session,
                            source_file=source_file,
                            source_sheet=sheet_name,
                            source_section=section.title,
                            source_row_key=row_key,
                            field_name="diameter_mm",
                            raw_value=str(raw_diameter),
                            reason="Не удалось распарсить диаметр в миллиметрах",
                        )
                        continue

                    diameter_stats[diameter_mm] += 1
                    stats["price_rows_seen"] += 1

                    code = import_code(sheet_name, section)
                    article_suffix = f"D{diameter_mm}-{outer_diameter_mm}" if outer_diameter_mm else f"D{diameter_mm}"
                    article = f"DT-{code}-{block_index:02d}-{item_index:02d}-{article_suffix}"
                    slug = slugify(
                        product_slug_source(
                            sheet_name,
                            block_index,
                            item_index,
                            item_name,
                            diameter_mm,
                            outer_diameter_mm,
                            section,
                        ),
                        max_len=220,
                    )
                    name = product_name(item_name, diameter_mm, outer_diameter_mm, section)
                    extra_attributes = {
                        "source_file": source_file,
                        "source_sheet": sheet_name,
                        "source_section": section.title,
                        "source_block_index": block_index,
                        "source_item_index": item_index,
                        "raw_item_name": item_name,
                        "raw_diameter": raw_diameter,
                        "length_mm": length_mm,
                        "angle_deg": angle_deg,
                        "outer_diameter_mm": outer_diameter_mm,
                        "outer_material": section.outer_material,
                        "outer_steel_grade": section.outer_steel_grade,
                        "outer_wall_thickness_mm": (
                            str(section.outer_wall_thickness_mm)
                            if section.outer_wall_thickness_mm is not None
                            else None
                        ),
                        "insulation_material": section.insulation_material,
                    }

                    product = await session.scalar(select(Product).where(Product.slug == slug))
                    if product is None:
                        product = Product(
                            category_id=category.id,
                            name=name,
                            slug=slug,
                            short_description=f"{name}. Позиция из прайс-листа Дымоход Трейд.",
                            description=None,
                            brand=BRAND,
                            material=section.material,
                            wall_thickness_mm=section.wall_thickness_mm,
                            diameter_mm=diameter_mm,
                            steel_grade=section.steel_grade,
                            contour=section.contour,
                            insulation_mm=section.insulation_mm,
                            max_temperature_c=None,
                            product_kind=kind,
                            purpose=[],
                            extra_attributes=extra_attributes,
                            source_name=source_name,
                            application_tags=[],
                            compatibility_notes=None,
                        )
                        session.add(product)
                        await session.flush()
                        stats["products_created"] += 1
                    else:
                        product.category_id = category.id
                        product.name = name
                        product.short_description = f"{name}. Позиция из прайс-листа Дымоход Трейд."
                        product.brand = BRAND
                        product.material = section.material
                        product.wall_thickness_mm = section.wall_thickness_mm
                        product.diameter_mm = diameter_mm
                        product.steel_grade = section.steel_grade
                        product.contour = section.contour
                        product.insulation_mm = section.insulation_mm
                        product.product_kind = kind
                        product.purpose = []
                        product.extra_attributes = extra_attributes
                        product.source_name = source_name
                        stats["products_updated"] += 1

                    sku = await session.scalar(select(SKU).where(SKU.article == article))
                    sku_attributes = {
                        "diameter_mm": diameter_mm,
                        "outer_diameter_mm": outer_diameter_mm,
                        "length_mm": length_mm,
                        "angle_deg": angle_deg,
                        "source_sheet": sheet_name,
                        "source_section": section.title,
                        "raw_item_name": item_name,
                        "raw_diameter": raw_diameter,
                    }
                    if sku is None:
                        sku = SKU(
                            product_id=product.id,
                            article=article,
                            name=name,
                            price_rub=price,
                            stock_status="unknown",
                            attributes=sku_attributes,
                        )
                        session.add(sku)
                        stats["skus_created"] += 1
                    else:
                        sku.product_id = product.id
                        sku.name = name
                        sku.price_rub = price
                        sku.attributes = sku_attributes
                        stats["skus_updated"] += 1

        await session.commit()

    return {
        "source_file": source_file,
        "sheet": sheet_name,
        "stats": dict(stats),
        "product_kinds": dict(kind_stats),
        "diameters": sorted(diameter_stats),
        "needs_review": dict(review_stats),
    }


async def main() -> None:
    parser = argparse.ArgumentParser(description="Import Dimohod Trade JSON price list into catalog tables.")
    parser.add_argument("path", type=Path, help="Path to price_list.json")
    parser.add_argument("--sheet", default=DEFAULT_SHEET, help="Sheet name to import")
    args = parser.parse_args()

    result = await import_price_list(args.path, args.sheet)
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    asyncio.run(main())
