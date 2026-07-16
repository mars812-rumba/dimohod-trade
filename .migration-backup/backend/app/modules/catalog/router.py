from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.catalog.schemas import CatalogTreeResponse
from app.modules.catalog.service import get_catalog_tree

router = APIRouter()


@router.get("/tree", response_model=CatalogTreeResponse)
async def read_catalog_tree(session: AsyncSession = Depends(get_db)) -> CatalogTreeResponse:
    return CatalogTreeResponse(items=await get_catalog_tree(session))

