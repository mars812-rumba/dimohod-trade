from dataclasses import dataclass
from typing import Any

from app.modules.products.models import SKU, Product


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
    return {
        item.strip().replace(":", "/")
        for item in value
        if isinstance(item, str) and item.strip()
    }


def _sku_diameter_key(sku: SKU) -> str | None:
    if sku.diameter_mm is None:
        return None
    if sku.outer_diameter_mm is None:
        return str(sku.diameter_mm)
    return f"{sku.diameter_mm}/{sku.outer_diameter_mm}"


def _valid_general_image(value: object) -> bool:
    return (
        isinstance(value, dict)
        and value.get("role") == "general"
        and _has_text(value.get("url"))
    )


@dataclass(frozen=True)
class FamilyPhotoScope:
    """Normalized applicability rules for one public family photo."""

    diameter_keys: frozenset[str]
    lengths_mm: frozenset[int]

    def applies_to(self, sku: SKU) -> bool:
        diameter_key = _sku_diameter_key(sku)
        if self.diameter_keys and diameter_key not in self.diameter_keys:
            return False
        return not self.lengths_mm or sku.length_mm in self.lengths_mm


@dataclass(frozen=True)
class ProductPublicationPolicy:
    """Prepared visibility and content-quality rules for one product family.

    An active Product with an active SKU is a real catalog item and remains
    public even when editorial content or media is incomplete. Media and
    descriptions are still normalized here so the admin can report what needs
    attention without turning missing content into a false 404.
    """

    product_active: bool
    family_has_description: bool
    family_photo_scopes: tuple[FamilyPhotoScope, ...]

    @classmethod
    def from_product(cls, product: Product) -> "ProductPublicationPolicy":
        media = (product.extra_attributes or {}).get("media")
        scopes: list[FamilyPhotoScope] = []
        if isinstance(media, list):
            for item in media:
                if not _valid_general_image(item):
                    continue
                scopes.append(
                    FamilyPhotoScope(
                        diameter_keys=frozenset(_text_list(item.get("diameter_keys"))),
                        lengths_mm=frozenset(_int_list(item.get("lengths_mm"))),
                    )
                )
        return cls(
            product_active=bool(product.is_active),
            family_has_description=(
                _has_text(product.short_description) or _has_text(product.description)
            ),
            family_photo_scopes=tuple(scopes),
        )

    def product_photo_applies_to(self, sku: SKU) -> bool:
        return any(scope.applies_to(sku) for scope in self.family_photo_scopes)

    def sku_has_effective_description(self, sku: SKU) -> bool:
        sku_seo = (sku.attributes or {}).get("sku_seo")
        if isinstance(sku_seo, dict) and (
            _has_text(sku_seo.get("short_description"))
            or _has_text(sku_seo.get("description"))
        ):
            return True
        return self.family_has_description

    def sku_ready(self, sku: SKU) -> bool:
        return bool(self.product_active and sku.is_active)


@dataclass(frozen=True)
class ProductContentQuality:
    active_sku_count: int
    missing_photo_sku_count: int
    missing_description_sku_count: int


def product_content_quality(product: Product) -> ProductContentQuality:
    """Return non-blocking completeness diagnostics for the admin UI."""
    policy = prepare_publication_policy(product)
    active_skus = [sku for sku in product.skus if sku.is_active]
    return ProductContentQuality(
        active_sku_count=len(active_skus),
        missing_photo_sku_count=sum(
            not (
                sku_has_own_photo(sku.attributes)
                or policy.product_photo_applies_to(sku)
            )
            for sku in active_skus
        ),
        missing_description_sku_count=sum(
            not policy.sku_has_effective_description(sku) for sku in active_skus
        ),
    )


def prepare_publication_policy(product: Product) -> ProductPublicationPolicy:
    return ProductPublicationPolicy.from_product(product)


def sku_has_own_photo(attributes: dict[str, Any] | None) -> bool:
    values = attributes or {}
    media = values.get("sku_media")
    if isinstance(media, list) and any(_valid_general_image(item) for item in media):
        return True
    legacy = values.get("sku_photo")
    return isinstance(legacy, dict) and _has_text(legacy.get("url"))


def product_has_applicable_photo(product: Product, sku: SKU) -> bool:
    return prepare_publication_policy(product).product_photo_applies_to(sku)


def sku_has_effective_description(product: Product, sku: SKU) -> bool:
    return prepare_publication_policy(product).sku_has_effective_description(sku)


def public_sku_ready(product: Product, sku: SKU) -> bool:
    """Return whether an active concrete variant belongs in the public catalog."""
    return prepare_publication_policy(product).sku_ready(sku)
