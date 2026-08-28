from fastapi import APIRouter

from app.modules.admin.router import router as admin_router
from app.modules.boms.router import router as boms_router
from app.modules.catalog.router import router as catalog_router
from app.modules.compatibility.router import router as compatibility_router
from app.modules.leads.customer_router import router as customers_router
from app.modules.leads.router import router as leads_router
from app.modules.products.router import router as products_router

api_router = APIRouter()


@api_router.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(boms_router, prefix="/admin/boms", tags=["admin-boms"])
api_router.include_router(catalog_router, prefix="/catalog", tags=["catalog"])
api_router.include_router(compatibility_router, prefix="/compatibility", tags=["compatibility"])
api_router.include_router(leads_router, prefix="/leads", tags=["leads"])
api_router.include_router(customers_router, prefix="/admin/customers", tags=["admin-customers"])
api_router.include_router(products_router, prefix="/products", tags=["products"])
