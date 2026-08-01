from uuid import UUID

from sqlalchemy import case, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.modules.catalog.models import Category
from app.modules.products.models import Product, SKU

COMPATIBLE_PRODUCT_IDS_KEY = "compatible_product_ids"


def normalized_compatible_product_ids(extra_attributes: dict | None) -> list[UUID] | None:
    attributes = extra_attributes or {}
    if COMPATIBLE_PRODUCT_IDS_KEY not in attributes:
        return None
    raw_ids = attributes.get(COMPATIBLE_PRODUCT_IDS_KEY)
    if not isinstance(raw_ids, list):
        return []
    result: list[UUID] = []
    for value in raw_ids:
        try:
            product_id = UUID(str(value))
        except (TypeError, ValueError):
            continue
        if product_id not in result:
            result.append(product_id)
    return result


def material_group(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.lower()
    if "нерж" in normalized or "stainless" in normalized:
        return "stainless"
    if "оцинк" in normalized or "galvan" in normalized:
        return "galvanized"
    return normalized.strip()


def material_filter_expression(value: str):
    if value == "stainless":
        return or_(SKU.material.ilike("%нерж%"), SKU.material.ilike("%stainless%"))
    if value == "galvanized":
        return or_(SKU.material.ilike("%оцинк%"), SKU.material.ilike("%galvan%"))
    return func.lower(SKU.material) == value.lower()


def contour_group(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.lower().strip()
    if "сэндвич" in normalized or "сендвич" in normalized or "sandwich" in normalized:
        return "sandwich"
    return normalized


def compatible_tube_signature(sku: SKU) -> tuple[int, int, int, str, str, str] | None:
    material = material_group(sku.material)
    contour = contour_group(sku.contour)
    if (
        sku.diameter_mm is None
        or sku.outer_diameter_mm is None
        or sku.insulation_mm is None
        or not sku.steel_grade
        or not material
        or contour != "sandwich"
    ):
        return None
    return (
        sku.diameter_mm,
        sku.outer_diameter_mm,
        sku.insulation_mm,
        sku.steel_grade.casefold().strip(),
        material,
        contour,
    )


def compatible_tube_matches(source_sku: SKU, tube_sku: SKU) -> bool:
    source_signature = compatible_tube_signature(source_sku)
    return source_signature is not None and source_signature == compatible_tube_signature(tube_sku)


def compatible_fastener_matches(source_sku: SKU, fastener_sku: SKU) -> bool:
    """Match a clamp/fastener to the outside of a sandwich element."""
    source_outer_diameter = source_sku.outer_diameter_mm
    fastener_diameter = fastener_sku.outer_diameter_mm or fastener_sku.diameter_mm
    if source_outer_diameter is None or fastener_diameter != source_outer_diameter:
        return False

    source_material = material_group(source_sku.material)
    fastener_material = material_group(fastener_sku.material)
    if source_material and fastener_material and source_material != fastener_material:
        return False

    source_steel = source_sku.steel_grade.casefold().strip() if source_sku.steel_grade else None
    fastener_steel = fastener_sku.steel_grade.casefold().strip() if fastener_sku.steel_grade else None
    if source_steel and fastener_steel and source_steel != fastener_steel:
        return False
    return True


def compatible_product_matches(source_sku: SKU, target_product: Product, target_sku: SKU) -> bool:
    if target_product.product_kind == "труба":
        return compatible_tube_matches(source_sku, target_sku)
    if target_product.product_kind == "крепеж":
        return compatible_fastener_matches(source_sku, target_sku)
    return False


async def list_compatible_product_skus(
    session: AsyncSession,
    source_skus: list[SKU],
    *,
    exclude_product_id: UUID,
    allowed_product_ids: list[UUID] | None = None,
) -> list[tuple[SKU, Product]]:
    active_source_skus = [sku for sku in source_skus if sku.is_active]
    if not active_source_skus:
        return []

    if allowed_product_ids == []:
        return []

    product_filters = (
        [Product.id.in_(allowed_product_ids)]
        if allowed_product_ids is not None
        else [Product.product_kind == "труба"]
    )

    result = await session.execute(
        select(SKU, Product)
        .join(Product, SKU.product_id == Product.id)
        .where(
            Product.is_active.is_(True),
            *product_filters,
            Product.id != exclude_product_id,
            SKU.is_active.is_(True),
        )
        .order_by(Product.name.asc(), SKU.length_mm.asc().nulls_last(), SKU.article.asc())
    )
    return [
        (sku, product)
        for sku, product in result.all()
        if any(compatible_product_matches(source_sku, product, sku) for source_sku in active_source_skus)
    ]


async def list_compatible_tube_skus(
    session: AsyncSession,
    source_skus: list[SKU],
    *,
    exclude_product_id: UUID,
    allowed_product_ids: list[UUID] | None = None,
) -> list[tuple[SKU, Product]]:
    """Backward-compatible alias for callers outside the product endpoint."""
    return await list_compatible_product_skus(
        session,
        source_skus,
        exclude_product_id=exclude_product_id,
        allowed_product_ids=allowed_product_ids,
    )


async def list_products(
    session: AsyncSession,
    *,
    limit: int = 48,
    offset: int = 0,
    product_kind: str | None = None,
    category_slug: str | None = None,
    search: str | None = None,
    diameter_mm: int | None = None,
    outer_diameter_mm: int | None = None,
    steel_grade: str | None = None,
    material: str | None = None,
) -> tuple[list[Product], int]:
    kind_order = case(
        (Product.product_kind == "труба", 10),
        (Product.product_kind == "отвод", 20),
        (Product.product_kind == "тройник", 30),
        (Product.product_kind == "четверник", 40),
        (Product.product_kind == "шибер", 50),
        (Product.product_kind == "ревизия", 60),
        (Product.product_kind == "конденсатоотвод", 70),
        (Product.product_kind == "заглушка", 80),
        (Product.product_kind == "крепеж", 90),
        (Product.product_kind == "проходной_узел", 100),
        (Product.product_kind == "оголовок", 110),
        else_=999,
    )
    filters = [Product.is_active.is_(True)]
    if product_kind:
        filters.append(Product.product_kind == product_kind)
    if category_slug:
        filters.append(Product.category.has(Category.slug == category_slug))
    if search:
        filters.append(Product.name.ilike(f"%{search.strip()}%"))

    sku_filters = [SKU.product_id == Product.id, SKU.is_active.is_(True)]
    if diameter_mm is not None:
        sku_filters.append(SKU.diameter_mm == diameter_mm)
    if outer_diameter_mm is not None:
        sku_filters.append(SKU.outer_diameter_mm == outer_diameter_mm)
    if steel_grade:
        sku_filters.append(SKU.steel_grade == steel_grade)
    if material:
        sku_filters.append(material_filter_expression(material))
    if len(sku_filters) > 2:
        filters.append(exists(select(SKU.id).where(*sku_filters)))

    total = await session.scalar(select(func.count(Product.id)).where(*filters))
    result = await session.execute(
        select(Product)
        .where(*filters)
        .options(joinedload(Product.category), selectinload(Product.skus))
        .order_by(
            kind_order,
            Product.diameter_mm.asc(),
            Product.name.asc(),
        )
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars()), int(total or 0)


async def list_product_kind_filters(session: AsyncSession) -> list[tuple[str, int]]:
    result = await session.execute(
        select(Product.product_kind, func.count(Product.id))
        .where(Product.is_active.is_(True), Product.product_kind.is_not(None))
        .group_by(Product.product_kind)
        .order_by(func.count(Product.id).desc(), Product.product_kind.asc())
    )
    return [(str(kind), int(count)) for kind, count in result.all() if kind]


async def list_variant_filter_options(
    session: AsyncSession,
    *,
    category_slug: str | None = None,
) -> dict[str, list[tuple[str, str, int]]]:
    filters = [Product.is_active.is_(True), SKU.is_active.is_(True)]
    if category_slug:
        filters.append(Category.slug == category_slug)
    result = await session.execute(
        select(
            SKU.product_id,
            SKU.diameter_mm,
            SKU.outer_diameter_mm,
            SKU.steel_grade,
            SKU.material,
        )
        .join(Product, SKU.product_id == Product.id)
        .join(Category, Product.category_id == Category.id)
        .where(*filters)
    )

    diameter_products: dict[str, set[object]] = {}
    steel_products: dict[str, set[object]] = {}
    material_products: dict[str, set[object]] = {}
    for product_id, diameter, outer_diameter, steel, raw_material in result.all():
        if diameter is not None or outer_diameter is not None:
            value = f"{diameter or ''}:{outer_diameter or ''}"
            label = (
                f"{diameter}/{outer_diameter} мм"
                if diameter is not None and outer_diameter is not None and diameter != outer_diameter
                else f"{diameter if diameter is not None else outer_diameter} мм"
            )
            diameter_products.setdefault(f"{value}|{label}", set()).add(product_id)
        if steel:
            steel_products.setdefault(str(steel), set()).add(product_id)
        grouped_material = material_group(raw_material)
        if grouped_material:
            material_products.setdefault(grouped_material, set()).add(product_id)

    diameters = sorted(
        [
            (key.split("|", 1)[0], key.split("|", 1)[1], len(product_ids))
            for key, product_ids in diameter_products.items()
        ],
        key=lambda item: tuple(int(value or 0) for value in item[0].split(":")),
    )
    steels = sorted(
        [(value, value, len(product_ids)) for value, product_ids in steel_products.items()],
        key=lambda item: item[1],
    )
    material_labels = {"stainless": "Нержавейка", "galvanized": "Оцинковка"}
    materials = sorted(
        [
            (value, material_labels.get(value, value), len(product_ids))
            for value, product_ids in material_products.items()
        ],
        key=lambda item: item[1],
    )
    return {"diameters": diameters, "steel_grades": steels, "materials": materials}


async def get_product_by_slug(session: AsyncSession, slug: str) -> Product | None:
    result = await session.execute(
        select(Product)
        .where(Product.slug == slug, Product.is_active.is_(True))
        .options(joinedload(Product.category), selectinload(Product.skus))
    )
    return result.scalar_one_or_none()
