import base64
import binascii
import hashlib
import json
import re
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, UUID, uuid4, uuid5

import httpx
from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.config import settings
from app.media.images import (
    CatalogImageError,
    EncodedCatalogImage,
    StoredCatalogImage,
    encode_catalog_image,
    store_encoded_catalog_image,
)
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
from app.modules.products.content import (
    is_single_wall_contour,
    remove_single_wall_placement_rule,
    sanitize_seo_knowledge_dict,
    sanitize_sku_seo_dict,
)
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
SEO_EXCLUDED_COMPATIBILITY_RULE_CODES = frozenset({"single_wall_indoor_only"})
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


def remove_single_wall_outdoor_seo_rule(
    value: str | None,
    *,
    single_wall_context: bool = False,
) -> str | None:
    """Backward-compatible name for removal of the retired placement rule."""
    return remove_single_wall_placement_rule(
        value,
        single_wall_context=single_wall_context,
    )


def sanitize_seo_knowledge_payload(
    knowledge: AdminSEOProductKnowledge,
    *,
    single_wall_context: bool = False,
) -> dict[str, Any]:
    payload = knowledge.model_dump(by_alias=True)
    return sanitize_seo_knowledge_dict(
        payload,
        single_wall_context=single_wall_context,
    )


def sanitize_sku_seo_attributes(
    attributes: dict[str, Any],
    *,
    single_wall_context: bool = False,
) -> dict[str, Any]:
    sanitized = dict(attributes)
    raw_seo = sanitized.get("sku_seo")
    if not isinstance(raw_seo, dict):
        return sanitized
    sanitized["sku_seo"] = sanitize_sku_seo_dict(
        raw_seo,
        single_wall_context=single_wall_context,
    )
    return sanitized


def product_has_single_wall_context(product: Product, selected_sku: SKU | None = None) -> bool:
    if selected_sku is not None:
        return is_single_wall_contour(getattr(selected_sku, "contour", None))
    if is_single_wall_contour(getattr(product, "contour", None)):
        return True
    active_contours = [sku.contour for sku in product.skus if sku.is_active and sku.contour]
    return bool(active_contours) and all(is_single_wall_contour(value) for value in active_contours)


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
    single_wall_context = product_has_single_wall_context(product, selected_sku)
    knowledge = seo_knowledge or normalize_seo_knowledge((product.extra_attributes or {}).get(SEO_KNOWLEDGE_KEY))
    knowledge_payload = sanitize_seo_knowledge_payload(
        knowledge,
        single_wall_context=single_wall_context,
    )
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
        "purpose": [
            cleaned
            for value in product.purpose
            if (
                cleaned := remove_single_wall_outdoor_seo_rule(
                    value,
                    single_wall_context=single_wall_context,
                )
            )
        ],
        "application_tags": product.application_tags,
        "compatibility_notes": remove_single_wall_outdoor_seo_rule(
            product.compatibility_notes,
            single_wall_context=single_wall_context,
        ),
        "seo_knowledge": knowledge_payload,
        "selected_sku": _sku_facts(selected_sku),
        "applicable_compatibility_rules": [
            rule
            for rule in (compatibility_rules or [])
            if rule.get("code") not in SEO_EXCLUDED_COMPATIBILITY_RULE_CODES
        ],
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
Не включай в SEO-тексты универсальное правило, будто одноконтурные элементы
совместимы только с помещением, тёплой зоной или стартовым участком, либо запрещены на улице,
в холодной зоне, на чердаке или кровле.

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
        single_wall_context = product_has_single_wall_context(product, selected_sku)
        for field in ("short_description", "description", "seo_description"):
            generated[field] = remove_single_wall_outdoor_seo_rule(
                generated[field],
                single_wall_context=single_wall_context,
            ) or ""
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


