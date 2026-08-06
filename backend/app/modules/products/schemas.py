from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.compatibility.schemas import CompatibilityMessage


class CategorySummary(BaseModel):
    id: UUID
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)


class ProductMediaItem(BaseModel):
    url: str
    alt: str | None = None
    role: str | None = None
    diameter_specific: bool = False


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
    compatibility_messages: list[CompatibilityMessage] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ProductListItem(BaseModel):
    id: UUID
    category: CategorySummary
    name: str
    slug: str
    article: str | None
    material: str | None
    steel_grade: str | None
    wall_thickness_mm: Decimal | None
    diameter_mm: int | None
    outer_diameter_mm: int | None
    contour: str | None
    insulation_mm: int | None
    length_mm: int | None
    angle_deg: int | None
    stock_status: str | None
    attributes: dict[str, Any] = Field(default_factory=dict)
    product_kind: str | None
    primary_image: ProductMediaItem | None = None
    price_rub: Decimal | None
    sku_count: int
    selected_sku: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    items: list[ProductListItem]
    total: int
    limit: int
    offset: int


class ProductSeoPage(BaseModel):
    product_slug: str
    diameter_mm: int | None
    outer_diameter_mm: int | None


class ProductKindFilter(BaseModel):
    value: str
    label: str
    count: int


class ProductFilterOption(BaseModel):
    value: str
    label: str
    count: int


class ProductVariantCombination(BaseModel):
    diameter: str | None = None
    inner_pipe: str
    inner_thickness: str | None = None
    outer_pipe: str
    count: int


class ProductFiltersResponse(BaseModel):
    product_kinds: list[ProductKindFilter]
    diameters: list[ProductFilterOption] = Field(default_factory=list)
    steel_grades: list[ProductFilterOption] = Field(default_factory=list)
    materials: list[ProductFilterOption] = Field(default_factory=list)
    outer_steel_grades: list[ProductFilterOption] = Field(default_factory=list)
    outer_materials: list[ProductFilterOption] = Field(default_factory=list)
    inner_pipes: list[ProductFilterOption] = Field(default_factory=list)
    outer_pipes: list[ProductFilterOption] = Field(default_factory=list)
    variant_combinations: list[ProductVariantCombination] = Field(default_factory=list)
    executions: list[ProductFilterOption] = Field(default_factory=list)
    lengths: list[ProductFilterOption] = Field(default_factory=list)
    wall_thicknesses: list[ProductFilterOption] = Field(default_factory=list)
    outer_wall_thicknesses: list[ProductFilterOption] = Field(default_factory=list)
    angles: list[ProductFilterOption] = Field(default_factory=list)
    insulations: list[ProductFilterOption] = Field(default_factory=list)
    contours: list[ProductFilterOption] = Field(default_factory=list)


class CompatibleProductItem(BaseModel):
    source_sku_id: UUID
    product_id: UUID
    product_name: str
    product_slug: str
    product_kind: str | None
    sku_id: UUID
    sku_key: str
    article: str
    name: str
    length_mm: int | None
    diameter_mm: int | None
    outer_diameter_mm: int | None
    insulation_mm: int | None
    steel_grade: str | None
    material: str | None
    wall_thickness_mm: Decimal | None
    outer_material: str | None
    outer_steel_grade: str | None
    outer_wall_thickness_mm: Decimal | None
    price_rub: Decimal | None
    stock_status: str
    primary_image: ProductMediaItem | None = None


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
    compatible_products: list[CompatibleProductItem] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
