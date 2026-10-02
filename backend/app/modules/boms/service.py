import uuid
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.boms.models import Bom, BomItem
from app.modules.boms.schemas import (
    BomCreate,
    BomItemCreate,
    BomItemUpdate,
    BomListItem,
    BomUpdate,
)
from app.modules.products.models import SKU


def bom_reference(bom_id: UUID) -> str:
    return f"BOM-{datetime.now(UTC):%Y%m%d}-{bom_id.hex[:8].upper()}"


def bom_item_from_payload(
    bom_id: UUID, payload: BomItemCreate, *, default_position: int
) -> BomItem:
    values = payload.model_dump()
    if "position" not in payload.model_fields_set:
        values["position"] = default_position
    return BomItem(bom_id=bom_id, **values)


async def validate_sku(session: AsyncSession, sku_id: UUID | None) -> None:
    if sku_id is None:
        return
    if await session.scalar(select(SKU.id).where(SKU.id == sku_id)) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="SKU not found"
        )


async def get_bom(session: AsyncSession, bom_id: UUID) -> Bom:
    result = await session.execute(
        select(Bom)
        .where(Bom.id == bom_id)
        .options(selectinload(Bom.items))
        .execution_options(populate_existing=True)
    )
    bom = result.scalar_one_or_none()
    if bom is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BOM not found")
    return bom


async def get_bom_item(session: AsyncSession, bom_id: UUID, item_id: UUID) -> tuple[Bom, BomItem]:
    bom = await get_bom(session, bom_id)
    item = next((candidate for candidate in bom.items if candidate.id == item_id), None)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BOM item not found")
    return bom, item


async def create_bom(session: AsyncSession, payload: BomCreate) -> Bom:
    for item in payload.items:
        await validate_sku(session, item.sku_id)
    bom_id = uuid.uuid4()
    values = payload.model_dump(exclude={"items"})
    bom = Bom(id=bom_id, reference=bom_reference(bom_id), **values)
    bom.items = [
        bom_item_from_payload(bom_id, item, default_position=index)
        for index, item in enumerate(payload.items)
    ]
    session.add(bom)
    await session.commit()
    return await get_bom(session, bom_id)


async def list_boms(
    session: AsyncSession,
    *,
    bom_status: str | None,
    search: str | None,
    limit: int,
    offset: int,
) -> tuple[list[BomListItem], int]:
    filters = []
    if bom_status:
        filters.append(Bom.status == bom_status)
    if search:
        pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                Bom.reference.ilike(pattern),
                Bom.customer_name.ilike(pattern),
                Bom.contact.ilike(pattern),
            )
        )

    count = await session.scalar(select(func.count(Bom.id)).where(*filters)) or 0
    result = await session.execute(
        select(Bom)
        .where(*filters)
        .options(selectinload(Bom.items))
        .order_by(Bom.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = list(result.scalars().unique())
    return [
        BomListItem(
            id=bom.id,
            reference=bom.reference,
            customer_name=bom.customer_name,
            contact_method=bom.contact_method,
            contact=bom.contact,
            status=bom.status,
            profile_name=bom.profile_name,
            item_count=len(bom.items),
            known_total_rub=sum(
                ((item.unit_price_rub or Decimal(0)) * item.quantity for item in bom.items),
                Decimal(0),
            ),
            created_at=bom.created_at,
            updated_at=bom.updated_at,
        )
        for bom in rows
    ], count


async def update_bom(session: AsyncSession, bom_id: UUID, payload: BomUpdate) -> Bom:
    bom = await get_bom(session, bom_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(bom, field, value)
    await session.commit()
    return await get_bom(session, bom_id)


async def delete_bom(session: AsyncSession, bom_id: UUID) -> None:
    bom = await get_bom(session, bom_id)
    await session.delete(bom)
    await session.commit()


async def create_bom_item(session: AsyncSession, bom_id: UUID, payload: BomItemCreate) -> Bom:
    bom = await get_bom(session, bom_id)
    await validate_sku(session, payload.sku_id)
    next_position = max((item.position for item in bom.items), default=-1) + 1
    session.add(bom_item_from_payload(bom.id, payload, default_position=next_position))
    bom.updated_at = datetime.now(UTC)
    await session.commit()
    return await get_bom(session, bom_id)


async def update_bom_item(
    session: AsyncSession,
    bom_id: UUID,
    item_id: UUID,
    payload: BomItemUpdate,
) -> Bom:
    bom, item = await get_bom_item(session, bom_id, item_id)
    values = payload.model_dump(exclude_unset=True)
    if "sku_id" in values:
        await validate_sku(session, values["sku_id"])
    for field, value in values.items():
        setattr(item, field, value)
    bom.updated_at = datetime.now(UTC)
    await session.commit()
    return await get_bom(session, bom_id)


async def delete_bom_item(session: AsyncSession, bom_id: UUID, item_id: UUID) -> Bom:
    bom, item = await get_bom_item(session, bom_id, item_id)
    await session.delete(item)
    bom.updated_at = datetime.now(UTC)
    await session.commit()
    return await get_bom(session, bom_id)
