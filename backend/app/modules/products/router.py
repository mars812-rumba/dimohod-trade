from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.compatibility.service import (
    context_from_product_sku,
    evaluate_rules,
    list_active_rules,
)
from app.modules.products.schemas import (
    CompatibleProductItem,
    ProductFiltersResponse,
    ProductFilterOption,
    ProductKindFilter,
    ProductListItem,
    ProductListResponse,
    ProductMediaItem,
    ProductRead,
)
from app.modules.products.models import Product, SKU
from app.modules.products.service import (
    compatible_product_matches,
    get_product_by_slug,
    list_compatible_product_skus,
    list_product_kind_filters,
    list_products,
    list_variant_filter_options,
    material_group,
    normalized_compatible_product_ids,
)

router = APIRouter()

PRODUCT_KIND_LABELS = {
    "труба": "Трубы",
    "отвод": "Отводы",
    "тройник": "Тройники",
    "четверник": "Четверники",
    "шибер": "Шиберы",
    "ревизия": "Ревизии",
    "конденсатоотвод": "Конденсатоотводы",
    "заглушка": "Заглушки",
    "крепеж": "Крепеж",
    "оголовок": "Оголовки",
    "проходной_узел": "Проходные узлы",
}


def primary_product_image(extra_attributes: dict[str, object] | None) -> ProductMediaItem | None:
    raw_media = (extra_attributes or {}).get("media")
    if not isinstance(raw_media, list):
        return None
    valid_media = [
        item for item in raw_media if isinstance(item, dict) and isinstance(item.get("url"), str)
    ]
    if not valid_media:
        return None
    value = next((item for item in valid_media if item.get("role") == "general"), valid_media[0])
    return ProductMediaItem(
        url=value["url"],
        alt=value.get("alt") if isinstance(value.get("alt"), str) else None,
        role=value.get("role") if isinstance(value.get("role"), str) else None,
    )


def parse_diameter_filter(value: str | None) -> tuple[int | None, int | None]:
    if not value:
        return None, None
    try:
        diameter, separator, outer_diameter = value.partition(":")
        return (
            int(diameter) if diameter else None,
            int(outer_diameter) if separator and outer_diameter else None,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid diameter filter",
        ) from exc


def sku_matches_filters(
    sku,
    *,
    diameter_mm: int | None,
    outer_diameter_mm: int | None,
    steel_grade: str | None,
    material: str | None,
) -> bool:
    return (
        sku.is_active
        and (diameter_mm is None or sku.diameter_mm == diameter_mm)
        and (outer_diameter_mm is None or sku.outer_diameter_mm == outer_diameter_mm)
        and (steel_grade is None or sku.steel_grade == steel_grade)
        and (material is None or material_group(sku.material) == material)
    )


def select_active_sku(product: Product, sku_key: str | None, *, strict: bool = False) -> SKU | None:
    active_skus = [sku for sku in product.skus if sku.is_active]
    if sku_key:
        selected = next(
            (
                sku
                for sku in active_skus
                if str(sku.id) == sku_key or sku.slug == sku_key or sku.article == sku_key
            ),
            None,
        )
        if selected is not None:
            return selected
        if strict:
            return None
    return active_skus[0] if active_skus else None


async def compatible_items_for_sku(
    session: AsyncSession,
    product: Product,
    source_sku: SKU,
) -> list[CompatibleProductItem]:
    compatible_items = await list_compatible_product_skus(
        session,
        [source_sku],
        exclude_product_id=product.id,
        allowed_product_ids=normalized_compatible_product_ids(product.extra_attributes),
    )
    return [
        CompatibleProductItem(
            source_sku_id=source_sku.id,
            product_id=target_product.id,
            product_name=target_product.name,
            product_slug=target_product.slug,
            sku_id=target_sku.id,
            sku_key=target_sku.slug or target_sku.article,
            article=target_sku.article,
            name=target_sku.name,
            length_mm=target_sku.length_mm,
            diameter_mm=target_sku.diameter_mm,
            outer_diameter_mm=target_sku.outer_diameter_mm,
            insulation_mm=target_sku.insulation_mm,
            steel_grade=target_sku.steel_grade,
            material=target_sku.material,
            price_rub=target_sku.price_rub,
            stock_status=target_sku.stock_status,
            primary_image=primary_product_image(target_product.extra_attributes),
        )
        for target_sku, target_product in compatible_items
        if compatible_product_matches(source_sku, target_product, target_sku)
    ]


