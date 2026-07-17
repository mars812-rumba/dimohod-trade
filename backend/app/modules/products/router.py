from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.products.schemas import ProductListItem, ProductListResponse, ProductRead
from app.modules.products.service import get_product_by_slug, list_products

router = APIRouter()


@router.get("", response_model=ProductListResponse)
async def read_products(
    limit: int = Query(default=48, ge=1, le=96),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
) -> ProductListResponse:
    products, total = await list_products(session, limit=limit, offset=offset)
    items: list[ProductListItem] = []

    for product in products:
        prices = [sku.price_rub for sku in product.skus if sku.price_rub is not None]
        price_rub: Decimal | None = min(prices) if prices else None
        items.append(
            ProductListItem(
                id=product.id,
                category=product.category,
                name=product.name,
                slug=product.slug,
                material=product.material,
                steel_grade=product.steel_grade,
                wall_thickness_mm=product.wall_thickness_mm,
                diameter_mm=product.diameter_mm,
                contour=product.contour,
                insulation_mm=product.insulation_mm,
                product_kind=product.product_kind,
                price_rub=price_rub,
                sku_count=len(product.skus),
            )
        )

    return ProductListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{slug}", response_model=ProductRead)
async def read_product(slug: str, session: AsyncSession = Depends(get_db)) -> ProductRead:
    product = await get_product_by_slug(session, slug)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    return ProductRead.model_validate(product)
