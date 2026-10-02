import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Bom(TimestampMixin, Base):
    __tablename__ = "boms"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'submitted', 'in_review', 'approved', 'sent', 'archived')",
            name="status_valid",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    lead_id: Mapped[str | None] = mapped_column(String(64), index=True)
    customer_name: Mapped[str] = mapped_column(String(100))
    contact_method: Mapped[str] = mapped_column(String(20))
    contact: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(
        String(20), default="draft", server_default="draft", index=True
    )
    profile_name: Mapped[str | None] = mapped_column(String(180))
    source_url: Mapped[str | None] = mapped_column(String(1000))
    currency: Mapped[str] = mapped_column(String(3), default="RUB", server_default="RUB")
    measurements: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, server_default="[]"
    )
    review_items: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    calculation_errors: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    manager_comment: Mapped[str | None] = mapped_column(Text)

    items: Mapped[list["BomItem"]] = relationship(
        "BomItem",
        back_populates="bom",
        cascade="all, delete-orphan",
        order_by="BomItem.position",
    )


class BomItem(TimestampMixin, Base):
    __tablename__ = "bom_items"
    __table_args__ = (
        CheckConstraint("position >= 0", name="position_nonnegative"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price_rub IS NULL OR unit_price_rub >= 0", name="price_nonnegative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bom_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("boms.id", ondelete="CASCADE"), index=True
    )
    sku_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("skus.id", ondelete="SET NULL"), index=True
    )
    position: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    item_key: Mapped[str] = mapped_column(String(180))
    label: Mapped[str] = mapped_column(String(240))
    article: Mapped[str | None] = mapped_column(String(120))
    sku_name: Mapped[str | None] = mapped_column(String(220))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price_rub: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    characteristics: Mapped[list[str]] = mapped_column(JSONB, default=list, server_default="[]")
    note: Mapped[str | None] = mapped_column(Text)
    match_status: Mapped[str] = mapped_column(
        String(20), default="missing", server_default="missing"
    )

    bom: Mapped[Bom] = relationship("Bom", back_populates="items")
