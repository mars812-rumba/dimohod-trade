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
    price_rub: Decimal | None
    stock_status: str
    attributes: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class ProductRead(BaseModel):
    id: UUID
    category: CategorySummary
    name: str
    slug: str
    short_description: str | None
    description: str | None
    brand: str | None
    material: str | None
    wall_thickness_mm: Decimal | None
    diameter_mm: int | None
    application_tags: list[str]
    compatibility_notes: str | None
    skus: list[SKURead]

    model_config = ConfigDict(from_attributes=True)

