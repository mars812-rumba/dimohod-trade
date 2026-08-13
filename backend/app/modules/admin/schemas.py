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
    media_id: str | None = None
    content_sha256: str | None = None
    scope: str | None = None
    url: str
    thumbnail_url: str | None = None
    width: int | None = None
    height: int | None = None
    alt: str | None = None
    role: str | None = None
    file_name: str | None = None
    diameter_specific: bool = False
    diameter_keys: list[str] = Field(default_factory=list)
    lengths_mm: list[int] = Field(default_factory=list)
    sku_specific: bool = False


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
    compatible_product_ids: list[UUID] = Field(default_factory=list)


class AdminProductListResponse(BaseModel):
    items: list[AdminProductListItem]
    total: int
    limit: int
    offset: int


class AdminSEOConfiguratorCTA(BaseModel):
    text: str = Field(
        default="Подберите совместимые элементы и рассчитайте полный комплект дымохода в конфигураторе.",
        max_length=500,
    )
    href: str = Field(default="/#calculator", max_length=500)


class AdminSEOProductKnowledge(BaseModel):
    purpose: list[str] = Field(default_factory=list)
    installation_zones: list[str] = Field(default_factory=list, alias="installationZones")
    compatible_with: list[str] = Field(default_factory=list, alias="compatibleWith")
    incompatible_with: list[str] = Field(default_factory=list, alias="incompatibleWith")
    installation_variants: list[str] = Field(default_factory=list, alias="installationVariants")
    selection_rules: list[str] = Field(default_factory=list, alias="selectionRules")
    installation_warnings: list[str] = Field(default_factory=list, alias="installationWarnings")
    fire_safety: list[str] = Field(default_factory=list, alias="fireSafety")
    required_input_data: list[str] = Field(default_factory=list, alias="requiredInputData")
    source_notes: list[str] = Field(default_factory=list, alias="sourceNotes")
    configurator_cta: AdminSEOConfiguratorCTA = Field(
        default_factory=AdminSEOConfiguratorCTA,
        alias="configuratorCta",
    )

    model_config = ConfigDict(populate_by_name=True)


class AdminProductUpdate(BaseModel):
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None
    seo_title: str | None = Field(default=None, max_length=180)
    seo_description: str | None = Field(default=None, max_length=320)
    seo_knowledge: AdminSEOProductKnowledge | None = Field(default=None, alias="seoKnowledge")
    compatible_product_ids: list[UUID] | None = Field(default=None, alias="compatibleProductIds")

    model_config = ConfigDict(populate_by_name=True)


class AdminSEOGenerateRequest(BaseModel):
    selected_sku_id: UUID | None = None
    seo_knowledge: AdminSEOProductKnowledge | None = Field(default=None, alias="seoKnowledge")

    model_config = ConfigDict(populate_by_name=True)


class AdminSEOGenerateResponse(BaseModel):
    short_description: str = Field(max_length=500)
    description: str
    seo_title: str = Field(max_length=180)
    seo_description: str = Field(max_length=320)
    model: str
    fact_warnings: list[str] = Field(default_factory=list)


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
    scope: str | None = Field(default=None, pattern="^(family|variant|sku)$")
    diameter_specific: bool = False
    diameter_keys: list[str] = Field(default_factory=list)
    lengths_mm: list[int] = Field(default_factory=list)
    sku_specific: bool = False


class AdminPhotoScopeUpdate(BaseModel):
    diameter_keys: list[str] = Field(default_factory=list)
    lengths_mm: list[int] = Field(default_factory=list)
