
from fastapi import APIRouter, Depends, Query, Response

from app.core.config import settings
from app.modules.boms.dependencies import require_bom_admin
from app.modules.leads.customers import list_customers

router = APIRouter(dependencies=[Depends(require_bom_admin)])


@router.get("")
async def read_customers(
    response: Response,
    q: str | None = Query(default=None, max_length=160),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> dict[str, object]:
    customers = list_customers(settings.media_storage_dir, q)
    response.headers["Cache-Control"] = "no-store"
    return {
        "items": customers[offset : offset + limit],
        "total": len(customers),
        "limit": limit,
        "offset": offset,
    }
