# ruff: noqa: B008
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.boms.dependencies import require_bom_admin
from app.modules.ready_kits.schemas import KitUpdate
from app.modules.ready_kits.service import admin_kits, public_kits, save_kit

router = APIRouter()
admin_router = APIRouter(dependencies=[Depends(require_bom_admin)])


@router.get("")
async def list_public_kits(response: Response, session: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    return {"items": await public_kits(session)}


@router.get("/{slug}")
async def read_public_kit(slug: str, response: Response, session: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    kits = await public_kits(session)
    kit = next((k for k in kits if k["slug"] == slug), None)
    if kit is None:
        raise HTTPException(404, "Опубликованный комплект не найден")
    return {"kit": kit, "variants": kits}


@admin_router.get("")
async def list_admin_kits(response: Response, session: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    return {"items": await admin_kits(session)}


@admin_router.put("/{slug}")
async def update_admin_kit(slug: str, payload: KitUpdate, response: Response,
                           session: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    return await save_kit(session, slug, payload)
