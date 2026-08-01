from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AdminCategoryRead(BaseModel):
    id: UUID
    parent_id: UUID | None
    name: str
    slug: str
    product_count: int = 0
    media_count: int = 0
    extra_attributes: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class AdminMediaItem(BaseModel):
    url: str
    alt: str | None = None
    role: str | None = None
    file_name: str | None = None


class AdminSKURead(BaseModel):
    id: UUID
    product_id: UUID
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
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class AdminSKUListItem(AdminSKURead):
    product_name: str
    product_slug: str
    product_kind: str | None
    category_id: UUID
    category_name: str


class AdminSKUListResponse(BaseModel):
    items: list[AdminSKUListItem]
    total: int
    limit: int
    offset: int


class AdminProductListItem(BaseModel):
    id: UUID
    category_id: UUID
    category_name: str
    name: str
    slug: str
    product_kind: str | None
    sku_count: int
    media_count: int
    is_active: bool


class AdminProductRead(AdminProductListItem):
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
    purpose: list[str]
    extra_attributes: dict[str, Any]
    application_tags: list[str]
    compatibility_notes: str | None
    media: list[AdminMediaItem]
    skus: list[AdminSKURead]


class AdminProductListResponse(BaseModel):
    items: list[AdminProductListItem]
    total: int
    limit: int
    offset: int


class AdminProductUpdate(BaseModel):
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None
    seo_title: str | None = Field(default=None, max_length=180)
    seo_description: str | None = Field(default=None, max_length=320)


class AdminSEOGenerateResponse(BaseModel):
    short_description: str = Field(max_length=500)
    description: str
    seo_title: str = Field(max_length=180)
    seo_description: str = Field(max_length=320)
    model: str


class AdminSKUBase(BaseModel):
    article: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=220)
    slug: str | None = Field(default=None, max_length=240)
    material: str | None = Field(default=None, max_length=120)
    steel_grade: str | None = Field(default=None, max_length=32)
    wall_thickness_mm: Decimal | None = None
    diameter_mm: int | None = None
    outer_diameter_mm: int | None = None
    contour: str | None = Field(default=None, max_length=32)
    insulation_mm: int | None = None
    length_mm: int | None = None
    angle_deg: int | None = None
    price_rub: Decimal | None = None
    stock_status: str = Field(default="unknown", max_length=40)
    attributes: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class AdminSKUCreate(AdminSKUBase):
    pass


class AdminSKUUpdate(BaseModel):
    article: str | None = Field(default=None, min_length=1, max_length=120)
    name: str | None = Field(default=None, min_length=1, max_length=220)
    slug: str | None = Field(default=None, max_length=240)
    material: str | None = Field(default=None, max_length=120)
    steel_grade: str | None = Field(default=None, max_length=32)
    wall_thickness_mm: Decimal | None = None
    diameter_mm: int | None = None
    outer_diameter_mm: int | None = None
    contour: str | None = Field(default=None, max_length=32)
    insulation_mm: int | None = None
    length_mm: int | None = None
    angle_deg: int | None = None
    price_rub: Decimal | None = None
    stock_status: str | None = Field(default=None, max_length=40)
    attributes: dict[str, Any] | None = None
    is_active: bool | None = None


class AdminPhotoUpload(BaseModel):
    file_name: str = Field(min_length=1, max_length=180)
    content_base64: str = Field(min_length=1)
    alt: str | None = Field(default=None, max_length=240)
    role: str | None = Field(default=None, max_length=60)