@router.get("", response_model=ProductListResponse)
async def read_products(
    limit: int = Query(default=48, ge=1, le=96),
    offset: int = Query(default=0, ge=0),
    product_kind: str | None = Query(default=None, min_length=1, max_length=64),
    category: str | None = Query(default=None, min_length=1, max_length=180),
    q: str | None = Query(default=None, min_length=1, max_length=120),
    diameter: str | None = Query(default=None, pattern=r"^(?:\d+:\d*|\d*:\d+)$"),
    steel_grade: str | None = Query(default=None, min_length=1, max_length=32),
    material: str | None = Query(default=None, min_length=1, max_length=32),
    session: AsyncSession = Depends(get_db),
) -> ProductListResponse:
    diameter_mm, outer_diameter_mm = parse_diameter_filter(diameter)
    products, total = await list_products(
        session,
        limit=limit,
        offset=offset,
        product_kind=product_kind,
        category_slug=category,
        search=q,
        diameter_mm=diameter_mm,
        outer_diameter_mm=outer_diameter_mm,
        steel_grade=steel_grade,
        material=material,
    )
    items: list[ProductListItem] = []

    for product in products:
        active_skus = [
            sku
            for sku in product.skus
            if sku_matches_filters(
                sku,
                diameter_mm=diameter_mm,
                outer_diameter_mm=outer_diameter_mm,
                steel_grade=steel_grade,
                material=material,
            )
        ]
        prices = [sku.price_rub for sku in active_skus if sku.price_rub is not None]
        price_rub: Decimal | None = min(prices) if prices else None
        representative_sku = next((sku for sku in active_skus if sku.price_rub == price_rub), None)
        if representative_sku is None and active_skus:
            representative_sku = active_skus[0]
        product_outer_diameter_mm = product.extra_attributes.get("outer_diameter_mm")
        if not isinstance(product_outer_diameter_mm, int):
            product_outer_diameter_mm = None
        items.append(
            ProductListItem(
                id=product.id,
                category=product.category,
                name=product.name,
                slug=product.slug,
                material=(representative_sku.material if representative_sku else None)
                or product.material,
                steel_grade=(representative_sku.steel_grade if representative_sku else None)
                or product.steel_grade,
                wall_thickness_mm=(
                    representative_sku.wall_thickness_mm if representative_sku else None
                )
                or product.wall_thickness_mm,
                diameter_mm=(representative_sku.diameter_mm if representative_sku else None)
                or product.diameter_mm,
                outer_diameter_mm=(
                    representative_sku.outer_diameter_mm if representative_sku else None
                )
                or product_outer_diameter_mm,
                contour=product.contour,
                insulation_mm=(
                    representative_sku.insulation_mm
                    if representative_sku and representative_sku.insulation_mm is not None
                    else product.insulation_mm
                ),
                product_kind=product.product_kind,
                primary_image=primary_product_image(product.extra_attributes),
                price_rub=price_rub,
                sku_count=len(active_skus),
                selected_sku=(representative_sku.slug or representative_sku.article)
                if representative_sku
                else None,
            )
        )

    return ProductListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/filters", response_model=ProductFiltersResponse)
async def read_product_filters(
    category: str | None = Query(default=None, min_length=1, max_length=180),
    session: AsyncSession = Depends(get_db),
) -> ProductFiltersResponse:
    product_kinds = await list_product_kind_filters(session)
    variant_filters = await list_variant_filter_options(session, category_slug=category)
    return ProductFiltersResponse(
        product_kinds=[
            ProductKindFilter(
                value=value,
                label=PRODUCT_KIND_LABELS.get(value, value.capitalize()),
                count=count,
            )
            for value, count in product_kinds
        ],
        diameters=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["diameters"]
        ],
        steel_grades=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["steel_grades"]
        ],
        materials=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["materials"]
        ],
    )


@router.get("/{slug}", response_model=ProductRead)
async def read_product(
    slug: str,
    sku: str | None = Query(default=None, min_length=1, max_length=240),
    session: AsyncSession = Depends(get_db),
) -> ProductRead:
    product = await get_product_by_slug(session, slug)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product_read = ProductRead.model_validate(product)
    rules = await list_active_rules(session)
    sku_by_id = {sku.id: sku for sku in product.skus}
    product_read.skus = [
        sku_read for sku_read in product_read.skus if sku_by_id[sku_read.id].is_active
    ]

    source_sku = select_active_sku(product, sku)
    product_read.compatible_products = (
        await compatible_items_for_sku(session, product, source_sku) if source_sku else []
    )

    for sku_read in product_read.skus:
        sku = sku_by_id.get(sku_read.id)
        if sku is None:
            continue
        sku_read.compatibility_messages = evaluate_rules(
            rules, context_from_product_sku(product, sku)
        )

    return product_read


@router.get("/{slug}/compatible", response_model=list[CompatibleProductItem])
async def read_compatible_products(
    slug: str,
    sku: str = Query(min_length=1, max_length=240),
    session: AsyncSession = Depends(get_db),
) -> list[CompatibleProductItem]:
    product = await get_product_by_slug(session, slug)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    source_sku = select_active_sku(product, sku, strict=True)
    if source_sku is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU not found")
    return await compatible_items_for_sku(session, product, source_sku)
