from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class KitLine(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sku_id: UUID
    quantity: int = Field(ge=1, le=1000)
    label: str = Field(default="", max_length=240)


class KitDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")
    slug: str
    route: Literal["roof", "wall"]
    height_m: Literal[3, 4, 6]
    diameter_mm: Literal[115, 120, 150]
    revision: int = Field(default=1, ge=1)
    status: Literal["draft", "approved"] = "draft"
    published: bool = False
    lines: list[KitLine] = Field(default_factory=list, max_length=100)
    description: str = Field(default="", max_length=4000)
    limitations: list[Annotated[str, Field(max_length=1200)]] = Field(default_factory=list, max_length=20)
    source_revision: int | None = None
    source_sha256: str | None = None
    approved_at: str | None = None


class KitUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=1)
    lines: list[KitLine] = Field(max_length=100)
    description: str = Field(max_length=4000)
    limitations: list[Annotated[str, Field(max_length=1200)]] = Field(max_length=20)
    approved: bool
    published: bool
