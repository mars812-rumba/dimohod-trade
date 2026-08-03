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
    AdminSEOProductKnowledge,
    AdminSEOGenerateResponse,
    AdminSKUCreate,
    AdminSKUListItem,
    AdminSKUUpdate,
)
from app.modules.catalog.models import Category
from app.modules.compatibility.service import context_from_product_sku, list_active_rules, rule_matches
from app.modules.products.models import Product, SKU
from app.modules.products.service import (
    COMPATIBLE_PRODUCT_IDS_KEY,
    normalized_compatible_product_ids,
)

MEDIA_KEY = "media"
CATEGORY_COVER_KEY = "category_cover"
SKU_PHOTO_KEY = "sku_photo"
SKU_MEDIA_KEY = "sku_media"
MAX_PHOTO_BYTES = 8 * 1024 * 1024
ALLOWED_PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".svg"}
PHOTO_ROLE_FILENAMES = {
    "general": "photo-1",
    "top": "photo-2",
    "connection": "photo-3",
    "detail": "photo-3",
}
SKU_PHOTO_ROLE_FILENAMES = {
    "general": "sku-photo-1",
    "top": "sku-photo-2",
    "connection": "sku-photo-3",
}
OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
SEO_KNOWLEDGE_KEY = "seo_knowledge"
LEGACY_CONTENT_MIGRATION_KEY = "legacy_admin_content_migrated"
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


def _value_range(values: list[Any]) -> dict[str, Any] | None:
    normalized = sorted({value for value in values if value is not None})
    if not normalized:
        return None
    minimum = normalized[0]
    maximum = normalized[-1]
    if isinstance(minimum, Decimal):
        minimum = str(minimum)
    if isinstance(maximum, Decimal):
        maximum = str(maximum)
    return {
        "min": minimum,
        "max": maximum,
        "is_fixed": minimum == maximum,
    }


def normalize_seo_knowledge(value: Any) -> AdminSEOProductKnowledge:
    if not isinstance(value, dict):
        return AdminSEOProductKnowledge()
    try:
        return AdminSEOProductKnowledge.model_validate(value)
    except ValidationError:
        return AdminSEOProductKnowledge()


def _sku_facts(sku: SKU | None) -> dict[str, Any] | None:
    if sku is None:
        return None
    return {
        "article": sku.article,
        "name": sku.name,
        "diameter_d_mm": sku.diameter_mm,
        "outer_diameter_D_mm": sku.outer_diameter_mm,
        "length_L_mm": sku.length_mm,
        "wall_thickness_S_mm": str(sku.wall_thickness_mm) if sku.wall_thickness_mm is not None else None,
        "insulation_mm": sku.insulation_mm,
        "steel_grade": sku.steel_grade,
        "material": sku.material,
        "contour": sku.contour,
        "angle_deg": sku.angle_deg,
    }


