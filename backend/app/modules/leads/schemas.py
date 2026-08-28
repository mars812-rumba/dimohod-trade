from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    first, *rest = value.split("_")
    return first + "".join(part.capitalize() for part in rest)


class LeadEstimateModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


class LeadEstimateMeasurement(LeadEstimateModel):
    label: str = Field(min_length=1, max_length=180)
    value: str = Field(min_length=1, max_length=240)


class LeadEstimateLine(LeadEstimateModel):
    key: str = Field(min_length=1, max_length=180)
    sku_id: UUID | None = None
    label: str = Field(min_length=1, max_length=240)
    article: str | None = Field(default=None, max_length=120)
    sku_name: str | None = Field(default=None, max_length=220)
    quantity: int = Field(ge=1, le=10_000)
    unit_price_rub: float | None = Field(default=None, ge=0)
    line_total_rub: float | None = Field(default=None, ge=0)
    characteristics: list[str] = Field(default_factory=list, max_length=30)
    note: str = Field(default="", max_length=4000)
    match_status: Literal["exact", "candidate", "nearest", "missing"]


class LeadEstimate(LeadEstimateModel):
    schema_version: Literal[1]
    profile_name: str = Field(min_length=1, max_length=180)
    generated_at: datetime
    source_url: str = Field(min_length=1, max_length=1000)
    measurements: list[LeadEstimateMeasurement] = Field(default_factory=list, max_length=100)
    lines: list[LeadEstimateLine] = Field(min_length=1, max_length=300)
    known_subtotal_rub: float = Field(ge=0)
    priced_line_count: int = Field(ge=0, le=300)
    unpriced_line_count: int = Field(ge=0, le=300)
    total_units: int = Field(ge=1, le=100_000)
    removed_labels: list[str] = Field(default_factory=list, max_length=300)
    review_items: list[str] = Field(default_factory=list, max_length=100)
    calculation_errors: list[str] = Field(default_factory=list, max_length=100)
