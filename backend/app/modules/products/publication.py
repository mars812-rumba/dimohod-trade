from typing import Any

from app.modules.products.models import Product, SKU


def _has_text(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _int_list(value: object) -> set[int]:
    if not isinstance(value, list):
        return set()
    return {
        item
        for item in value
        if isinstance(item, int) and not isinstance(item, bool) and item >= 0
    }


def _text_list(value: object) -> set[str]:
    if not isinstance(value, list):
        return set()
    return {item.strip() for item in value if isinstance(item, str) and item.strip()}


def _sku_diameter_key(sku: SKU) -> str | None:
    if sku.diameter_mm is None:
        return None
    if sku.outer_diameter_mm is None:
        return str(sku.diameter_mm)
    return f"{sku.diameter_mm}:{sku.outer_diameter_mm}"


def _valid_general_image(value: object) -> bool:
    return (
        isinstance(value, dict)
        and value.get("role") == "general"
        and _has_text(value.get("url"))
    )


def sku_has_own_photo(attributes: dict[str, Any] | None) -> bool:
    values = attributes or {}
    media = values.get("sku_media")
    if isinstance(media, list) and any(_valid_general_image(item) for item in media):
        return True
    legacy = values.get("sku_photo")
    return isinstance(legacy, dict) and _has_text(legacy.get("url"))


def product_has_applicable_photo(product: Product, sku: SKU) -> bool:
    media = (product.extra_attributes or {}).get("media")
    if not isinstance(media, list):
        return False
    diameter_key = _sku_diameter_key(sku)
    for item in media:
        if not _valid_general_image(item):
            continue
        diameter_keys = _text_list(item.get("diameter_keys"))
        lengths = _int_list(item.get("lengths_mm"))
        if diameter_keys and diameter_key not in diameter_keys:
            continue
        if lengths and sku.length_mm not in lengths:
            continue
        return True
    return False


def sku_has_effective_description(product: Product, sku: SKU) -> bool:
    sku_seo = (sku.attributes or {}).get("sku_seo")
    if isinstance(sku_seo, dict) and (
        _has_text(sku_seo.get("short_description"))
        or _has_text(sku_seo.get("description"))
    ):
        return True
    return _has_text(product.short_description) or _has_text(product.description)


def public_sku_ready(product: Product, sku: SKU) -> bool:
    """Return whether a concrete variant is complete enough for the public site."""
    return bool(
        product.is_active
        and sku.is_active
        and sku_has_effective_description(product, sku)
        and (
            sku_has_own_photo(sku.attributes)
            or product_has_applicable_photo(product, sku)
        )
    )