def product_seo_facts(
    product: Product,
    *,
    selected_sku: SKU | None = None,
    compatibility_rules: list[dict[str, Any]] | None = None,
    seo_knowledge: AdminSEOProductKnowledge | None = None,
) -> dict[str, Any]:
    skus = [sku for sku in product.skus if sku.is_active]
    knowledge = seo_knowledge or normalize_seo_knowledge((product.extra_attributes or {}).get(SEO_KNOWLEDGE_KEY))
    knowledge_payload = knowledge.model_dump(by_alias=True)
    missing_sections = []
    for key in (
        "purpose",
        "installationZones",
        "compatibleWith",
        "installationVariants",
        "selectionRules",
        "installationWarnings",
        "fireSafety",
        "requiredInputData",
        "sourceNotes",
    ):
        has_legacy_source = (key == "purpose" and bool(product.purpose)) or (
            key == "compatibleWith" and bool(product.compatibility_notes)
        )
        if not knowledge_payload.get(key) and not has_legacy_source:
            missing_sections.append(key)
    return {
        "evidence_policy": (
            "Use only fields in this JSON. Missing fields are unknown, not permission to infer. "
            "Fire-safety claims may come only from seo_knowledge.fireSafety with sourceNotes, "
            "or an applicable compatibility rule explicitly typed fire_safety."
        ),
        "family_name": product.name,
        "category": product.category.name,
        "product_kind": product.product_kind,
        "brand": product.brand,
        "purpose": product.purpose,
        "application_tags": product.application_tags,
        "compatibility_notes": product.compatibility_notes,
        "seo_knowledge": knowledge_payload,
        "selected_sku": _sku_facts(selected_sku),
        "applicable_compatibility_rules": compatibility_rules or [],
        "missing_confirmed_sections": missing_sections,
        "active_sku_count": len(skus),
        "family_ranges": {
            "diameter_d_mm": _value_range([sku.diameter_mm for sku in skus]),
            "outer_diameter_D_mm": _value_range([sku.outer_diameter_mm for sku in skus]),
            "length_L_mm": _value_range([sku.length_mm for sku in skus]),
            "wall_thickness_S_mm": _value_range([sku.wall_thickness_mm for sku in skus]),
            "insulation_mm": _value_range([sku.insulation_mm for sku in skus]),
        },
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


def build_product_seo_prompt(facts_payload: dict[str, Any]) -> str:
    facts = json.dumps(facts_payload, ensure_ascii=False, indent=2)
    return f"""Сформируй проверяемый SEO-черновик на русском языке для семейства товаров «Дымоход Трейд».

Используй только факты из JSON ниже. Не выдумывай сертификаты, температуры, наличие,
гарантии, нормы, расстояния, совместимость, способ монтажа или технические преимущества.
Отсутствующее утверждение пропусти или отметь как требующее уточнения специалистом.
Пожарную безопасность описывай только из seo_knowledge.fireSafety при наличии sourceNotes
или из applicable_compatibility_rules с type=fire_safety. Остальные правила не являются
разрешением создавать пожарные нормы.
Текст должен объяснять роль изделия в системе, помогать с выбором и вести к конфигуратору.
Не перечисляй все диаметры и SKU. Подзаголовки пиши обычным текстом, без HTML.

Пиши естественно, как опытный специалист магазина в спокойной консультации покупателя:
- сразу отвечай по существу, не начинай каждый раздел с названия или определения товара;
- используй простые прямые фразы и естественные связки «подходит для», «при выборе проверьте»,
  «этот вариант нужен, если…»; чередуй короткие и средние предложения;
- объясняй, что означает подтверждённый факт для выбора покупателя, но не делай новых технических выводов;
- не повторяй один факт в соседних разделах и не начинай абзацы одинаковыми конструкциями;
- не используй «данное изделие», «представляет собой», «широко применяется», «следует учитывать»,
  «оптимальное решение», «важный элемент системы», «обеспечивает эффективность», «идеально подходит»;
- не показывай названия полей JSON, источников и служебные пометки;
- перед ответом прочитай черновик как устную консультацию и убери канцелярит, повторы и машинные штампы.

Требования к полям:
- short_description: 2–3 предложения — что это, где применяется, главная польза;
- description: семейный текст; выбирай только наполненные фактами разделы из набора «Назначение»,
  «Где применяется», «Совместимость», «Варианты монтажа», «Что учитывать при подборе»,
  «Пожарная безопасность», затем «Расчёт комплекта»;
- не создавай раздел «Характеристики выбранного SKU»: приложение строит его динамически из БД;
- пропускай раздел без подтверждённых фактов; не создавай пустой блок ради шаблона;
- «требует уточнения специалистом» используй не более одного раза во всём description и только если
  без уточнения нельзя сделать безопасный выбор;
- seo_title: ориентир 50–70 символов, название и ключевая функция/место применения;
- seo_description: ориентир 130–170 символов: назначение, важный параметр SKU,
  совместимость/сценарий и мягкий призыв рассчитать комплект; не копируй title;
- в шаблонах разрешены только переменные {{name}}, {{article}}, {{d}}, {{D}}, {{L}},
  {{S}}, {{thickness}}, {{steel}}, {{material}}, {{contour}}, {{angle}}, {{insulation}},
  {{diameter}}, {{dimensions}}. Сохраняй фигурные скобки дословно;
- short_description и description не должны содержать параметры одного selected_sku как свойства
  семейства. Допустим только краткий диапазон из family_ranges или фиксированное для всех SKU значение;
- seo_title и seo_description являются шаблонами семейства. Любое меняющееся значение SKU
  записывай только переменной, никогда конкретной цифрой или артикулом selected_sku;
- заверши description текстом CTA из seo_knowledge.configuratorCta.text;
- не вставляй configuratorCta.href или другой URL в description: ссылка рендерится отдельно;
- не используй рекламные штампы и не вставляй цену.

Подтверждённый пакет фактов (этап 1 завершён приложением):
{facts}
"""


def parameterize_sku_meta(value: str, sku: SKU | None) -> str:
    if sku is None:
        return value

    result = value
    if sku.diameter_mm is not None and sku.outer_diameter_mm is not None:
        d = str(sku.diameter_mm)
        outer_d = str(sku.outer_diameter_mm)
        pair_pattern = rf"(?<!\d){re.escape(d)}\s*[/×xх]\s*{re.escape(outer_d)}(?!\d)"
        result = re.sub(pair_pattern, "{d}/{D}", result, flags=re.IGNORECASE)
    elif sku.diameter_mm is not None:
        diameter_pattern = rf"(?<!\d){sku.diameter_mm}(?!\d)(?=\s*мм)"
        result = re.sub(diameter_pattern, "{d}", result)

    replacements = (
        (sku.article, "{article}"),
        (sku.steel_grade, "{steel}"),
        (sku.material, "{material}"),
    )
    for literal, token in replacements:
        if literal:
            result = re.sub(re.escape(literal), token, result, flags=re.IGNORECASE)

    if sku.wall_thickness_mm is not None:
        thickness_values = {str(sku.wall_thickness_mm), str(sku.wall_thickness_mm).replace(".", ",")}
        for thickness in thickness_values:
            result = re.sub(
                rf"(толщин(?:а|ой)\s){re.escape(thickness)}(?=\s*мм)",
                r"\1{S}",
                result,
                flags=re.IGNORECASE,
            )
    if sku.insulation_mm is not None:
        result = re.sub(
            rf"(утеплени(?:е|ем)\s){sku.insulation_mm}(?=\s*мм)",
            r"\1{insulation}",
            result,
            flags=re.IGNORECASE,
        )
    return result


def remove_dynamic_sku_section(value: str) -> str:
    pattern = (
        r"(?ims)^\s*Характеристики выбранного SKU\s*:?[ \t]*$.*?"
        r"(?=^\s*Расч[её]т комплекта\s*:?[ \t]*$|\Z)"
    )
    return re.sub(pattern, "", value).strip()


async def collect_product_seo_facts(
    session: AsyncSession,
    product: Product,
    *,
    selected_sku_id: UUID | None,
    seo_knowledge: AdminSEOProductKnowledge | None = None,
) -> dict[str, Any]:
    selected_sku = next(
        (sku for sku in product.skus if sku.id == selected_sku_id and sku.is_active),
        None,
    )
    if selected_sku_id is not None and selected_sku is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected SKU does not belong to product")

    applicable_rules: list[dict[str, Any]] = []
    if selected_sku is not None:
        context = context_from_product_sku(product, selected_sku)
        for rule in await list_active_rules(session):
            if rule_matches(rule, context):
                applicable_rules.append(
                    {
                        "code": rule.code,
                        "name": rule.name,
                        "type": rule.rule_type,
                        "severity": rule.severity,
                        "message": rule.message,
                    }
                )
    return product_seo_facts(
        product,
        selected_sku=selected_sku,
        compatibility_rules=applicable_rules,
        seo_knowledge=seo_knowledge,
    )


async def generate_product_seo(
    session: AsyncSession,
    product_id: UUID,
    *,
    selected_sku_id: UUID | None = None,
    seo_knowledge: AdminSEOProductKnowledge | None = None,
) -> AdminSEOGenerateResponse:
    product = await get_admin_product(session, product_id)
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY не настроен для backend",
        )

    facts_payload = await collect_product_seo_facts(
        session,
        product,
        selected_sku_id=selected_sku_id,
        seo_knowledge=seo_knowledge,
    )
    request_payload = {
        "model": settings.openai_seo_model,
        "input": [
            {
                "role": "system",
                "content": (
                    "Ты опытный консультант и редактор технического каталога дымоходов. "
                    "Сначала доверяй только предоставленному пакету фактов, затем создавай черновик. "
                    "Не восполняй отсутствующие технические данные знаниями модели. "
                    "Пиши естественным человеческим языком: конкретно, спокойно, без канцелярита, "
                    "рекламных штампов, повторов и ощущения шаблонной генерации."
                ),
            },
            {"role": "user", "content": build_product_seo_prompt(facts_payload)},
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "product_family_seo",
                "strict": True,
                "schema": SEO_JSON_SCHEMA,
            }
        },
        "max_output_tokens": 3600,
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
        selected_sku = next(
            (sku for sku in product.skus if sku.id == selected_sku_id and sku.is_active),
            None,
        )
        generated["description"] = remove_dynamic_sku_section(generated["description"])
        generated["seo_title"] = parameterize_sku_meta(generated["seo_title"], selected_sku)
        generated["seo_description"] = parameterize_sku_meta(generated["seo_description"], selected_sku)
        return AdminSEOGenerateResponse(
            **generated,
            model=settings.openai_seo_model,
            fact_warnings=[
                f"Нет подтверждённых данных: {field}"
                for field in facts_payload["missing_confirmed_sections"]
            ],
        )
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


