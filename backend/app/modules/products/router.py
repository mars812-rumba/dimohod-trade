from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.products.schemas import ProductRead
from app.modules.products.service import get_product_by_slug

router = APIRouter()


@router.get("/{slug}", response_model=ProductRead)
async def read_product(slug: str, session: AsyncSession = Depends(get_db)) -> ProductRead:
    product = await get_product_by_slug(session, slug)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    return ProductRead.model_validate(product)

