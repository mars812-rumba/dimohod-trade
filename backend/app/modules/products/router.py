from decimal import Decimal, InvalidOperation
from time import perf_counter
from urllib.parse import parse_qs, urlparse

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.price_section_attributes import outer_pipe_attributes
from app.db.steel_selection_profiles import with_steel_selection_profile
from app.modules.compatibility.service import (
    context_from_product_sku,
    evaluate_rules,
    list_active_rules,
)
from app.modules.products.schemas import (
    CompatibleProductItem,
    ProductFilterOption,
    ProductFiltersResponse,
    ProductKindFilter,
    ProductListItem,
    ProductListResponse,
    ProductMediaItem,
    ProductRead,
    ProductSeoPage,
    ProductVariantCombination,
)
from app.modules.products.models import Product, SKU
from app.modules.products.content import (
    RETIRED_SINGLE_WALL_RULE_CODE,
    is_single_wall_contour,
    remove_single_wall_placement_rule,
    sanitize_seo_knowledge_dict,
    sanitize_sku_seo_dict,
)
from app.modules.products.display_attributes import public_sku_display_attributes
from app.modules.products.service import (
    compatible_product_matches,
    get_product_by_slug,
    get_product_sku_by_key,
    list_compatible_product_skus,
    list_product_kind_filters,
    list_product_seo_pages,
    list_products,
    list_variant_filter_options,
    material_group,
    normalized_compatible_product_ids,
    variant_preservation_score,
)

router = APIRouter()

PRODUCT_KIND_LABELS = {
    "труба": "Трубы",
    "отвод": "Отводы",
    "тройник": "Тройники",
    "четверник": "Четверники",
    "шибер": "Шиберы",
    "ревизия": "Ревизии",
    "конденсатоотвод": "Конденсатоотводы",
    "заглушка": "Заглушки",
    "крепеж": "Крепеж",
    "оголовок": "Оголовки",
    "проходной_узел": "Проходные узлы",
    "декоративная_юбка": "Декоративные юбки",
    "фланец": "Фланцы",
    "консоль": "Консоли",
    "опорная_площадка": "Опорные площадки",
    "изоляция": "Изоляция",
}


def primary_product_image(
    extra_attributes: dict[str, object] | None,
    target_sku: SKU | None = None,
) -> ProductMediaItem | None:
    raw_media = (extra_attributes or {}).get("media")
    if not isinstance(raw_media, list):
        return None
    valid_media = [
        item for item in raw_media if isinstance(item, dict) and isinstance(item.get("url"), str)
    ]
    if not valid_media:
        return None
    applicable_media = [
        item for item in valid_media if product_image_applies_to_sku(item, target_sku)
    ]
    if not applicable_media:
        return None
    general_media = [item for item in applicable_media if item.get("role") == "general"]
    value = max(
        enumerate(general_media),
        key=lambda pair: (product_image_specificity(pair[1]), pair[0]),
        default=(0, None),
    )[1]
    if value is None:
        return None
    return ProductMediaItem(
        media_id=value.get("media_id") if isinstance(value.get("media_id"), str) else None,
        scope=value.get("scope") if isinstance(value.get("scope"), str) else None,
        url=value["url"],
        thumbnail_url=value.get("thumbnail_url")
        if isinstance(value.get("thumbnail_url"), str)
        else None,
        width=value.get("width") if isinstance(value.get("width"), int) else None,
        height=value.get("height") if isinstance(value.get("height"), int) else None,
        alt=value.get("alt") if isinstance(value.get("alt"), str) else None,
        role=value.get("role") if isinstance(value.get("role"), str) else None,
        diameter_specific=value.get("diameter_specific") is True,
        diameter_keys=media_diameter_keys(value.get("diameter_keys")),
        lengths_mm=media_lengths(value.get("lengths_mm")),
        sku_specific=value.get("sku_specific") is True,
    )


