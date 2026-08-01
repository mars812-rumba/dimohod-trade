import base64
import binascii
import json
import re
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.config import settings
from app.modules.admin.schemas import (
    AdminMediaItem,
    AdminPhotoUpload,
    AdminProductListItem,
    AdminProductRead,
    AdminProductUpdate,
    AdminSEOGenerateResponse,
    AdminSKUCreate,
    AdminSKUListItem,
    AdminSKUUpdate,
)
from app.modules.catalog.models import Category
from app.modules.products.models import Product, SKU

MEDIA_KEY = "media"
CATEGORY_COVER_KEY = "category_cover"
SKU_PHOTO_KEY = "sku_photo"
MAX_PHOTO_BYTES = 8 * 1024 * 1024
ALLOWED_PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".svg"}
PHOTO_ROLE_FILENAMES = {
    "general": "photo-1",
    "top": "photo-2",
    "connection": "photo-3",
    "detail": "photo-3",
}
OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
SEO_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "short_description": {"type": "string"},
        "description": {"type": "string"},
        "seo_title": {"type": "string"},
        "seo_description": {"type": "string"},
    },
    "required": ["short_description", "description", "seo_title", "seo_description"],
    "additionalProperties": False,
}


def extract_openai_output_text(payload: dict[str, Any]) -> str:
    direct = payload.get("output_text")
    if isinstance(direct, str) and direct.strip():
        return direct
    for output_item in payload.get("output", []):
        if not isinstance(output_item, dict):
            continue
        for content_item in output_item.get("content", []):
            if not isinstance(content_item, dict):
                continue
            if content_item.get("type") == "output_text" and isinstance(
                content_item.get("text"), str
            ):
                return content_item["text"]
    raise ValueError("OpenAI response does not contain output text")


def _unique_values(values: list[Any], *, limit: int = 40) -> list[Any] | dict[str, Any]:
    normalized = sorted(
        {str(value) if isinstance(value, Decimal) else value for value in values if value is not None},
        key=lambda value: str(value),
    )
    if len(normalized) <= limit:
        return normalized
    return {"first": normalized[:limit], "total_unique": len(normalized)}


def product_seo_facts(product: Product) -> dict[str, Any]:
    skus = [sku for sku in product.skus if sku.is_active]
    return {
        "family_name": product.name,
        "category": product.category.name,
        "product_kind": product.product_kind,
        "brand": product.brand,
        "purpose": product.purpose,
        "application_tags": product.application_tags,
        "compatibility_notes": product.compatibility_notes,
        "active_sku_count": len(skus),
        "diameter_d_mm": _unique_values([sku.diameter_mm for sku in skus]),
        "outer_diameter_D_mm": _unique_values([sku.outer_diameter_mm for sku in skus]),
        "length_L_mm": _unique_values([sku.length_mm for sku in skus]),
        "wall_thickness_S_mm": _unique_values([sku.wall_thickness_mm for sku in skus]),
        "insulation_mm": _unique_values([sku.insulation_mm for sku in skus]),
        "steel_grades": _unique_values([sku.steel_grade for sku in skus]),
        "materials": _unique_values([sku.material for sku in skus]),
        "contours": _unique_values([sku.contour for sku in skus]),
        "angles_deg": _unique_values([sku.angle_deg for sku in skus]),
    }


def build_product_seo_prompt(product: Product) -> str:
    facts = json.dumps(product_seo_facts(product), ensure_ascii=False, indent=2)
    return f"""Сформируй SEO-черновик на русском языке для семейства товаров «Дымоход Трейд».

Используй только факты из JSON ниже. Не выдумывай сертификаты, температуры, наличие,
гарантии, совместимость, способ монтажа или технические преимущества, которых нет в данных.
Текст должен быть полезным покупателю, естественным, без HTML, Markdown и переспама.

Требования к полям:
- short_description: 1–2 предложения, до 500 символов;
- description: уникальное описание семейства примерно 900–1600 символов: назначение,
  конструкция и доступные варианты только по подтверждённым данным;
- seo_title: шаблон до 180 символов, обязательно с {{name}} и брендом «Дымоход Трейд»;
- seo_description: шаблон до 320 символов с конкретикой о товаре;
- в шаблонах разрешены только переменные {{name}}, {{article}}, {{d}}, {{D}}, {{L}},
  {{S}}, {{steel}}, {{insulation}}. Сохраняй фигурные скобки дословно;
- не перечисляй все SKU и не вставляй цену.

Факты о семействе:
{facts}
"""


