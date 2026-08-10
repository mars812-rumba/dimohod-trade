from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CatalogMediaItem(BaseModel):
    url: str
    alt: str | None = None
    role: str | None = None


class CategoryTreeNode(BaseModel):
    id: UUID
    parent_id: UUID | None = None
    name: str
    slug: str
    description: str | None = None
    sort_order: int = 0
    cover: CatalogMediaItem | None = None
    product_names: list[str] = Field(default_factory=list)
    standard_lengths_mm: list[int] = Field(default_factory=list)
    steel_grades: list[str] = Field(default_factory=list)
    children: list["CategoryTreeNode"] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CatalogTreeResponse(BaseModel):
    items: list[CategoryTreeNode]
