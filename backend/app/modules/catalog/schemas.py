from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CategoryTreeNode(BaseModel):
    id: UUID
    parent_id: UUID | None = None
    name: str
    slug: str
    description: str | None = None
    sort_order: int = 0
    children: list["CategoryTreeNode"] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CatalogTreeResponse(BaseModel):
    items: list[CategoryTreeNode]