async def generate_product_seo(session: AsyncSession, product_id: UUID) -> AdminSEOGenerateResponse:
    product = await get_admin_product(session, product_id)
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY не настроен для backend",
        )

    request_payload = {
        "model": settings.openai_seo_model,
        "input": [
            {
                "role": "system",
                "content": (
                    "Ты редактор технического каталога дымоходов. "
                    "Возвращай только проверяемый SEO-текст."
                ),
            },
            {"role": "user", "content": build_product_seo_prompt(product)},
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "product_family_seo",
                "strict": True,
                "schema": SEO_JSON_SCHEMA,
            }
        },
        "max_output_tokens": 2400,
        "store": False,
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                OPENAI_RESPONSES_URL,
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json=request_payload,
            )
            response.raise_for_status()
        generated = json.loads(extract_openai_output_text(response.json()))
        return AdminSEOGenerateResponse(**generated, model=settings.openai_seo_model)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenAI не сгенерировал SEO (HTTP {exc.response.status_code})",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Не удалось подключиться к OpenAI",
        ) from exc
    except (ValueError, TypeError, ValidationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI вернул некорректный SEO-черновик",
        ) from exc


def normalize_media_list(extra_attributes: dict[str, Any] | None) -> list[AdminMediaItem]:
    raw_media = (extra_attributes or {}).get(MEDIA_KEY)
    if not isinstance(raw_media, list):
        return []

    media: list[AdminMediaItem] = []
    for item in raw_media:
        if not isinstance(item, dict) or not isinstance(item.get("url"), str):
            continue
        media.append(
            AdminMediaItem(
                url=item["url"],
                alt=item.get("alt") if isinstance(item.get("alt"), str) else None,
                role=item.get("role") if isinstance(item.get("role"), str) else None,
                file_name=item.get("file_name") if isinstance(item.get("file_name"), str) else None,
            )
        )
    return media


def normalize_media_item(value: Any) -> AdminMediaItem | None:
    if not isinstance(value, dict) or not isinstance(value.get("url"), str):
        return None
    return AdminMediaItem(
        url=value["url"],
        alt=value.get("alt") if isinstance(value.get("alt"), str) else None,
        role=value.get("role") if isinstance(value.get("role"), str) else None,
        file_name=value.get("file_name") if isinstance(value.get("file_name"), str) else None,
    )


def safe_asset_name(file_name: str) -> str:
    path_name = Path(file_name).name.strip().lower()
    stem = Path(path_name).stem
    suffix = Path(path_name).suffix
    safe_stem = re.sub(r"[^a-z0-9_-]+", "-", stem).strip("-")
    safe_suffix = suffix if suffix in ALLOWED_PHOTO_EXTENSIONS else ".jpg"
    return f"{safe_stem or 'photo'}{safe_suffix}"


def safe_storage_key(value: str) -> str:
    safe_value = re.sub(r"[^a-z0-9_-]+", "-", value.strip().lower()).strip("-")
    return safe_value or "product"


def canonical_photo_name(file_name: str, role: str | None) -> str:
    safe_name = safe_asset_name(file_name)
    canonical_stem = PHOTO_ROLE_FILENAMES.get(role or "")
    return f"{canonical_stem}{Path(safe_name).suffix}" if canonical_stem else safe_name


def resolve_product_media(
    product_extra_attributes: dict[str, Any] | None,
    category_extra_attributes: dict[str, Any] | None,
) -> list[AdminMediaItem]:
    """Logical Product owns form-factor media; Category media is legacy fallback only."""
    if isinstance((product_extra_attributes or {}).get(MEDIA_KEY), list):
        return normalize_media_list(product_extra_attributes)
    return normalize_media_list(category_extra_attributes)


