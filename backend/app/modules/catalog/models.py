import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.modules.products.models import Product


class Category(TimestampMixin, Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    indexing_policy: Mapped[str] = mapped_column(String(32), default="index", server_default="index")
    extra_attributes: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, server_default="{}")

    parent: Mapped["Category | None"] = relationship(
        "Category",
        back_populates="children",
        remote_side=[id],
    )
    children: Mapped[list["Category"]] = relationship(
        "Category",
        back_populates="parent",
        order_by="Category.sort_order",
    )
    products: Mapped[list["Product"]] = relationship("Product", back_populates="category")
