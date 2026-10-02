from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

BomStatus = Literal["draft", "submitted", "in_review", "approved", "sent", "archived"]
ContactMethod = Literal["phone", "whatsapp", "telegram", "email"]
MatchStatus = Literal["exact", "candidate", "nearest", "missing", "manual"]


class BomMeasurement(BaseModel):
    label: str = Field(min_length=1, max_length=180)
    value: str = Field(min_length=1, max_length=240)


class BomItemBase(BaseModel):
    sku_id: UUID | None = None
    position: int = Field(default=0, ge=0)
    item_key: str = Field(min_length=1, max_length=180)
    label: str = Field(min_length=1, max_length=240)
    article: str | None = Field(default=None, max_length=120)
    sku_name: str | None = Field(default=None, max_length=220)
    quantity: int = Field(ge=1, le=10000)
    unit_price_rub: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    characteristics: list[str] = Field(default_factory=list, max_length=30)
    note: str | None = Field(default=None, max_length=2000)
    match_status: MatchStatus = "missing"


class BomItemCreate(BomItemBase):
    pass


class BomItemUpdate(BaseModel):
    sku_id: UUID | None = None
    position: int | None = Field(default=None, ge=0)
    item_key: str | None = Field(default=None, min_length=1, max_length=180)
    label: str | None = Field(default=None, min_length=1, max_length=240)
    article: str | None = Field(default=None, max_length=120)
    sku_name: str | None = Field(default=None, max_length=220)
    quantity: int | None = Field(default=None, ge=1, le=10000)
    unit_price_rub: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    characteristics: list[str] | None = Field(default=None, max_length=30)
    note: str | None = Field(default=None, max_length=2000)
    match_status: MatchStatus | None = None

    @model_validator(mode="after")
    def required_fields_cannot_be_cleared(self) -> "BomItemUpdate":
        required = {"position", "item_key", "label", "quantity", "characteristics", "match_status"}
        invalid = sorted(
            field for field in required & self.model_fields_set if getattr(self, field) is None
        )
        if invalid:
            raise ValueError(f"Fields cannot be null: {', '.join(invalid)}")
        return self


class BomItemRead(BomItemBase):
    id: UUID
    bom_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def line_total_rub(self) -> Decimal | None:
        if self.unit_price_rub is None:
            return None
        return self.unit_price_rub * self.quantity


class BomBase(BaseModel):
    customer_name: str = Field(min_length=2, max_length=100)
    contact_method: ContactMethod
    contact: str = Field(min_length=3, max_length=160)
    status: BomStatus = "draft"
    profile_name: str | None = Field(default=None, max_length=180)
    source_url: str | None = Field(default=None, max_length=1000)
    measurements: list[BomMeasurement] = Field(default_factory=list, max_length=100)
    review_items: list[str] = Field(default_factory=list, max_length=100)
    calculation_errors: list[str] = Field(default_factory=list, max_length=100)
    manager_comment: str | None = Field(default=None, max_length=5000)


class BomCreate(BomBase):
    lead_id: str | None = Field(default=None, max_length=64)
    items: list[BomItemCreate] = Field(default_factory=list, max_length=300)


class BomUpdate(BaseModel):
    lead_id: str | None = Field(default=None, max_length=64)
    customer_name: str | None = Field(default=None, min_length=2, max_length=100)
    contact_method: ContactMethod | None = None
    contact: str | None = Field(default=None, min_length=3, max_length=160)
    status: BomStatus | None = None
    profile_name: str | None = Field(default=None, max_length=180)
    source_url: str | None = Field(default=None, max_length=1000)
    measurements: list[BomMeasurement] | None = Field(default=None, max_length=100)
    review_items: list[str] | None = Field(default=None, max_length=100)
    calculation_errors: list[str] | None = Field(default=None, max_length=100)
    manager_comment: str | None = Field(default=None, max_length=5000)

    @model_validator(mode="after")
    def required_fields_cannot_be_cleared(self) -> "BomUpdate":
        required = {
            "customer_name",
            "contact_method",
            "contact",
            "status",
            "measurements",
            "review_items",
            "calculation_errors",
        }
        invalid = sorted(
            field for field in required & self.model_fields_set if getattr(self, field) is None
        )
        if invalid:
            raise ValueError(f"Fields cannot be null: {', '.join(invalid)}")
        return self


class BomRead(BomBase):
    id: UUID
    reference: str
    lead_id: str | None
    currency: str
    items: list[BomItemRead]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def known_total_rub(self) -> Decimal:
        return sum((item.line_total_rub or Decimal(0) for item in self.items), Decimal(0))

    @computed_field
    @property
    def unpriced_item_count(self) -> int:
        return sum(item.unit_price_rub is None for item in self.items)

    @computed_field
    @property
    def total_units(self) -> int:
        return sum(item.quantity for item in self.items)


class BomListItem(BaseModel):
    id: UUID
    reference: str
    customer_name: str
    contact_method: ContactMethod
    contact: str
    status: BomStatus
    profile_name: str | None
    item_count: int
    known_total_rub: Decimal
    created_at: datetime
    updated_at: datetime


class BomListResponse(BaseModel):
    items: list[BomListItem]
    total: int
    limit: int
    offset: int
