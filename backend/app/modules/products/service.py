from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_, case, exists, func, or_, select
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
    if (
        "одностен" in normalized
        or "одноконтур" in normalized
        or "single" in normalized
    ):
        return "single"
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
    """Match a fastener to the outside diameter of a sandwich source."""
    fastener_diameter = fastener_sku.outer_diameter_mm or fastener_sku.diameter_mm
    source_contour = contour_group(getattr(source_sku, "contour", None))
    connection_diameter = (
        source_sku.outer_diameter_mm
        if source_contour == "sandwich"
        else source_sku.diameter_mm
    )
    if connection_diameter is None or fastener_diameter != connection_diameter:
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


def manually_selected_product_matches(source_sku: SKU, target_sku: SKU) -> bool:
    """Match a concrete SKU inside a family explicitly selected by an editor.

    The family allowlist is an editorial decision. This matcher only narrows that
    family to variants whose populated connection fields agree with the source;
    it does not infer compatibility from a product name or an absent value.
    """
    source_diameter = source_sku.diameter_mm
    target_diameter = target_sku.diameter_mm
    if source_diameter is None or target_diameter is None or source_diameter != target_diameter:
        return False

    comparable_fields = (
        (source_sku.outer_diameter_mm, target_sku.outer_diameter_mm),
        (source_sku.insulation_mm, target_sku.insulation_mm),
    )
    if any(
        left is not None and right is not None and left != right
        for left, right in comparable_fields
    ):
        return False

    source_material = material_group(source_sku.material)
    target_material = material_group(target_sku.material)
    if source_material and target_material and source_material != target_material:
        return False

    source_steel = source_sku.steel_grade.casefold().strip() if source_sku.steel_grade else None
    target_steel = target_sku.steel_grade.casefold().strip() if target_sku.steel_grade else None
    if source_steel and target_steel and source_steel != target_steel:
        return False

    source_contour = contour_group(source_sku.contour)
    target_contour = contour_group(target_sku.contour)
    if source_contour and target_contour and source_contour != target_contour:
        return False
    return True


def compatible_product_matches(source_sku: SKU, target_product: Product, target_sku: SKU) -> bool:
    if target_product.product_kind == "труба":
        return compatible_tube_matches(source_sku, target_sku)
    if target_product.product_kind == "крепеж":
        return compatible_fastener_matches(source_sku, target_sku)
    return manually_selected_product_matches(source_sku, target_sku)


