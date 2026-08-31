from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.catalog_cache import (
    catalog_cache_field,
    get_catalog_cache,
    set_catalog_cache,
)
from app.db.session import get_db
from app.modules.catalog.schemas import CatalogTreeResponse
from app.modules.catalog.service import get_catalog_tree

router = APIRouter()


@router.get("/tree", response_model=CatalogTreeResponse)
async def read_catalog_tree(
    response: Response,
    session: AsyncSession = Depends(get_db),
) -> CatalogTreeResponse:
    cache_field = catalog_cache_field("tree")
    cached = await get_catalog_cache(cache_field)
    if isinstance(cached, dict):
        response.headers["X-Catalog-Cache"] = "HIT"
        return CatalogTreeResponse.model_validate(cached)

    result = CatalogTreeResponse(items=await get_catalog_tree(session))
    await set_catalog_cache(cache_field, result.model_dump(mode="json"))
    response.headers["X-Catalog-Cache"] = "MISS"
    return result
