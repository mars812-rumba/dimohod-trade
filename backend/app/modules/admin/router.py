from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.admin.schemas import (
    AdminCategoryRead,
    AdminMediaItem,
    AdminPhotoScopeUpdate,
    AdminPhotoUpload,
    AdminProductListResponse,
    AdminProductRead,
    AdminProductUpdate,
    AdminSEOGenerateRequest,
    AdminSEOGenerateResponse,
    AdminSKUCreate,
    AdminSKUListResponse,
    AdminSKURead,
    AdminSKUUpdate,
)
from app.modules.admin.service import (
    attach_category_cover,
    attach_product_photo,
    attach_product_photo_content,
    attach_sku_photo,
    create_sku,
    deactivate_sku,
    delete_category_cover,
    delete_product_photo,
    delete_sku_photo,
    get_admin_product,
    generate_product_seo,
    list_admin_categories,
    list_admin_products,
    list_admin_skus,
    product_to_admin_read,
    update_sku,
    update_product,
    update_product_photo_scope,
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
            media_count=(1 if isinstance(category.extra_attributes.get("category_cover"), dict) else 0),
            extra_attributes=category.extra_attributes,
        )
        for category, count in rows
    ]


@router.post("/categories/{category_id}/cover", response_model=AdminMediaItem, status_code=201)
async def upload_admin_category_cover(
    category_id: UUID,
    payload: AdminPhotoUpload,
    session: AsyncSession = Depends(get_db),
) -> AdminMediaItem:
    return await attach_category_cover(session, category_id, payload)


@router.delete("/categories/{category_id}/cover", status_code=204)
async def delete_admin_category_cover(
    category_id: UUID,
    session: AsyncSession = Depends(get_db),
) -> Response:
    await delete_category_cover(session, category_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/products", response_model=AdminProductListResponse)
async def read_admin_products(
    category_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1, max_length=120),
    limit: int = Query(default=48, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
) -> AdminProductListResponse:
    items, total = await list_admin_products(
        session,
        category_id=category_id,
        search=search,
        limit=limit,
        offset=offset,
    )
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


@router.patch("/products/{product_id}", response_model=AdminProductRead)
async def update_admin_product(
    product_id: UUID,
    payload: AdminProductUpdate,
    session: AsyncSession = Depends(get_db),
) -> AdminProductRead:
    return await update_product(session, product_id, payload)


@router.post("/products/{product_id}/seo/generate", response_model=AdminSEOGenerateResponse)
async def generate_admin_product_seo(
    product_id: UUID,
    payload: AdminSEOGenerateRequest | None = None,
    session: AsyncSession = Depends(get_db),
) -> AdminSEOGenerateResponse:
    return await generate_product_seo(
        session,
        product_id,
        selected_sku_id=payload.selected_sku_id if payload else None,
        seo_knowledge=payload.seo_knowledge if payload else None,
    )


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


@router.post("/skus/{sku_id}/photo", response_model=AdminMediaItem, status_code=201)
async def upload_admin_sku_photo(
    sku_id: UUID,
    payload: AdminPhotoUpload,
    session: AsyncSession = Depends(get_db),
) -> AdminMediaItem:
    return await attach_sku_photo(session, sku_id, payload)


@router.delete("/skus/{sku_id}/photo", status_code=204)
async def delete_admin_sku_photo(
    sku_id: UUID,
    role: str | None = Query(default=None, pattern="^(general|top|connection)$"),
    session: AsyncSession = Depends(get_db),
) -> Response:
    await delete_sku_photo(session, sku_id, role=role)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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


@router.patch("/products/{product_id}/photos/{photo_key}", response_model=AdminProductRead)
async def update_admin_product_photo_scope(
    product_id: UUID,
    photo_key: str,
    payload: AdminPhotoScopeUpdate,
    session: AsyncSession = Depends(get_db),
) -> AdminProductRead:
    return await update_product_photo_scope(
        session,
        product_id,
        photo_key,
        diameter_keys=payload.diameter_keys,
        lengths_mm=payload.lengths_mm,
    )


@router.delete("/products/{product_id}/photos/{photo_key}", response_model=AdminProductRead)
async def delete_admin_product_photo(
    product_id: UUID,
    photo_key: str,
    session: AsyncSession = Depends(get_db),
) -> AdminProductRead:
    return await delete_product_photo(session, product_id, photo_key)