def compatibility_filter_expression(source_sku: SKU):
    expressions = []
    tube_signature = compatible_tube_signature(source_sku)
    if tube_signature is not None:
        diameter, outer_diameter, insulation, steel_grade, material, _contour = tube_signature
        expressions.append(
            and_(
                Product.product_kind == "труба",
                SKU.diameter_mm == diameter,
                SKU.outer_diameter_mm == outer_diameter,
                SKU.insulation_mm == insulation,
                func.lower(func.trim(SKU.steel_grade)) == steel_grade,
                material_filter_expression(material),
                or_(
                    SKU.contour.ilike("%сэндвич%"),
                    SKU.contour.ilike("%сендвич%"),
                    SKU.contour.ilike("%sandwich%"),
                ),
            )
        )

    source_contour = contour_group(getattr(source_sku, "contour", None))
    fastener_diameter = (
        source_sku.outer_diameter_mm
        if source_contour == "sandwich"
        else source_sku.diameter_mm
    )
    if fastener_diameter is not None:
        fastener_conditions = [
            Product.product_kind == "крепеж",
            func.coalesce(SKU.outer_diameter_mm, SKU.diameter_mm) == fastener_diameter,
        ]
        source_material = material_group(source_sku.material)
        if source_material:
            fastener_conditions.append(
                or_(SKU.material.is_(None), material_filter_expression(source_material))
            )
        if source_sku.steel_grade:
            fastener_conditions.append(
                or_(
                    SKU.steel_grade.is_(None),
                    func.lower(func.trim(SKU.steel_grade))
                    == source_sku.steel_grade.casefold().strip(),
                )
            )
        expressions.append(and_(*fastener_conditions))

    return or_(*expressions) if expressions else None


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

    if allowed_product_ids is not None:
        result = await session.execute(
            select(SKU, Product)
            .join(Product, SKU.product_id == Product.id)
            .where(
                Product.is_active.is_(True),
                Product.id.in_(allowed_product_ids),
                Product.id != exclude_product_id,
                SKU.is_active.is_(True),
            )
            .order_by(Product.name.asc(), SKU.length_mm.asc().nulls_last(), SKU.article.asc())
        )
        return [
            (sku, product)
            for sku, product in result.all()
            if any(
                compatible_product_matches(source_sku, product, sku)
                for source_sku in active_source_skus
            )
        ]

    matching_expressions = [
        expression
        for sku in active_source_skus
        if (expression := compatibility_filter_expression(sku)) is not None
    ]
    if not matching_expressions:
        return []

    result = await session.execute(
        select(SKU, Product)
        .join(Product, SKU.product_id == Product.id)
        .where(
            Product.is_active.is_(True),
            Product.product_kind == "труба",
            Product.id != exclude_product_id,
            SKU.is_active.is_(True),
            or_(*matching_expressions),
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
    length_mm: int | None = None,
    wall_thickness_mm: Decimal | None = None,
    angle_deg: int | None = None,
    insulation_mm: int | None = None,
    contour: str | None = None,
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
    if length_mm is not None:
        sku_filters.append(SKU.length_mm == length_mm)
    if wall_thickness_mm is not None:
        sku_filters.append(SKU.wall_thickness_mm == wall_thickness_mm)
    if angle_deg is not None:
        sku_filters.append(SKU.angle_deg == angle_deg)
    if insulation_mm is not None:
        sku_filters.append(SKU.insulation_mm == insulation_mm)
    if contour:
        sku_filters.append(func.lower(func.trim(SKU.contour)) == contour.casefold().strip())
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
            SKU.length_mm,
            SKU.wall_thickness_mm,
            SKU.angle_deg,
            SKU.insulation_mm,
            SKU.contour,
        )
        .join(Product, SKU.product_id == Product.id)
        .join(Category, Product.category_id == Category.id)
        .where(*filters)
    )

    diameter_products: dict[str, set[object]] = {}
    steel_products: dict[str, set[object]] = {}
    material_products: dict[str, set[object]] = {}
    length_products: dict[str, set[object]] = {}
    thickness_products: dict[str, set[object]] = {}
    angle_products: dict[str, set[object]] = {}
    insulation_products: dict[str, set[object]] = {}
    contour_products: dict[str, set[object]] = {}
    for (
        product_id,
        diameter,
        outer_diameter,
        steel,
        raw_material,
        length,
        thickness,
        angle,
        insulation,
        contour,
    ) in result.all():
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
        if length is not None:
            length_products.setdefault(str(length), set()).add(product_id)
        if thickness is not None:
            thickness_products.setdefault(format(thickness, "f"), set()).add(product_id)
        if angle is not None:
            angle_products.setdefault(str(angle), set()).add(product_id)
        if insulation is not None:
            insulation_products.setdefault(str(insulation), set()).add(product_id)
        if contour:
            contour_products.setdefault(str(contour).strip(), set()).add(product_id)

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
    def numeric_options(values: dict[str, set[object]], suffix: str) -> list[tuple[str, str, int]]:
        return [
            (value, f"{value}{suffix}", len(product_ids))
            for value, product_ids in sorted(values.items(), key=lambda item: Decimal(item[0]))
        ]

    contours = sorted(
        [(value, value.capitalize(), len(product_ids)) for value, product_ids in contour_products.items()],
        key=lambda item: item[1],
    )
    return {
        "diameters": diameters,
        "steel_grades": steels,
        "materials": materials,
        "lengths": numeric_options(length_products, " мм"),
        "wall_thicknesses": numeric_options(thickness_products, " мм"),
        "angles": numeric_options(angle_products, "°"),
        "insulations": numeric_options(insulation_products, " мм"),
        "contours": contours,
    }


async def get_product_by_slug(session: AsyncSession, slug: str) -> Product | None:
    result = await session.execute(
        select(Product)
        .where(Product.slug == slug, Product.is_active.is_(True))
        .options(joinedload(Product.category), selectinload(Product.skus))
    )
    return result.scalar_one_or_none()


async def get_product_sku_by_key(
    session: AsyncSession,
    *,
    product_slug: str,
    sku_key: str,
) -> tuple[Product, SKU] | None:
    """Load one active SKU directly, without hydrating the whole product family."""
    identifiers = [SKU.slug == sku_key, SKU.article == sku_key]
    try:
        identifiers.append(SKU.id == UUID(sku_key))
    except ValueError:
        pass

    result = await session.execute(
        select(Product, SKU)
        .join(SKU, SKU.product_id == Product.id)
        .where(
            Product.slug == product_slug,
            Product.is_active.is_(True),
            SKU.is_active.is_(True),
            or_(*identifiers),
        )
        .limit(1)
    )
    return result.one_or_none()