def normalize_sku_media(attributes: dict[str, Any] | None) -> list[AdminMediaItem]:
    """Return role-based SKU gallery and expose legacy sku_photo as the general slot."""
    raw_media = (attributes or {}).get(SKU_MEDIA_KEY)
    media: list[AdminMediaItem] = []
    if isinstance(raw_media, list):
        for value in raw_media:
            item = normalize_media_item(value)
            if item is None or item.role not in SKU_PHOTO_ROLE_FILENAMES:
                continue
            media = [existing for existing in media if existing.role != item.role]
            media.append(item)

    if not any(item.role == "general" for item in media):
        legacy = normalize_media_item((attributes or {}).get(SKU_PHOTO_KEY))
        if legacy is not None:
            media.insert(0, legacy.model_copy(update={"role": "general"}))

    role_order = {role: index for index, role in enumerate(SKU_PHOTO_ROLE_FILENAMES)}
    return sorted(media, key=lambda item: role_order.get(item.role or "", len(role_order)))


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


def canonical_sku_photo_name(file_name: str, role: str | None) -> tuple[str, str]:
    normalized_role = role if role in SKU_PHOTO_ROLE_FILENAMES else "general"
    safe_name = safe_asset_name(file_name)
    return f"{SKU_PHOTO_ROLE_FILENAMES[normalized_role]}{Path(safe_name).suffix}", normalized_role


