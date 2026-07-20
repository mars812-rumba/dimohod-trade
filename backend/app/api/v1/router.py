from fastapi import APIRouter

from app.modules.catalog.router import router as catalog_router
from app.modules.compatibility.router import router as compatibility_router
from app.modules.products.router import router as products_router

api_router = APIRouter()


@api_router.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


api_router.include_router(catalog_router, prefix="/catalog", tags=["catalog"])
api_router.include_router(compatibility_router, prefix="/compatibility", tags=["compatibility"])
api_router.include_router(products_router, prefix="/products", tags=["products"])
