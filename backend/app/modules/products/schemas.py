from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CategorySummary(BaseModel):
    id: UUID
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)


class SKURead(BaseModel):
    id: UUID
    article: str
    name: str
    slug: str | None
    material: str | None
    steel_grade: str | None
    wall_thickness_mm: Decimal | None
    diameter_mm: int | None
    outer_diameter_mm: int | None
    contour: str | None
    insulation_mm: int | None
    length_mm: int | None
    angle_deg: int | None
    price_rub: Decimal | None
    stock_status: str
    attributes: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class ProductListItem(BaseModel):
    id: UUID
    category: CategorySummary
    name: str
    slug: str
    material: str | None
    steel_grade: str | None
    wall_thickness_mm: Decimal | None
    diameter_mm: int | None
    outer_diameter_mm: int | None
    contour: str | None
    insulation_mm: int | None
    product_kind: str | None
    price_rub: Decimal | None
    sku_count: int

    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    items: list[ProductListItem]
    total: int
    limit: int
    offset: int


class ProductKindFilter(BaseModel):
    value: str
    label: str
    count: int


class ProductFiltersResponse(BaseModel):
    product_kinds: list[ProductKindFilter]


class ProductRead(BaseModel):
    id: UUID
    category: CategorySummary
    name: str
    slug: str
    short_description: str | None
    description: str | None
    brand: str | None
    material: str | None
    steel_grade: str | None
    wall_thickness_mm: Decimal | None
    diameter_mm: int | None
    contour: str | None
    insulation_mm: int | None
    max_temperature_c: int | None
    product_kind: str | None
    purpose: list[str]
    extra_attributes: dict[str, Any]
    application_tags: list[str]
    compatibility_notes: str | None
    skus: list[SKURead]

    model_config = ConfigDict(from_attributes=True)