def resolve_product_media(
    product_extra_attributes: dict[str, Any] | None,
    category_extra_attributes: dict[str, Any] | None,
) -> list[AdminMediaItem]:
    """Logical Product owns form-factor media; Category media is legacy fallback only."""
    if isinstance((product_extra_attributes or {}).get(MEDIA_KEY), list):
        return normalize_media_list(product_extra_attributes)
    return normalize_media_list(category_extra_attributes)


def inherit_legacy_product_content(product: Product, legacy_products: list[Product]) -> bool:
    """Recover editor content left on Product rows merged into this family."""
    attributes = dict(product.extra_attributes or {})
    if attributes.get(LEGACY_CONTENT_MIGRATION_KEY) is True:
        return False

    matching_legacy = [
        legacy
        for legacy in legacy_products
        if str((legacy.extra_attributes or {}).get("merged_into_product_id")) == str(product.id)
    ]
    if not matching_legacy:
        return False

    for legacy in matching_legacy:
        legacy_attributes = legacy.extra_attributes or {}
        for key in (MEDIA_KEY, SEO_KNOWLEDGE_KEY, "seo_title", "seo_description"):
            if not attributes.get(key) and legacy_attributes.get(key):
                attributes[key] = legacy_attributes[key]
        if not product.description and legacy.description:
            product.description = legacy.description

    # Mark the one-time recovery even if the legacy rows had no editor content.
    # This prevents intentionally cleared fields from being restored later.
    attributes[LEGACY_CONTENT_MIGRATION_KEY] = True
    product.extra_attributes = attributes
    return True


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
        compatible_product_ids=normalized_compatible_product_ids(product.extra_attributes) or [],
    )