def decode_photo_payload(payload: str) -> bytes:
    if "," in payload and payload.lower().startswith("data:"):
        payload = payload.split(",", 1)[1]
    try:
        content = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid base64 photo payload") from exc
    validate_photo_content(content)
    return content


def validate_photo_content(content: bytes) -> None:
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Photo payload is empty")
    if len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Photo is too large")


def product_to_admin_read(product: Product) -> AdminProductRead:
    media = resolve_product_media(product.extra_attributes, product.category.extra_attributes)
    return AdminProductRead(
        id=product.id,
        category_id=product.category_id,
        category_name=product.category.name,
        name=product.name,
        slug=product.slug,
        product_kind=product.product_kind,
        sku_count=len(product.skus),
        media_count=len(media),
        is_active=product.is_active,
        short_description=product.short_description,
        description=product.description,
        brand=product.brand,
        material=product.material,
        steel_grade=product.steel_grade,
        wall_thickness_mm=product.wall_thickness_mm,
        diameter_mm=product.diameter_mm,
        contour=product.contour,
        insulation_mm=product.insulation_mm,
        max_temperature_c=product.max_temperature_c,
        purpose=product.purpose,
        extra_attributes=product.extra_attributes,
        application_tags=product.application_tags,
        compatibility_notes=product.compatibility_notes,
        media=media,
        skus=product.skus,
    )


async def list_admin_products(
    session: AsyncSession,
    *,
    category_id: UUID | None,
    limit: int,
    offset: int,
) -> tuple[list[AdminProductListItem], int]:
    filters = []
    if category_id is not None:
        filters.append(Product.category_id == category_id)

    total = await session.scalar(select(func.count(Product.id)).where(*filters))
    result = await session.execute(
        select(Product)
        .where(*filters)
        .options(joinedload(Product.category), selectinload(Product.skus))
        .order_by(Product.name.asc())
        .limit(limit)
        .offset(offset)
    )
    products = list(result.scalars())
    items = [
        AdminProductListItem(
            id=product.id,
            category_id=product.category_id,
            category_name=product.category.name,
            name=product.name,
            slug=product.slug,
            product_kind=product.product_kind,
            sku_count=len(product.skus),
            media_count=len(resolve_product_media(product.extra_attributes, product.category.extra_attributes)),
            is_active=product.is_active,
        )
        for product in products
    ]
    return items, int(total or 0)


async def list_admin_skus(
    session: AsyncSession,
    *,
    category_id: UUID | None,
    limit: int,
    offset: int,
    search: str | None,
) -> tuple[list[AdminSKUListItem], int]:
    filters = []
    if category_id is not None:
        filters.append(Product.category_id == category_id)
    if search:
        search_pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                SKU.article.ilike(search_pattern),
                SKU.name.ilike(search_pattern),
                Product.name.ilike(search_pattern),
            )
        )

    total = await session.scalar(select(func.count(SKU.id)).join(Product).where(*filters))
    result = await session.execute(
        select(SKU, Product, Category)
        .join(Product, SKU.product_id == Product.id)
        .join(Category, Product.category_id == Category.id)
        .where(*filters)
        .order_by(Product.name.asc(), SKU.article.asc())
        .limit(limit)
        .offset(offset)
    )

    items = [
        AdminSKUListItem(
            id=sku.id,
            product_id=sku.product_id,
            article=sku.article,
            name=sku.name,
            slug=sku.slug,
            material=sku.material,
            steel_grade=sku.steel_grade,
            wall_thickness_mm=sku.wall_thickness_mm,
            diameter_mm=sku.diameter_mm,
            outer_diameter_mm=sku.outer_diameter_mm,
            contour=sku.contour,
            insulation_mm=sku.insulation_mm,
            length_mm=sku.length_mm,
            angle_deg=sku.angle_deg,
            price_rub=sku.price_rub,
            stock_status=sku.stock_status,
            attributes=sku.attributes,
            is_active=sku.is_active,
            product_name=product.name,
            product_slug=product.slug,
            product_kind=product.product_kind,
            category_id=category.id,
            category_name=category.name,
        )
        for sku, product, category in result.all()
    ]
    return items, int(total or 0)


