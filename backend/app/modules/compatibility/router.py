from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.compatibility.schemas import (
    CompatibilityCheckRequest,
    CompatibilityCheckResponse,
    CompatibilityRuleRead,
)
from app.modules.compatibility.service import (
    context_from_request,
    evaluate_rules,
    get_sku_context,
    list_active_rules,
)

router = APIRouter()


@router.get("/rules", response_model=list[CompatibilityRuleRead])
async def read_compatibility_rules(session: AsyncSession = Depends(get_db)) -> list[CompatibilityRuleRead]:
    return [CompatibilityRuleRead.model_validate(rule) for rule in await list_active_rules(session)]


@router.post("/check", response_model=CompatibilityCheckResponse)
async def check_compatibility(
    request: CompatibilityCheckRequest,
    session: AsyncSession = Depends(get_db),
) -> CompatibilityCheckResponse:
    context = context_from_request(request)

    if request.sku_id is not None:
        sku_context = await get_sku_context(session, request.sku_id)
        if sku_context is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU not found")
        context = {**sku_context, **{key: value for key, value in context.items() if value is not None}}

    rules = await list_active_rules(session)
    return CompatibilityCheckResponse(messages=evaluate_rules(rules, context))