async def list_admin_products(
    session: AsyncSession,
    *,
    category_id: UUID | None,
    search: str | None,
    limit: int,
    offset: int,
) -> tuple[list[AdminProductListItem], int]:
    # Legacy Product rows remain in the database after variants are grouped into
    # one canonical family. Their SKUs have already been moved away, so exposing
    # those inactive shells produces an empty editor with no photos or variants.
    filters = [Product.is_active.is_(True)]
    if category_id is not None:
        filters.append(Product.category_id == category_id)
    if search:
        search_pattern = f"%{search.strip()}%"
        filters.append(or_(Product.name.ilike(search_pattern), Product.slug.ilike(search_pattern)))

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
        .where(Product.id == product_id, Product.is_active.is_(True))
        .options(joinedload(Product.category), selectinload(Product.skus))
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if not (product.extra_attributes or {}).get(LEGACY_CONTENT_MIGRATION_KEY):
        legacy_result = await session.execute(
            select(Product)
            .where(
                Product.category_id == product.category_id,
                Product.is_active.is_(False),
            )
            .order_by(Product.updated_at.desc())
        )
        if inherit_legacy_product_content(product, list(legacy_result.scalars())):
            await session.commit()
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
    if "seo_knowledge" in values:
        knowledge = values["seo_knowledge"]
        if knowledge is None:
            extra_attributes.pop(SEO_KNOWLEDGE_KEY, None)
        else:
            extra_attributes[SEO_KNOWLEDGE_KEY] = AdminSEOProductKnowledge.model_validate(knowledge).model_dump(
                by_alias=True
            )
    if "compatible_product_ids" in values:
        requested_ids = list(dict.fromkeys(values["compatible_product_ids"] or []))
        if product_id in requested_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product cannot be compatible with itself",
            )
        if requested_ids:
            existing_ids = set(
                await session.scalars(
                    select(Product.id).where(
                        Product.id.in_(requested_ids),
                        Product.is_active.is_(True),
                    )
                )
            )
            missing_ids = [str(value) for value in requested_ids if value not in existing_ids]
            if missing_ids:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={"unknown_compatible_product_ids": missing_ids},
                )
        extra_attributes[COMPATIBLE_PRODUCT_IDS_KEY] = [str(value) for value in requested_ids]
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
    file_name, role = canonical_sku_photo_name(payload.file_name, payload.role)
    sku_dir = Path(settings.media_storage_dir) / "catalog" / "skus" / safe_storage_key(sku.article)
    sku_dir.mkdir(parents=True, exist_ok=True)
    target = sku_dir / file_name
    target.write_bytes(content)

    relative = target.relative_to(Path(settings.media_storage_dir))
    media_item = AdminMediaItem(
        url=f"/media/{relative.as_posix()}?v={target.stat().st_mtime_ns}",
        alt=payload.alt,
        role=role,
        file_name=file_name,
    )
    media = [item for item in normalize_sku_media(sku.attributes) if item.role != role]
    media.append(media_item)
    normalized_media = normalize_sku_media(
        {SKU_MEDIA_KEY: [item.model_dump(exclude_none=True) for item in media]}
    )
    attributes = {
        **(sku.attributes or {}),
        SKU_MEDIA_KEY: [item.model_dump(exclude_none=True) for item in normalized_media],
    }
    if role == "general":
        attributes[SKU_PHOTO_KEY] = media_item.model_dump(exclude_none=True)
    sku.attributes = attributes
    await session.commit()
    return media_item


async def delete_sku_photo(session: AsyncSession, sku_id: UUID, role: str | None = None) -> None:
    sku = await session.get(SKU, sku_id)
    if sku is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU not found")
    attributes = dict(sku.attributes or {})
    if role is None:
        attributes.pop(SKU_PHOTO_KEY, None)
        attributes.pop(SKU_MEDIA_KEY, None)
    else:
        normalized_role = role if role in SKU_PHOTO_ROLE_FILENAMES else "general"
        media = [item for item in normalize_sku_media(attributes) if item.role != normalized_role]
        if media:
            attributes[SKU_MEDIA_KEY] = [item.model_dump(exclude_none=True) for item in media]
        else:
            attributes.pop(SKU_MEDIA_KEY, None)
        if normalized_role == "general":
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