async def get_admin_product(session: AsyncSession, product_id: UUID) -> Product:
    result = await session.execute(
        select(Product)
        .where(Product.id == product_id)
        .options(joinedload(Product.category), selectinload(Product.skus))
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


async def update_product(
    session: AsyncSession,
    product_id: UUID,
    payload: AdminProductUpdate,
) -> AdminProductRead:
    product = await get_admin_product(session, product_id)
    values = payload.model_dump(exclude_unset=True)
    for field in ("short_description", "description"):
        if field in values:
            setattr(product, field, values[field])

    extra_attributes = dict(product.extra_attributes or {})
    for field in ("seo_title", "seo_description"):
        if field not in values:
            continue
        value = values[field]
        if value:
            extra_attributes[field] = value
        else:
            extra_attributes.pop(field, None)
    product.extra_attributes = extra_attributes

    await session.commit()
    return product_to_admin_read(await get_admin_product(session, product_id))


async def create_sku(session: AsyncSession, product_id: UUID, payload: AdminSKUCreate) -> SKU:
    await get_admin_product(session, product_id)
    sku = SKU(product_id=product_id, **payload.model_dump())
    session.add(sku)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU article already exists") from exc
    await session.refresh(sku)
    return sku


async def update_sku(session: AsyncSession, sku_id: UUID, payload: AdminSKUUpdate) -> SKU:
    sku = await session.get(SKU, sku_id)
    if sku is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(sku, field, value)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU article already exists") from exc
    await session.refresh(sku)
    return sku


async def deactivate_sku(session: AsyncSession, sku_id: UUID) -> SKU:
    sku = await session.get(SKU, sku_id)
    if sku is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU not found")
    sku.is_active = False
    await session.commit()
    await session.refresh(sku)
    return sku


async def attach_product_photo(session: AsyncSession, product_id: UUID, payload: AdminPhotoUpload) -> AdminProductRead:
    return await attach_product_photo_content(
        session,
        product_id,
        file_name=payload.file_name,
        content=decode_photo_payload(payload.content_base64),
        alt=payload.alt,
        role=payload.role,
    )


async def attach_product_photo_content(
    session: AsyncSession,
    product_id: UUID,
    *,
    file_name: str,
    content: bytes,
    alt: str | None,
    role: str | None,
) -> AdminProductRead:
    product = await get_admin_product(session, product_id)
    validate_photo_content(content)
    file_name = canonical_photo_name(file_name, role)

    geometry_family = product.extra_attributes.get("geometry_family")
    storage_key = safe_storage_key(geometry_family if isinstance(geometry_family, str) else product.slug)
    product_dir = Path(settings.media_storage_dir) / "catalog" / "categories" / storage_key
    product_dir.mkdir(parents=True, exist_ok=True)

    # First write also migrates any legacy category-level media into this form-factor.
    media = resolve_product_media(product.extra_attributes, product.category.extra_attributes)
    replace_index = next(
        (
            index
            for index, item in enumerate(media)
            if (role and item.role == role) or item.file_name == file_name
        ),
        None,
    )
    if replace_index is None and len(media) >= 3:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Form-factor already has three photos; choose a role to replace",
        )

    target = product_dir / file_name
    target.write_bytes(content)

    relative = target.relative_to(Path(settings.media_storage_dir))
    media_item = AdminMediaItem(
        url=f"/media/{relative.as_posix()}?v={target.stat().st_mtime_ns}",
        alt=alt,
        role=role,
        file_name=file_name,
    )
    if replace_index is None:
        media.append(media_item)
    else:
        media[replace_index] = media_item

    product.extra_attributes = {
        **(product.extra_attributes or {}),
        MEDIA_KEY: [item.model_dump(exclude_none=True) for item in media],
    }
    await session.commit()
    return product_to_admin_read(await get_admin_product(session, product_id))


