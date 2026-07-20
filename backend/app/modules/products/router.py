from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.compatibility.service import context_from_product_sku, evaluate_rules, list_active_rules
from app.modules.products.schemas import (
    ProductFiltersResponse,
    ProductKindFilter,
    ProductListItem,
    ProductListResponse,
    ProductRead,
)
from app.modules.products.service import get_product_by_slug, list_product_kind_filters, list_products

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


@router.get("", response_model=ProductListResponse)
async def read_products(
    limit: int = Query(default=48, ge=1, le=96),
    offset: int = Query(default=0, ge=0),
    product_kind: str | None = Query(default=None, min_length=1, max_length=64),
    session: AsyncSession = Depends(get_db),
) -> ProductListResponse:
    products, total = await list_products(session, limit=limit, offset=offset, product_kind=product_kind)
    items: list[ProductListItem] = []

    for product in products:
        active_skus = [sku for sku in product.skus if sku.is_active]
        prices = [sku.price_rub for sku in active_skus if sku.price_rub is not None]
        price_rub: Decimal | None = min(prices) if prices else None
        representative_sku = next((sku for sku in active_skus if sku.price_rub == price_rub), None)
        if representative_sku is None and active_skus:
            representative_sku = active_skus[0]
        outer_diameter_mm = product.extra_attributes.get("outer_diameter_mm")
        if not isinstance(outer_diameter_mm, int):
            outer_diameter_mm = None
        items.append(
            ProductListItem(
                id=product.id,
                category=product.category,
                name=product.name,
                slug=product.slug,
                material=product.material or (representative_sku.material if representative_sku else None),
                steel_grade=product.steel_grade or (representative_sku.steel_grade if representative_sku else None),
                wall_thickness_mm=product.wall_thickness_mm
                or (representative_sku.wall_thickness_mm if representative_sku else None),
                diameter_mm=product.diameter_mm or (representative_sku.diameter_mm if representative_sku else None),
                outer_diameter_mm=outer_diameter_mm
                or (representative_sku.outer_diameter_mm if representative_sku else None),
                contour=product.contour,
                insulation_mm=product.insulation_mm or (representative_sku.insulation_mm if representative_sku else None),
                product_kind=product.product_kind,
                price_rub=price_rub,
                sku_count=len(active_skus),
            )
        )

    return ProductListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/filters", response_model=ProductFiltersResponse)
async def read_product_filters(session: AsyncSession = Depends(get_db)) -> ProductFiltersResponse:
    product_kinds = await list_product_kind_filters(session)
    return ProductFiltersResponse(
        product_kinds=[
            ProductKindFilter(
                value=value,
                label=PRODUCT_KIND_LABELS.get(value, value.capitalize()),
                count=count,
            )
            for value, count in product_kinds
        ]
    )


@router.get("/{slug}", response_model=ProductRead)
async def read_product(slug: str, session: AsyncSession = Depends(get_db)) -> ProductRead:
    product = await get_product_by_slug(session, slug)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product_read = ProductRead.model_validate(product)
    rules = await list_active_rules(session)
    sku_by_id = {sku.id: sku for sku in product.skus}

    for sku_read in product_read.skus:
        sku = sku_by_id.get(sku_read.id)
        if sku is None:
            continue
        sku_read.compatibility_messages = evaluate_rules(rules, context_from_product_sku(product, sku))

    return product_read
