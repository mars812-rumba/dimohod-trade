import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, ForeignKey, Integer, JSON, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Product(TimestampMixin, Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("categories.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(220))
    slug: Mapped[str] = mapped_column(String(240), unique=True, index=True)
    short_description: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    brand: Mapped[str | None] = mapped_column(String(120))
    material: Mapped[str | None] = mapped_column(String(120))
    wall_thickness_mm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    diameter_mm: Mapped[int | None] = mapped_column(Integer)
    application_tags: Mapped[list[str]] = mapped_column(JSON, default=list, server_default="[]")
    compatibility_notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    category = relationship("Category", back_populates="products")
    skus: Mapped[list["SKU"]] = relationship(
        "SKU",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="SKU.article",
    )


class SKU(TimestampMixin, Base):
    __tablename__ = "skus"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    article: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(220))
    price_rub: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    stock_status: Mapped[str] = mapped_column(String(40), default="unknown", server_default="unknown")
    attributes: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, server_default="{}")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    product: Mapped[Product] = relationship("Product", back_populates="skus")

