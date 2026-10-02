# ruff: noqa: B008

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.boms.dependencies import require_bom_admin
from app.modules.boms.models import Bom
from app.modules.boms.schemas import (
    BomCreate,
    BomItemCreate,
    BomItemUpdate,
    BomListResponse,
    BomRead,
    BomStatus,
    BomUpdate,
)
from app.modules.boms.service import (
    create_bom,
    create_bom_item,
    delete_bom,
    delete_bom_item,
    get_bom,
    list_boms,
    update_bom,
    update_bom_item,
)

router = APIRouter(dependencies=[Depends(require_bom_admin)])


@router.post("", response_model=BomRead, status_code=status.HTTP_201_CREATED)
async def create_admin_bom(payload: BomCreate, session: AsyncSession = Depends(get_db)) -> Bom:
    return await create_bom(session, payload)


@router.get("", response_model=BomListResponse)
async def read_admin_boms(
    bom_status: BomStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, min_length=1, max_length=160),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
) -> BomListResponse:
    items, total = await list_boms(
        session,
        bom_status=bom_status,
        search=search,
        limit=limit,
        offset=offset,
    )
    return BomListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{bom_id}", response_model=BomRead)
async def read_admin_bom(bom_id: UUID, session: AsyncSession = Depends(get_db)) -> Bom:
    return await get_bom(session, bom_id)


@router.patch("/{bom_id}", response_model=BomRead)
async def update_admin_bom(
    bom_id: UUID, payload: BomUpdate, session: AsyncSession = Depends(get_db)
) -> Bom:
    return await update_bom(session, bom_id, payload)


@router.delete("/{bom_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_bom(bom_id: UUID, session: AsyncSession = Depends(get_db)) -> Response:
    await delete_bom(session, bom_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{bom_id}/items", response_model=BomRead, status_code=status.HTTP_201_CREATED)
async def create_admin_bom_item(
    bom_id: UUID,
    payload: BomItemCreate,
    session: AsyncSession = Depends(get_db),
) -> Bom:
    return await create_bom_item(session, bom_id, payload)


@router.patch("/{bom_id}/items/{item_id}", response_model=BomRead)
async def update_admin_bom_item(
    bom_id: UUID,
    item_id: UUID,
    payload: BomItemUpdate,
    session: AsyncSession = Depends(get_db),
) -> Bom:
    return await update_bom_item(session, bom_id, item_id, payload)


@router.delete("/{bom_id}/items/{item_id}", response_model=BomRead)
async def delete_admin_bom_item(
    bom_id: UUID,
    item_id: UUID,
    session: AsyncSession = Depends(get_db),
) -> Bom:
    return await delete_bom_item(session, bom_id, item_id)
