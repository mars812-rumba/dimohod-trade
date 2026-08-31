from __future__ import annotations

import hashlib
import html
import re
from datetime import UTC, datetime
from decimal import Decimal
from urllib.parse import quote, urlencode, urljoin
from xml.etree import ElementTree as ET

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.modules.products.models import SKU, Product
from app.modules.products.publication import public_sku_ready

TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")


def _plain_text(value: object, *, limit: int) -> str:
    if not isinstance(value, str):
        return ""
    text = html.unescape(TAG_RE.sub(" ", value))
    return SPACE_RE.sub(" ", text).strip()[:limit]


def _sku_seo(sku: SKU, key: str) -> str:
    value = (sku.attributes or {}).get("sku_seo")
    if not isinstance(value, dict):
        return ""
    return _plain_text(value.get(key), limit=3000)


def _category_id(slug: str) -> str:
    """Return a stable positive numeric category ID accepted by Direct."""
    digest = hashlib.sha256(slug.encode("utf-8")).digest()
    return str(int.from_bytes(digest[:8], "big") % 999_999_999_999_999 + 1)


def _absolute_url(base_url: str, value: str) -> str:
    return urljoin(f"{base_url.rstrip('/')}/", value)


def _diameter_suffix(sku: SKU) -> str | None:
    diameter = sku.diameter_mm
    outer = sku.outer_diameter_mm
    if diameter is None and outer is None:
        return None
    if diameter is None or outer is None:
        return f"d{diameter if diameter is not None else outer}"
    return f"d{diameter}-{outer}"


def _product_url(base_url: str, product: Product, sku: SKU) -> str:
    suffix = _diameter_suffix(sku)
    path = f"/product/{quote(product.slug, safe='')}"
    if suffix:
        path = f"{path}-{suffix}"
    query: dict[str, str] = {"sku": sku.article}
    if sku.length_mm is not None:
        query["length"] = str(sku.length_mm)
    return f"{_absolute_url(base_url, path)}?{urlencode(query)}"


def _offer_name(product: Product, sku: SKU) -> str:
    custom_h1 = _sku_seo(sku, "h1")
    if custom_h1:
        return custom_h1[:220]
    return _plain_text(sku.name or product.name, limit=220)


def _offer_description(product: Product, sku: SKU) -> str:
    for value in (
        _sku_seo(sku, "short_description"),
        _sku_seo(sku, "description"),
        product.short_description,
        product.description,
    ):
        text = _plain_text(value, limit=3000)
        if text:
            return text
    return _plain_text(product.name, limit=3000)


def _offer_image(product: Product, sku: SKU) -> str | None:
    attributes = sku.attributes or {}
    media = attributes.get("sku_media")
    if isinstance(media, list):
        for item in media:
            if (
                isinstance(item, dict)
                and item.get("role") == "general"
                and isinstance(item.get("url"), str)
                and item["url"].strip()
            ):
                return item["url"].strip()
    legacy = attributes.get("sku_photo")
    if (
        isinstance(legacy, dict)
        and isinstance(legacy.get("url"), str)
        and legacy["url"].strip()
    ):
        return legacy["url"].strip()

    raw_media = (product.extra_attributes or {}).get("media")
    if not isinstance(raw_media, list):
        return None
    diameter_keys_for_sku = {str(sku.diameter_mm)}
    if sku.outer_diameter_mm is not None:
        diameter_keys_for_sku = {
            f"{sku.diameter_mm}/{sku.outer_diameter_mm}",
            f"{sku.diameter_mm}:{sku.outer_diameter_mm}",
        }
    candidates: list[tuple[int, int, str]] = []
    for index, item in enumerate(raw_media):
        if not isinstance(item, dict) or item.get("role") != "general":
            continue
        url = item.get("url")
        if not isinstance(url, str) or not url.strip():
            continue
        diameter_keys = item.get("diameter_keys")
        lengths = item.get("lengths_mm")
        if (
            isinstance(diameter_keys, list)
            and diameter_keys
            and diameter_keys_for_sku.isdisjoint(diameter_keys)
        ):
            continue
        if isinstance(lengths, list) and lengths and sku.length_mm not in lengths:
            continue
        specificity = int(bool(diameter_keys)) + int(bool(lengths))
        candidates.append((specificity, index, url.strip()))
    return max(candidates, default=(0, 0, None))[2]


def _positive_price(value: Decimal | None) -> bool:
    return value is not None and value > 0


def build_yandex_feed(
    products: list[Product],
    *,
    base_url: str,
    generated_at: datetime | None = None,
) -> bytes:
    now = generated_at or datetime.now(UTC)
    root = ET.Element("yml_catalog", {"date": now.strftime("%Y-%m-%d %H:%M")})
    shop = ET.SubElement(root, "shop")
    ET.SubElement(shop, "name").text = "Дымоход Трейд"
    ET.SubElement(shop, "company").text = "Дымоход Трейд"
    ET.SubElement(shop, "url").text = base_url.rstrip("/")

    currencies = ET.SubElement(shop, "currencies")
    ET.SubElement(currencies, "currency", {"id": "RUR", "rate": "1"})

    publishable: list[tuple[Product, SKU, str]] = []
    categories: dict[str, tuple[str, str]] = {}
    for product in products:
        category = product.category
        if not category or not category.is_active:
            continue
        for sku in product.skus:
            if not public_sku_ready(product, sku) or not _positive_price(sku.price_rub):
                continue
            image = _offer_image(product, sku)
            if not image:
                continue
            publishable.append((product, sku, image))
            categories[category.slug] = (_category_id(category.slug), category.name)

    categories_node = ET.SubElement(shop, "categories")
    for slug, (category_id, name) in sorted(categories.items()):
        ET.SubElement(categories_node, "category", {"id": category_id}).text = name

    offers = ET.SubElement(shop, "offers")
    for product, sku, image in sorted(publishable, key=lambda item: item[1].article):
        offer = ET.SubElement(offers, "offer", {"id": sku.article})
        ET.SubElement(offer, "name").text = _offer_name(product, sku)
        ET.SubElement(offer, "url").text = _product_url(base_url, product, sku)
        ET.SubElement(offer, "price").text = format(sku.price_rub, "f")
        ET.SubElement(offer, "currencyId").text = "RUR"
        ET.SubElement(offer, "categoryId").text = categories[product.category.slug][0]
        ET.SubElement(offer, "picture").text = _absolute_url(base_url, image)
        if product.brand:
            ET.SubElement(offer, "vendor").text = _plain_text(product.brand, limit=120)
        ET.SubElement(offer, "vendorCode").text = sku.article
        ET.SubElement(offer, "description").text = _offer_description(product, sku)

    ET.indent(root, space="  ")
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


async def load_yandex_feed_products(session: AsyncSession) -> list[Product]:
    result = await session.execute(
        select(Product)
        .where(Product.is_active.is_(True))
        .options(joinedload(Product.category), selectinload(Product.skus))
        .order_by(Product.slug)
    )
    return list(result.scalars().unique())