def primary_sku_image(attributes: dict[str, object] | None) -> ProductMediaItem | None:
    values = attributes or {}
    raw_media = values.get("sku_media")
    if isinstance(raw_media, list):
        value = next(
            (
                item
                for item in raw_media
                if isinstance(item, dict)
                and isinstance(item.get("url"), str)
                and item.get("role") == "general"
            ),
            None,
        )
        if value is not None:
            return ProductMediaItem(
                media_id=value.get("media_id") if isinstance(value.get("media_id"), str) else None,
                scope=value.get("scope") if isinstance(value.get("scope"), str) else "sku",
                url=value["url"],
                thumbnail_url=value.get("thumbnail_url")
                if isinstance(value.get("thumbnail_url"), str)
                else None,
                width=value.get("width") if isinstance(value.get("width"), int) else None,
                height=value.get("height") if isinstance(value.get("height"), int) else None,
                alt=value.get("alt") if isinstance(value.get("alt"), str) else None,
                role=value.get("role") if isinstance(value.get("role"), str) else "general",
                diameter_specific=value.get("diameter_specific") is True,
                diameter_keys=media_diameter_keys(value.get("diameter_keys")),
                lengths_mm=media_lengths(value.get("lengths_mm")),
                sku_specific=value.get("sku_specific") is True,
            )
        if raw_media:
            return None

    legacy = values.get("sku_photo")
    if isinstance(legacy, dict) and isinstance(legacy.get("url"), str):
        return ProductMediaItem(
            media_id=legacy.get("media_id") if isinstance(legacy.get("media_id"), str) else None,
            scope=legacy.get("scope") if isinstance(legacy.get("scope"), str) else "sku",
            url=legacy["url"],
            thumbnail_url=legacy.get("thumbnail_url")
            if isinstance(legacy.get("thumbnail_url"), str)
            else None,
            width=legacy.get("width") if isinstance(legacy.get("width"), int) else None,
            height=legacy.get("height") if isinstance(legacy.get("height"), int) else None,
            alt=legacy.get("alt") if isinstance(legacy.get("alt"), str) else None,
            role="general",
            diameter_specific=legacy.get("diameter_specific") is True,
            diameter_keys=media_diameter_keys(legacy.get("diameter_keys")),
            lengths_mm=media_lengths(legacy.get("lengths_mm")),
            sku_specific=legacy.get("sku_specific") is True,
        )
    return None


def media_lengths(value: object) -> list[int]:
    if not isinstance(value, list):
        return []
    return sorted(
        {
            item
            for item in value
            if isinstance(item, int) and not isinstance(item, bool) and 0 <= item <= 100000
        }
    )


