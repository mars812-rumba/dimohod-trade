from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CompatibilityMessage(BaseModel):
    code: str
    severity: str
    message: str
    rule_type: str


class CompatibilityRuleRead(BaseModel):
    id: UUID
    code: str
    name: str
    description: str | None
    rule_type: str
    applies_to_product_kind: str | None
    conditions: dict[str, Any]
    result: dict[str, Any]
    severity: str
    message: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class CompatibilityCheckRequest(BaseModel):
    sku_id: UUID | None = None
    product_kind: str | None = None
    zone: str | None = None
    source_type: str | None = None
    required_diameter_mm: int | None = None
    diameter_mm: int | None = None
    outer_diameter_mm: int | None = None
    contour: str | None = None
    insulation_mm: int | None = None
    length_mm: int | None = None
    angle_deg: int | None = None
    material: str | None = None
    steel_grade: str | None = None
    wall_thickness_mm: Decimal | None = None
    extra_context: dict[str, Any] = {}


class CompatibilityCheckResponse(BaseModel):
    messages: list[CompatibilityMessage]