def normalize_media_list(
    extra_attributes: dict[str, Any] | None,
    *,
    inspect_content: bool = False,
) -> list[AdminMediaItem]:
    raw_media = (extra_attributes or {}).get(MEDIA_KEY)
    if not isinstance(raw_media, list):
        return []

    media: list[AdminMediaItem] = []
    for item in raw_media:
        if not isinstance(item, dict) or not isinstance(item.get("url"), str):
            continue
        media.append(
            AdminMediaItem(
                media_id=normalized_media_id(item),
                content_sha256=item.get("content_sha256") if isinstance(item.get("content_sha256"), str) else None,
                scope=normalized_media_scope(item),
                url=item["url"],
                thumbnail_url=item.get("thumbnail_url") if isinstance(item.get("thumbnail_url"), str) else None,
                width=item.get("width") if isinstance(item.get("width"), int) else None,
                height=item.get("height") if isinstance(item.get("height"), int) else None,
                alt=item.get("alt") if isinstance(item.get("alt"), str) else None,
                role=item.get("role") if isinstance(item.get("role"), str) else None,
                file_name=item.get("file_name") if isinstance(item.get("file_name"), str) else None,
                diameter_specific=item.get("diameter_specific") is True,
                diameter_keys=normalized_media_diameter_keys(item.get("diameter_keys")),
                lengths_mm=normalized_media_lengths(item.get("lengths_mm")),
                sku_specific=item.get("sku_specific") is True,
            )
        )
    deduplicated: dict[str, AdminMediaItem] = {}
    for item in media:
        content_sha256 = stored_media_content_sha256(item) if inspect_content else item.content_sha256
        deduplication_key = (
            f"{item.scope}:{item.role}:{content_sha256}"
            if content_sha256
            else item.media_id or item.url
        )
        existing = deduplicated.get(deduplication_key)
        if existing is None:
            deduplicated[deduplication_key] = item.model_copy(
                update={"content_sha256": content_sha256}
            )
            continue
        deduplicated[deduplication_key] = existing.model_copy(
            update={
                "alt": item.alt or existing.alt,
                "content_sha256": content_sha256 or existing.content_sha256,
                "diameter_keys": merged_media_scope(existing.diameter_keys, item.diameter_keys),
                "lengths_mm": merged_media_scope(existing.lengths_mm, item.lengths_mm),
            }
        )
    normalized = list(deduplicated.values())
    last_family_by_role: dict[str, AdminMediaItem] = {}
    scoped_media: list[AdminMediaItem] = []
    for item in normalized:
        if item.scope == "family" and item.role:
            last_family_by_role[item.role] = item
        else:
            scoped_media.append(item)
    return [*last_family_by_role.values(), *scoped_media]


def normalize_media_item(value: Any) -> AdminMediaItem | None:
    if not isinstance(value, dict) or not isinstance(value.get("url"), str):
        return None
    return AdminMediaItem(
        media_id=normalized_media_id(value),
        content_sha256=value.get("content_sha256") if isinstance(value.get("content_sha256"), str) else None,
        scope=normalized_media_scope(value),
        url=value["url"],
        thumbnail_url=value.get("thumbnail_url") if isinstance(value.get("thumbnail_url"), str) else None,
        width=value.get("width") if isinstance(value.get("width"), int) else None,
        height=value.get("height") if isinstance(value.get("height"), int) else None,
        alt=value.get("alt") if isinstance(value.get("alt"), str) else None,
        role=value.get("role") if isinstance(value.get("role"), str) else None,
        file_name=value.get("file_name") if isinstance(value.get("file_name"), str) else None,
        diameter_specific=value.get("diameter_specific") is True,
        diameter_keys=normalized_media_diameter_keys(value.get("diameter_keys")),
        lengths_mm=normalized_media_lengths(value.get("lengths_mm")),
        sku_specific=value.get("sku_specific") is True,
    )


def normalized_media_id(value: dict[str, Any]) -> str:
    stored = value.get("media_id")
    if isinstance(stored, str) and stored.strip():
        return stored.strip()
    role = value.get("role") if isinstance(value.get("role"), str) else ""
    scope = normalized_media_scope(value)
    return str(uuid5(NAMESPACE_URL, f"dimohod-media:{scope}:{role}:{value['url']}"))