def media_diameter_keys(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return sorted(
        {
            item.strip()
            for item in value
            if isinstance(item, str) and item.strip() and len(item.strip()) <= 32
        }
    )


def sku_diameter_key(sku: SKU) -> str | None:
    if sku.diameter_mm is None:
        return None
    return (
        f"{sku.diameter_mm}/{sku.outer_diameter_mm}"
        if sku.outer_diameter_mm is not None
        else str(sku.diameter_mm)
    )


def product_image_applies_to_sku(image: dict[str, object], target_sku: SKU | None) -> bool:
    if target_sku is None:
        return True
    diameter_keys = media_diameter_keys(image.get("diameter_keys"))
    lengths = media_lengths(image.get("lengths_mm"))
    return (
        (not diameter_keys or sku_diameter_key(target_sku) in diameter_keys)
        and (not lengths or target_sku.length_mm in lengths)
    )


def product_image_specificity(image: dict[str, object]) -> int:
    return int(bool(media_diameter_keys(image.get("diameter_keys")))) + int(
        bool(media_lengths(image.get("lengths_mm")))
    )


def same_visual_sku(left: SKU, right: SKU) -> bool:
    return material_group(left.material) == material_group(right.material)


def image_applies_to_sku(image: ProductMediaItem, owner_sku: SKU, target_sku: SKU) -> bool:
    return owner_sku.id == target_sku.id


def primary_visual_sku_image(
    representative_sku: SKU | None,
    product_skus: list[SKU],
) -> ProductMediaItem | None:
    if representative_sku is None:
        return None
    visual_skus = [
        sku
        for sku in product_skus
        if sku.is_active and same_visual_sku(sku, representative_sku)
    ]
    images = [
        (image, sku)
        for sku in visual_skus
        if (image := primary_sku_image(sku.attributes)) is not None
        and image_applies_to_sku(image, sku, representative_sku)
    ]
    if not images:
        return None

    def version(image: ProductMediaItem) -> int:
        raw_version = parse_qs(urlparse(image.url).query).get("v", ["0"])[0]
        try:
            return int(raw_version)
        except (TypeError, ValueError):
            return 0

    image, _owner = max(
        images,
        key=lambda item: (
            1 if item[0].sku_specific else 0,
            1 if item[0].diameter_specific else 0,
            version(item[0]),
        ),
    )
    return image


def public_sku_media_attributes(attributes: dict[str, object] | None) -> dict[str, object]:
    values = attributes or {}
    return {
        key: value
        for key in ("sku_photo", "sku_media", "sku_seo")
        if (value := values.get(key))
    }


def parse_diameter_filter(value: str | None) -> tuple[int | None, int | None]:
    if not value:
        return None, None
    try:
        diameter, separator, outer_diameter = value.partition(":")
        return (
            int(diameter) if diameter else None,
            int(outer_diameter) if separator and outer_diameter else None,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid diameter filter",
        ) from exc


def sku_matches_filters(
    sku,
    *,
    diameter_mm: int | None,
    outer_diameter_mm: int | None,
    steel_grade: str | None,
    material: str | None,
    outer_steel_grade: str | None,
    outer_material: str | None,
    length_mm: int | None,
    wall_thickness_mm: Decimal | None,
    outer_wall_thickness_mm: Decimal | None,
    angle_deg: int | None,
    insulation_mm: int | None,
    contour: str | None,
    base_size: str | None = None,
) -> bool:
    return (
        sku.is_active
        and (diameter_mm is None or sku.diameter_mm == diameter_mm)
        and (outer_diameter_mm is None or sku.outer_diameter_mm == outer_diameter_mm)
        and (steel_grade is None or sku.steel_grade == steel_grade)
        and (material is None or material_group(sku.material) == material)
        and (
            outer_steel_grade is None
            or (sku.attributes or {}).get("outer_steel_grade") == outer_steel_grade
        )
        and (
            outer_material is None
            or material_group((sku.attributes or {}).get("outer_material")) == outer_material
        )
        and (length_mm is None or sku.length_mm == length_mm)
        and (wall_thickness_mm is None or sku.wall_thickness_mm == wall_thickness_mm)
        and (
            outer_wall_thickness_mm is None
            or _decimal_attribute((sku.attributes or {}).get("outer_wall_thickness_mm"))
            == outer_wall_thickness_mm
        )
        and (angle_deg is None or sku.angle_deg == angle_deg)
        and (insulation_mm is None or sku.insulation_mm == insulation_mm)
        and (contour is None or (sku.contour or "").casefold().strip() == contour.casefold().strip())
        and (base_size is None or (sku.attributes or {}).get("base_size") == base_size)
    )


def _decimal_attribute(value: object) -> Decimal | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _text_attribute(value: object) -> str | None:
    return value if isinstance(value, str) and value.strip() else None


def public_attributes_for_sku(product: Product, sku: SKU) -> dict[str, object]:
    return public_sku_display_attributes(
        with_steel_selection_profile(
            sku.attributes,
            steel_grade=sku.steel_grade,
            product_kind=product.product_kind,
            contour=sku.contour,
        )
    )


def select_active_sku(
    product: Product,
    sku_key: str | None,
    *,
    strict: bool = False,
    diameter_mm: int | None = None,
    outer_diameter_mm: int | None = None,
) -> SKU | None:
    active_skus = [sku for sku in product.skus if sku.is_active]
    if sku_key:
        selected = next(
            (
                sku
                for sku in active_skus
                if str(sku.id) == sku_key or sku.slug == sku_key or sku.article == sku_key
            ),
            None,
        )
        if selected is not None:
            return selected
        if strict:
            return None
    if diameter_mm is not None:
        selected = next(
            (
                sku
                for sku in active_skus
                if (
                    sku.diameter_mm == diameter_mm
                    or (
                        outer_diameter_mm is None
                        and sku.diameter_mm is None
                        and sku.outer_diameter_mm == diameter_mm
                    )
                )
                and (outer_diameter_mm is None or sku.outer_diameter_mm == outer_diameter_mm)
            ),
            None,
        )
        if selected is not None:
            return selected
    return active_skus[0] if active_skus else None


async def compatible_items_for_sku(
    session: AsyncSession,
    product: Product,
    source_sku: SKU,
) -> list[CompatibleProductItem]:
    allowed_product_ids = normalized_compatible_product_ids(product.extra_attributes)
    compatible_items = await list_compatible_product_skus(
        session,
        [source_sku],
        exclude_product_id=product.id,
        allowed_product_ids=allowed_product_ids,
    )
    compatible_items.sort(
        key=lambda item: (
            -variant_preservation_score(source_sku, item[0]),
            item[1].name,
            item[0].article,
        )
    )
    return [
        CompatibleProductItem(
            source_sku_id=source_sku.id,
            product_id=target_product.id,
            product_name=target_product.name,
            product_slug=target_product.slug,
            product_kind=target_product.product_kind,
            purpose=target_product.purpose,
            short_description=remove_single_wall_placement_rule(
                target_product.short_description,
                single_wall_context=is_single_wall_contour(target_sku.contour),
            ),
            sku_id=target_sku.id,
            sku_key=target_sku.article,
            article=target_sku.article,
            name=target_sku.name,
            length_mm=target_sku.length_mm,
            diameter_mm=target_sku.diameter_mm,
            outer_diameter_mm=target_sku.outer_diameter_mm,
            insulation_mm=target_sku.insulation_mm,
            steel_grade=target_sku.steel_grade,
            material=target_sku.material,
            wall_thickness_mm=target_sku.wall_thickness_mm,
            outer_material=_text_attribute(
                outer_pipe_attributes(target_sku.attributes).get("outer_material")
            ),
            outer_steel_grade=_text_attribute(
                outer_pipe_attributes(target_sku.attributes).get("outer_steel_grade")
            ),
            outer_wall_thickness_mm=_decimal_attribute(
                outer_pipe_attributes(target_sku.attributes).get("outer_wall_thickness_mm")
            ),
            price_rub=target_sku.price_rub,
            stock_status=target_sku.stock_status,
            primary_image=primary_product_image(target_product.extra_attributes, target_sku),
        )
        for target_sku, target_product in compatible_items
        if compatible_product_matches(
            source_sku,
            target_product,
            target_sku,
            explicitly_selected=allowed_product_ids is not None,
        )
    ]


@router.get("", response_model=ProductListResponse)
async def read_products(
    limit: int = Query(default=48, ge=1, le=96),
    offset: int = Query(default=0, ge=0),
    product_kind: str | None = Query(default=None, min_length=1, max_length=64),
    category: str | None = Query(default=None, min_length=1, max_length=180),
    q: str | None = Query(default=None, min_length=1, max_length=120),
    diameter: str | None = Query(default=None, pattern=r"^(?:\d+:\d*|\d*:\d+)$"),
    steel_grade: str | None = Query(default=None, min_length=1, max_length=32),
    material: str | None = Query(default=None, min_length=1, max_length=32),
    outer_steel_grade: str | None = Query(default=None, min_length=1, max_length=32),
    outer_material: str | None = Query(default=None, min_length=1, max_length=32),
    length_mm: int | None = Query(default=None, ge=0, le=100000),
    wall_thickness_mm: Decimal | None = Query(default=None, ge=0, le=100),
    outer_wall_thickness_mm: Decimal | None = Query(default=None, ge=0, le=100),
    angle_deg: int | None = Query(default=None, ge=0, le=360),
    insulation_mm: int | None = Query(default=None, ge=0, le=10000),
    contour: str | None = Query(default=None, min_length=1, max_length=32),
    base_size: str | None = Query(default=None, min_length=1, max_length=32),
    preferred_diameter: str | None = Query(default=None, pattern=r"^(?:\d+:\d*|\d*:\d+)$"),
    preferred_steel_grade: str | None = Query(default=None, min_length=1, max_length=32),
    preferred_material: str | None = Query(default=None, min_length=1, max_length=32),
    preferred_outer_steel_grade: str | None = Query(default=None, min_length=1, max_length=32),
    preferred_outer_material: str | None = Query(default=None, min_length=1, max_length=32),
    session: AsyncSession = Depends(get_db),
) -> ProductListResponse:
    diameter_mm, outer_diameter_mm = parse_diameter_filter(diameter)
    preferred_diameter_mm, preferred_outer_diameter_mm = parse_diameter_filter(preferred_diameter)
    products, total = await list_products(
        session,
        limit=limit,
        offset=offset,
        product_kind=product_kind,
        category_slug=category,
        search=q,
        diameter_mm=diameter_mm,
        outer_diameter_mm=outer_diameter_mm,
        steel_grade=steel_grade,
        material=material,
        outer_steel_grade=outer_steel_grade,
        outer_material=outer_material,
        length_mm=length_mm,
        wall_thickness_mm=wall_thickness_mm,
        outer_wall_thickness_mm=outer_wall_thickness_mm,
        angle_deg=angle_deg,
        insulation_mm=insulation_mm,
        contour=contour,
        base_size=base_size,
    )
    items: list[ProductListItem] = []

    for product in products:
        active_skus = [
            sku
            for sku in product.skus
            if sku_matches_filters(
                sku,
                diameter_mm=diameter_mm,
                outer_diameter_mm=outer_diameter_mm,
                steel_grade=steel_grade,
                material=material,
                outer_steel_grade=outer_steel_grade,
                outer_material=outer_material,
                length_mm=length_mm,
                wall_thickness_mm=wall_thickness_mm,
                outer_wall_thickness_mm=outer_wall_thickness_mm,
                angle_deg=angle_deg,
                insulation_mm=insulation_mm,
                contour=contour,
                base_size=base_size,
            )
        ]
        preferred_skus = [
            sku
            for sku in active_skus
            if sku_matches_filters(
                sku,
                diameter_mm=preferred_diameter_mm,
                outer_diameter_mm=preferred_outer_diameter_mm,
                steel_grade=preferred_steel_grade,
                material=preferred_material,
                outer_steel_grade=preferred_outer_steel_grade,
                outer_material=preferred_outer_material,
                length_mm=None,
                wall_thickness_mm=None,
                outer_wall_thickness_mm=None,
                angle_deg=None,
                insulation_mm=None,
                contour=None,
                base_size=None,
            )
        ]
        representative_pool = preferred_skus or active_skus
        prices = [sku.price_rub for sku in representative_pool if sku.price_rub is not None]
        price_rub: Decimal | None = min(prices) if prices else None
        representative_sku = next(
            (sku for sku in representative_pool if sku.price_rub == price_rub),
            None,
        )
        if representative_sku is None and active_skus:
            representative_sku = representative_pool[0]
        product_outer_diameter_mm = product.extra_attributes.get("outer_diameter_mm")
        if not isinstance(product_outer_diameter_mm, int):
            product_outer_diameter_mm = None
        items.append(
            ProductListItem(
                id=product.id,
                category=product.category,
                name=product.name,
                slug=product.slug,
                article=representative_sku.article if representative_sku else None,
                material=(representative_sku.material if representative_sku else None)
                or product.material,
                steel_grade=(representative_sku.steel_grade if representative_sku else None)
                or product.steel_grade,
                wall_thickness_mm=(
                    representative_sku.wall_thickness_mm if representative_sku else None
                )
                or product.wall_thickness_mm,
                diameter_mm=(representative_sku.diameter_mm if representative_sku else None)
                or product.diameter_mm,
                outer_diameter_mm=(
                    representative_sku.outer_diameter_mm if representative_sku else None
                )
                or product_outer_diameter_mm,
                contour=(representative_sku.contour if representative_sku else None) or product.contour,
                insulation_mm=(
                    representative_sku.insulation_mm
                    if representative_sku and representative_sku.insulation_mm is not None
                    else product.insulation_mm
                ),
                length_mm=representative_sku.length_mm if representative_sku else None,
                angle_deg=representative_sku.angle_deg if representative_sku else None,
                stock_status=representative_sku.stock_status if representative_sku else None,
                attributes=public_attributes_for_sku(product, representative_sku)
                if representative_sku
                else {},
                product_kind=product.product_kind,
                primary_image=primary_visual_sku_image(representative_sku, product.skus)
                or primary_product_image(product.extra_attributes, representative_sku),
                price_rub=price_rub,
                sku_count=len(active_skus),
                selected_sku=representative_sku.article
                if representative_sku
                else None,
            )
        )

    return ProductListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/filters", response_model=ProductFiltersResponse)
async def read_product_filters(
    category: str | None = Query(default=None, min_length=1, max_length=180),
    session: AsyncSession = Depends(get_db),
) -> ProductFiltersResponse:
    product_kinds = await list_product_kind_filters(session)
    variant_filters = await list_variant_filter_options(session, category_slug=category)
    return ProductFiltersResponse(
        product_kinds=[
            ProductKindFilter(
                value=value,
                label=PRODUCT_KIND_LABELS.get(value, value.capitalize()),
                count=count,
            )
            for value, count in product_kinds
        ],
        diameters=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["diameters"]
        ],
        steel_grades=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["steel_grades"]
        ],
        materials=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["materials"]
        ],
        outer_steel_grades=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["outer_steel_grades"]
        ],
        outer_materials=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["outer_materials"]
        ],
        inner_pipes=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["inner_pipes"]
        ],
        outer_pipes=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["outer_pipes"]
        ],
        variant_combinations=[
            ProductVariantCombination(
                diameter=diameter,
                inner_pipe=inner_pipe,
                inner_thickness=inner_thickness,
                outer_pipe=outer_pipe,
                count=count,
            )
            for diameter, inner_pipe, inner_thickness, outer_pipe, count in variant_filters[
                "variant_combinations"
            ]
        ],
        executions=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["executions"]
        ],
        lengths=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["lengths"]
        ],
        wall_thicknesses=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["wall_thicknesses"]
        ],
        outer_wall_thicknesses=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["outer_wall_thicknesses"]
        ],
        angles=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["angles"]
        ],
        insulations=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["insulations"]
        ],
        contours=[
            ProductFilterOption(value=value, label=label, count=count)
            for value, label, count in variant_filters["contours"]
        ],
    )


