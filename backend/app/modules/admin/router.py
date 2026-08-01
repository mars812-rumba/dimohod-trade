from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.admin.schemas import (
    AdminCategoryRead,
    AdminPhotoUpload,
    AdminProductListResponse,
    AdminProductRead,
    AdminSKUCreate,
    AdminSKUListResponse,
    AdminSKURead,
    AdminSKUUpdate,
)
from app.modules.admin.service import (
    attach_product_photo,
    attach_product_photo_content,
    create_sku,
    deactivate_sku,
    delete_product_photo,
    get_admin_product,
    list_admin_categories,
    list_admin_products,
    list_admin_skus,
    product_to_admin_read,
    update_sku,
)

router = APIRouter()


@router.get("/categories", response_model=list[AdminCategoryRead])
async def read_admin_categories(session: AsyncSession = Depends(get_db)) -> list[AdminCategoryRead]:
    rows = await list_admin_categories(session)
    return [
        AdminCategoryRead(
            id=category.id,
            parent_id=category.parent_id,
            name=category.name,
            slug=category.slug,
            product_count=count,
            media_count=len(category.extra_attributes.get("media", []))
            if isinstance(category.extra_attributes.get("media"), list)
            else 0,
            extra_attributes=category.extra_attributes,
        )
        for category, count in rows
    ]


@router.get("/products", response_model=AdminProductListResponse)
async def read_admin_products(
    category_id: UUID | None = Query(default=None),
    limit: int = Query(default=48, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
) -> AdminProductListResponse:
    items, total = await list_admin_products(session, category_id=category_id, limit=limit, offset=offset)
    return AdminProductListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/skus", response_model=AdminSKUListResponse)
async def read_admin_skus(
    category_id: UUID | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None, min_length=1, max_length=120),
    session: AsyncSession = Depends(get_db),
) -> AdminSKUListResponse:
    items, total = await list_admin_skus(
        session,
        category_id=category_id,
        limit=limit,
        offset=offset,
        search=search,
    )
    return AdminSKUListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/products/{product_id}", response_model=AdminProductRead)
async def read_admin_product(product_id: UUID, session: AsyncSession = Depends(get_db)) -> AdminProductRead:
    product = await get_admin_product(session, product_id)
    return product_to_admin_read(product)


@router.post("/products/{product_id}/skus", response_model=AdminSKURead, status_code=201)
async def create_admin_sku(
    product_id: UUID,
    payload: AdminSKUCreate,
    session: AsyncSession = Depends(get_db),
) -> AdminSKURead:
    return await create_sku(session, product_id, payload)


@router.patch("/skus/{sku_id}", response_model=AdminSKURead)
async def update_admin_sku(
    sku_id: UUID,
    payload: AdminSKUUpdate,
    session: AsyncSession = Depends(get_db),
) -> AdminSKURead:
    return await update_sku(session, sku_id, payload)


@router.delete("/skus/{sku_id}", response_model=AdminSKURead)
async def delete_admin_sku(sku_id: UUID, session: AsyncSession = Depends(get_db)) -> AdminSKURead:
    return await deactivate_sku(session, sku_id)


@router.post("/products/{product_id}/photos", response_model=AdminProductRead, status_code=201)
async def upload_admin_product_photo(
    product_id: UUID,
    payload: AdminPhotoUpload,
    session: AsyncSession = Depends(get_db),
) -> AdminProductRead:
    return await attach_product_photo(session, product_id, payload)


@router.post("/products/{product_id}/photos/upload", response_model=AdminProductRead, status_code=201)
async def upload_admin_product_photo_file(
    product_id: UUID,
    request: Request,
    session: AsyncSession = Depends(get_db),
) -> AdminProductRead:
    try:
        form = await request.form()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Photo upload requires python-multipart in the backend image",
        ) from exc

    file = form.get("file")
    if file is None or not hasattr(file, "read"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Photo file is required")

    file_name = getattr(file, "filename", None) or "photo.jpg"
    content = await file.read()
    alt = form.get("alt")
    role = form.get("role")
    return await attach_product_photo_content(
        session,
        product_id,
        file_name=file_name,
        content=content,
        alt=alt if isinstance(alt, str) else None,
        role=role if isinstance(role, str) else None,
    )


@router.delete("/products/{product_id}/photos/{photo_index}", response_model=AdminProductRead)
async def delete_admin_product_photo(
    product_id: UUID,
    photo_index: int,
    session: AsyncSession = Depends(get_db),
) -> AdminProductRead:
    return await delete_product_photo(session, product_id, photo_index)