def normalized_media_scope(value: dict[str, Any]) -> str:
    stored = value.get("scope")
    if stored in {"family", "variant", "sku"}:
        return stored
    has_diameters = bool(normalized_media_diameter_keys(value.get("diameter_keys")))
    has_lengths = bool(normalized_media_lengths(value.get("lengths_mm")))
    return "variant" if has_diameters or has_lengths else "family"


def merged_media_scope[T](existing: list[T], incoming: list[T]) -> list[T]:
    """An empty scope means all values, otherwise preserve the union."""
    if not existing or not incoming:
        return []
    return sorted(set(existing) | set(incoming))


def stored_media_content_sha256(item: AdminMediaItem) -> str | None:
    if item.content_sha256:
        return item.content_sha256
    media_path = item.url.split("?", 1)[0]
    if not media_path.startswith("/media/"):
        return None
    storage_root = Path(settings.media_storage_dir).resolve()
    target = (storage_root / media_path.removeprefix("/media/")).resolve()
    if not target.is_relative_to(storage_root) or not target.is_file():
        return None
    try:
        return hashlib.sha256(target.read_bytes()).hexdigest()
    except OSError:
        return None


def normalized_media_diameter_keys(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return sorted(
        {
            item.strip()
            for item in value
            if isinstance(item, str) and item.strip() and len(item.strip()) <= 32
        }
    )


def normalized_media_lengths(value: Any) -> list[int]:
    if not isinstance(value, list):
        return []
    return sorted(
        {
            item
            for item in value
            if isinstance(item, int) and not isinstance(item, bool) and 0 <= item <= 100000
        }
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
            item = item.model_copy(update={"scope": "sku", "sku_specific": True})
            media = [existing for existing in media if existing.role != item.role]
            media.append(item)

    if not any(item.role == "general" for item in media):
        legacy = normalize_media_item((attributes or {}).get(SKU_PHOTO_KEY))
        if legacy is not None:
            media.insert(0, legacy.model_copy(update={"role": "general", "scope": "sku", "sku_specific": True}))

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


def canonical_photo_name(file_name: str, role: str | None, media_id: str | None = None) -> str:
    safe_name = safe_asset_name(file_name)
    canonical_stem = PHOTO_ROLE_FILENAMES.get(role or "")
    if canonical_stem and media_id:
        canonical_stem = f"{canonical_stem}-{media_id[:8]}"
    return f"{canonical_stem}{Path(safe_name).suffix}" if canonical_stem else safe_name


def canonical_sku_photo_name(file_name: str, role: str | None) -> tuple[str, str]:
    normalized_role = role if role in SKU_PHOTO_ROLE_FILENAMES else "general"
    safe_name = safe_asset_name(file_name)
    return f"{SKU_PHOTO_ROLE_FILENAMES[normalized_role]}{Path(safe_name).suffix}", normalized_role


def resolve_product_media(
    product_extra_attributes: dict[str, Any] | None,
    category_extra_attributes: dict[str, Any] | None,
    *,
    inspect_content: bool = False,
) -> list[AdminMediaItem]:
    """Logical Product owns form-factor media; Category media is legacy fallback only."""
    if isinstance((product_extra_attributes or {}).get(MEDIA_KEY), list):
        return normalize_media_list(product_extra_attributes, inspect_content=inspect_content)
    return normalize_media_list(category_extra_attributes, inspect_content=inspect_content)


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


def encode_uploaded_photo(content: bytes) -> EncodedCatalogImage:
    validate_photo_content(content)
    try:
        return encode_catalog_image(content)
    except CatalogImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


def media_url(path: Path) -> str:
    relative = path.relative_to(Path(settings.media_storage_dir))
    return f"/media/{relative.as_posix()}?v={path.stat().st_mtime_ns}"


def stored_image_fields(stored: StoredCatalogImage) -> dict[str, object]:
    return {
        "url": media_url(stored.path),
        "thumbnail_url": media_url(stored.thumbnail_path),
        "width": stored.width,
        "height": stored.height,
        "file_name": stored.path.name,
        "content_sha256": stored.content_sha256,
    }


def product_to_admin_read(product: Product) -> AdminProductRead:
    media = resolve_product_media(
        product.extra_attributes,
        product.category.extra_attributes,
        inspect_content=True,
    )
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
    single_wall_context = product_has_single_wall_context(product)
    values = payload.model_dump(exclude_unset=True)
    for field in ("short_description", "description"):
        if field in values:
            setattr(
                product,
                field,
                remove_single_wall_outdoor_seo_rule(
                    values[field],
                    single_wall_context=single_wall_context,
                ),
            )

    extra_attributes = dict(product.extra_attributes or {})
    for field in ("seo_title", "seo_description"):
        if field not in values:
            continue
        value = remove_single_wall_outdoor_seo_rule(
            values[field],
            single_wall_context=single_wall_context,
        )
        if value:
            extra_attributes[field] = value
        else:
            extra_attributes.pop(field, None)
    if "seo_knowledge" in values:
        knowledge = values["seo_knowledge"]
        if knowledge is None:
            extra_attributes.pop(SEO_KNOWLEDGE_KEY, None)
        else:
            extra_attributes[SEO_KNOWLEDGE_KEY] = sanitize_seo_knowledge_payload(
                AdminSEOProductKnowledge.model_validate(knowledge),
                single_wall_context=single_wall_context,
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
    values = payload.model_dump()
    values["attributes"] = sanitize_sku_seo_attributes(
        values["attributes"],
        single_wall_context=is_single_wall_contour(values.get("contour")),
    )
    sku = SKU(product_id=product_id, **values)
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

    values = payload.model_dump(exclude_unset=True)
    resulting_contour = values.get("contour", sku.contour)
    for field, value in values.items():
        if field == "attributes" and isinstance(value, dict):
            value = sanitize_sku_seo_attributes(
                value,
                single_wall_context=is_single_wall_contour(resulting_contour),
            )
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
        scope=payload.scope,
        diameter_keys=payload.diameter_keys,
        lengths_mm=payload.lengths_mm,
    )


async def attach_product_photo_content(
    session: AsyncSession,
    product_id: UUID,
    *,
    file_name: str,
    content: bytes,
    alt: str | None,
    role: str | None,
    scope: str | None = None,
    diameter_keys: list[str] | None = None,
    lengths_mm: list[int] | None = None,
) -> AdminProductRead:
    product = await get_admin_product(session, product_id)
    encoded = encode_uploaded_photo(content)

    geometry_family = (product.extra_attributes or {}).get("geometry_family")
    storage_key = safe_storage_key(geometry_family if isinstance(geometry_family, str) else product.slug)
    product_dir = Path(settings.media_storage_dir) / "catalog" / "categories" / storage_key
    product_dir.mkdir(parents=True, exist_ok=True)

    # First write also migrates any legacy category-level media into this form-factor.
    media = resolve_product_media(
        product.extra_attributes,
        product.category.extra_attributes,
        inspect_content=True,
    )
    normalized_scope = scope if scope in {"family", "variant"} else (
        "variant" if diameter_keys or lengths_mm else "family"
    )
    if normalized_scope == "variant" and not (
        normalized_media_diameter_keys(diameter_keys) or normalized_media_lengths(lengths_mm)
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Variant photo requires at least one diameter or length",
        )
    content_sha256 = encoded.content_sha256
    duplicate_index = next(
        (
            index
            for index, item in enumerate(media)
            if item.scope == normalized_scope
            and item.role == role
            and stored_media_content_sha256(item) == content_sha256
        ),
        None,
    )
    if duplicate_index is not None:
        existing = media[duplicate_index]
        updated_media = existing.model_copy(
            update={
                "alt": alt or existing.alt,
                "content_sha256": content_sha256,
                "diameter_keys": merged_media_scope(
                    existing.diameter_keys,
                    normalized_media_diameter_keys(diameter_keys),
                ),
                "lengths_mm": merged_media_scope(
                    existing.lengths_mm,
                    normalized_media_lengths(lengths_mm),
                ),
            }
        )
        if normalized_scope == "family":
            media = [
                item
                for index, item in enumerate(media)
                if index == duplicate_index or not (item.scope == "family" and item.role == role)
            ]
            duplicate_index = next(index for index, item in enumerate(media) if item.media_id == existing.media_id)
        media[duplicate_index] = updated_media
        product.extra_attributes = {
            **(product.extra_attributes or {}),
            MEDIA_KEY: [item.model_dump(exclude_none=True) for item in media],
        }
        await session.commit()
        return product_to_admin_read(await get_admin_product(session, product_id))

    media_id = str(uuid4())
    file_name = canonical_photo_name(file_name, role, media_id)
    stored = store_encoded_catalog_image(encoded, product_dir, file_name)
    stored_fields = stored_image_fields(stored)
    media_item = AdminMediaItem(
        media_id=media_id,
        scope=normalized_scope,
        alt=alt,
        role=role,
        diameter_keys=normalized_media_diameter_keys(diameter_keys),
        lengths_mm=normalized_media_lengths(lengths_mm),
        **stored_fields,
    )
    if normalized_scope == "family":
        media = [item for item in media if not (item.scope == "family" and item.role == role)]
    media.append(media_item)

    product.extra_attributes = {
        **(product.extra_attributes or {}),
        MEDIA_KEY: [item.model_dump(exclude_none=True) for item in media],
    }
    await session.commit()
    return product_to_admin_read(await get_admin_product(session, product_id))


async def update_product_photo_scope(
    session: AsyncSession,
    product_id: UUID,
    photo_key: str,
    *,
    diameter_keys: list[str],
    lengths_mm: list[int],
) -> AdminProductRead:
    photo_key = str(photo_key)
    product = await get_admin_product(session, product_id)
    media = resolve_product_media(
        product.extra_attributes,
        product.category.extra_attributes,
        inspect_content=True,
    )
    photo_index = next(
        (index for index, item in enumerate(media) if item.media_id == photo_key),
        None,
    )
    if photo_index is None and photo_key.isdigit():
        legacy_index = int(photo_key)
        photo_index = legacy_index if 0 <= legacy_index < len(media) else None
    if photo_index is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
    media[photo_index] = media[photo_index].model_copy(
        update={
            "diameter_keys": normalized_media_diameter_keys(diameter_keys),
            "lengths_mm": normalized_media_lengths(lengths_mm),
        }
    )
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
    encoded = encode_uploaded_photo(content)
    file_name = "category-cover.webp"
    category_dir = Path(settings.media_storage_dir) / "catalog" / "category-covers" / safe_storage_key(category.slug)
    category_dir.mkdir(parents=True, exist_ok=True)
    stored = store_encoded_catalog_image(encoded, category_dir, file_name)
    media_item = AdminMediaItem(
        alt=payload.alt,
        role="category-cover",
        **stored_image_fields(stored),
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
    encoded = encode_uploaded_photo(content)
    file_name, role = canonical_sku_photo_name(payload.file_name, payload.role)
    sku_dir = Path(settings.media_storage_dir) / "catalog" / "skus" / safe_storage_key(sku.article)
    sku_dir.mkdir(parents=True, exist_ok=True)
    stored = store_encoded_catalog_image(encoded, sku_dir, file_name)
    lengths_mm = normalized_media_lengths(payload.lengths_mm)
    if not lengths_mm and sku.length_mm is not None:
        lengths_mm = [sku.length_mm]
    media_item = AdminMediaItem(
        alt=payload.alt,
        role=role,
        diameter_specific=payload.diameter_specific,
        lengths_mm=lengths_mm,
        sku_specific=True,
        scope="sku",
        **stored_image_fields(stored),
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


async def delete_product_photo(session: AsyncSession, product_id: UUID, photo_key: str) -> AdminProductRead:
    photo_key = str(photo_key)
    product = await get_admin_product(session, product_id)
    media = normalize_media_list(product.extra_attributes, inspect_content=True)
    if not media:
        media = normalize_media_list(product.category.extra_attributes, inspect_content=True)

    resolved_index = next(
        (index for index, item in enumerate(media) if item.media_id == photo_key),
        None,
    )
    if resolved_index is None and photo_key.isdigit():
        legacy_index = int(photo_key)
        resolved_index = legacy_index if 0 <= legacy_index < len(media) else None
    if resolved_index is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    media.pop(resolved_index)
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