@router.get("/seo-pages", response_model=list[ProductSeoPage])
async def read_product_seo_pages(
    session: AsyncSession = Depends(get_db),
) -> list[ProductSeoPage]:
    pages = await list_product_seo_pages(session)
    return [
        ProductSeoPage(
            product_slug=slug,
            diameter_mm=diameter_mm,
            outer_diameter_mm=outer_diameter_mm,
        )
        for slug, diameter_mm, outer_diameter_mm in pages
    ]


@router.get("/{slug}", response_model=ProductRead)
async def read_product(
    slug: str,
    response: Response,
    sku: str | None = Query(default=None, min_length=1, max_length=240),
    diameter: str | None = Query(default=None, pattern=r"^(?:\d+:\d*|\d*:\d+)$"),
    include_compatible: bool = Query(default=True),
    session: AsyncSession = Depends(get_db),
) -> ProductRead:
    started_at = perf_counter()
    product = await get_product_by_slug(session, slug)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product_loaded_at = perf_counter()

    diameter_mm, outer_diameter_mm = parse_diameter_filter(diameter)
    source_sku = select_active_sku(
        product,
        sku,
        diameter_mm=diameter_mm,
        outer_diameter_mm=outer_diameter_mm,
    )
    product_read = ProductRead.model_validate(product)
    sku_by_id = {sku.id: sku for sku in product.skus}
    product_read.skus = [
        sku_read for sku_read in product_read.skus if sku_by_id[sku_read.id].is_active
    ]

    for sku_read in product_read.skus:
        sku_model = sku_by_id.get(sku_read.id)
        if sku_model is None:
            continue
        sku_read.attributes = {
            **public_attributes_for_sku(product, sku_model),
            **public_sku_media_attributes(sku_model.attributes),
        }
        raw_sku_seo = sku_read.attributes.get("sku_seo")
        if isinstance(raw_sku_seo, dict):
            sku_read.attributes["sku_seo"] = sanitize_sku_seo_dict(
                raw_sku_seo,
                single_wall_context=is_single_wall_contour(sku_model.contour),
            )

    single_wall_context = is_single_wall_contour(
        source_sku.contour if source_sku is not None else product.contour
    )
    product_read.short_description = remove_single_wall_placement_rule(
        product_read.short_description,
        single_wall_context=single_wall_context,
    )
    product_read.description = remove_single_wall_placement_rule(
        product_read.description,
        single_wall_context=single_wall_context,
    )
    product_read.compatibility_notes = remove_single_wall_placement_rule(
        product_read.compatibility_notes,
        single_wall_context=single_wall_context,
    )
    product_read.purpose = [
        cleaned
        for value in product_read.purpose
        if (
            cleaned := remove_single_wall_placement_rule(
                value,
                single_wall_context=single_wall_context,
            )
        )
    ]
    extra_attributes = dict(product_read.extra_attributes)
    if isinstance(extra_attributes.get("seo_description"), str):
        extra_attributes["seo_description"] = remove_single_wall_placement_rule(
            extra_attributes["seo_description"],
            single_wall_context=single_wall_context,
        )
    if "seo_knowledge" in extra_attributes:
        extra_attributes["seo_knowledge"] = sanitize_seo_knowledge_dict(
            extra_attributes["seo_knowledge"],
            single_wall_context=single_wall_context,
        )
    product_read.extra_attributes = extra_attributes
    product_built_at = perf_counter()

    product_read.compatible_products = (
        await compatible_items_for_sku(session, product, source_sku)
        if source_sku and include_compatible
        else []
    )
    compatibility_built_at = perf_counter()

    if source_sku is not None:
        selected_read = next(
            (sku_read for sku_read in product_read.skus if sku_read.id == source_sku.id),
            None,
        )
        if selected_read is not None:
            rules = await list_active_rules(session)
            selected_read.compatibility_messages = evaluate_rules(
                rules,
                context_from_product_sku(product, source_sku),
            )
            selected_read.compatibility_messages = [
                message
                for message in selected_read.compatibility_messages
                if message.code != RETIRED_SINGLE_WALL_RULE_CODE
            ]
    finished_at = perf_counter()
    response.headers["Server-Timing"] = ", ".join(
        [
            f"product_db;dur={(product_loaded_at - started_at) * 1000:.1f}",
            f"product_build;dur={(product_built_at - product_loaded_at) * 1000:.1f}",
            f"compatibility;dur={(compatibility_built_at - product_built_at) * 1000:.1f}",
            f"rules;dur={(finished_at - compatibility_built_at) * 1000:.1f}",
        ]
    )
    response.headers["X-Product-SKU-Count"] = str(len(product_read.skus))

    return product_read


@router.get("/{slug}/compatible", response_model=list[CompatibleProductItem])
async def read_compatible_products(
    slug: str,
    response: Response,
    sku: str = Query(min_length=1, max_length=240),
    session: AsyncSession = Depends(get_db),
) -> list[CompatibleProductItem]:
    product_sku = await get_product_sku_by_key(
        session,
        product_slug=slug,
        sku_key=sku,
    )
    if product_sku is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SKU not found")
    product, source_sku = product_sku
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    return await compatible_items_for_sku(session, product, source_sku)