async def attach_category_cover(
    session: AsyncSession,
    category_id: UUID,
    payload: AdminPhotoUpload,
) -> AdminMediaItem:
    category = await session.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    content = decode_photo_payload(payload.content_base64)
    safe_name = safe_asset_name(payload.file_name)
    file_name = f"category-cover{Path(safe_name).suffix}"
    category_dir = Path(settings.media_storage_dir) / "catalog" / "category-covers" / safe_storage_key(category.slug)
    category_dir.mkdir(parents=True, exist_ok=True)
    target = category_dir / file_name
    target.write_bytes(content)

    relative = target.relative_to(Path(settings.media_storage_dir))
    media_item = AdminMediaItem(
        url=f"/media/{relative.as_posix()}?v={target.stat().st_mtime_ns}",
        alt=payload.alt,
        role="category-cover",
        file_name=file_name,
    )
    category.extra_attributes = {
        **(category.extra_attributes or {}),
        CATEGORY_COVER_KEY: media_item.model_dump(exclude_none=True),
    }
    await session.commit()
    return media_item


async def delete_category_cover(session: AsyncSession, category_id: UUID) -> None:
    category = await session.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    attributes = dict(category.extra_attributes or {})
    attributes.pop(CATEGORY_COVER_KEY, None)
    category.extra_attributes = attributes
    await session.commit()


async def attach_sku_photo(
    session: AsyncSession,
    sku_id: UUID,
    payload: AdminPhotoUpload,
) -> AdminMediaItem:
    sku = await session.get(SKU, sku_id)
    if sku is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU not found")

    content = decode_photo_payload(payload.content_base64)
    safe_name = safe_asset_name(payload.file_name)
    file_name = f"sku-photo{Path(safe_name).suffix}"
    sku_dir = Path(settings.media_storage_dir) / "catalog" / "skus" / safe_storage_key(sku.article)
    sku_dir.mkdir(parents=True, exist_ok=True)
    target = sku_dir / file_name
    target.write_bytes(content)

    relative = target.relative_to(Path(settings.media_storage_dir))
    media_item = AdminMediaItem(
        url=f"/media/{relative.as_posix()}?v={target.stat().st_mtime_ns}",
        alt=payload.alt,
        role="sku",
        file_name=file_name,
    )
    sku.attributes = {
        **(sku.attributes or {}),
        SKU_PHOTO_KEY: media_item.model_dump(exclude_none=True),
    }
    await session.commit()
    return media_item


async def delete_sku_photo(session: AsyncSession, sku_id: UUID) -> None:
    sku = await session.get(SKU, sku_id)
    if sku is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU not found")
    attributes = dict(sku.attributes or {})
    attributes.pop(SKU_PHOTO_KEY, None)
    sku.attributes = attributes
    await session.commit()


async def delete_product_photo(session: AsyncSession, product_id: UUID, photo_index: int) -> AdminProductRead:
    product = await get_admin_product(session, product_id)
    media = normalize_media_list(product.extra_attributes)
    if not media:
        media = normalize_media_list(product.category.extra_attributes)

    if photo_index < 0 or photo_index >= len(media):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    media.pop(photo_index)
    product.extra_attributes = {
        **(product.extra_attributes or {}),
        MEDIA_KEY: [item.model_dump(exclude_none=True) for item in media],
    }
    await session.commit()
    return product_to_admin_read(await get_admin_product(session, product_id))


async def list_admin_categories(session: AsyncSession) -> list[tuple[Category, int]]:
    result = await session.execute(
        select(Category, func.count(SKU.id))
        .outerjoin(Product, Product.category_id == Category.id)
        .outerjoin(SKU, SKU.product_id == Product.id)
        .group_by(Category.id)
        .order_by(Category.sort_order.asc(), Category.name.asc())
    )
    return [(category, int(count)) for category, count in result.all()]
