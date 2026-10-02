from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from uuid import UUID

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.main import app
from app.modules.boms.dependencies import require_bom_admin
from app.modules.boms.schemas import BomItemCreate, BomItemUpdate, BomRead, BomUpdate
from app.modules.boms.service import bom_reference

NOW = datetime.now(UTC)
BOM_ID = UUID("00000000-0000-0000-0000-000000000101")
ITEM_ID = UUID("00000000-0000-0000-0000-000000000201")


def test_bom_read_recalculates_totals_from_editable_lines() -> None:
    bom = BomRead.model_validate(
        {
            "id": BOM_ID,
            "reference": "BOM-20260825-00000000",
            "lead_id": "lead-1",
            "customer_name": "Иван",
            "contact_method": "phone",
            "contact": "+7 999 123-45-67",
            "status": "in_review",
            "profile_name": "Печь через стену",
            "source_url": "https://dimohod-trade.pro/configurator",
            "currency": "RUB",
            "measurements": [],
            "review_items": [],
            "calculation_errors": [],
            "manager_comment": "Проверить длину прохода",
            "created_at": NOW,
            "updated_at": NOW,
            "items": [
                {
                    "id": ITEM_ID,
                    "bom_id": BOM_ID,
                    "position": 0,
                    "item_key": "pipe",
                    "label": "Труба",
                    "article": "DT-PIPE-1000",
                    "sku_name": "Труба 1000 мм",
                    "quantity": 3,
                    "unit_price_rub": "1250.50",
                    "characteristics": ["Ø 150/250 мм"],
                    "note": None,
                    "match_status": "exact",
                    "created_at": NOW,
                    "updated_at": NOW,
                },
                {
                    "id": UUID("00000000-0000-0000-0000-000000000202"),
                    "bom_id": BOM_ID,
                    "position": 1,
                    "item_key": "manual",
                    "label": "Позиция на уточнение",
                    "article": None,
                    "sku_name": None,
                    "quantity": 2,
                    "unit_price_rub": None,
                    "characteristics": [],
                    "note": None,
                    "match_status": "manual",
                    "created_at": NOW,
                    "updated_at": NOW,
                },
            ],
        }
    )

    assert bom.known_total_rub == Decimal("3751.50")
    assert bom.unpriced_item_count == 1
    assert bom.total_units == 5


@pytest.mark.parametrize(
    ("field", "value"),
    (("quantity", 0), ("unit_price_rub", Decimal(-1))),
)
def test_bom_item_rejects_invalid_manager_values(field: str, value: object) -> None:
    payload = {
        "item_key": "pipe",
        "label": "Труба",
        "quantity": 1,
        field: value,
    }
    with pytest.raises(ValidationError):
        BomItemCreate.model_validate(payload)


@pytest.mark.parametrize(
    ("schema", "payload"),
    (
        (BomItemUpdate, {"quantity": None}),
        (BomItemUpdate, {"label": None}),
        (BomUpdate, {"status": None}),
        (BomUpdate, {"measurements": None}),
    ),
)
def test_bom_updates_do_not_clear_required_fields(schema: type, payload: dict) -> None:
    with pytest.raises(ValidationError):
        schema.model_validate(payload)


def test_bom_reference_is_human_readable_and_stable_for_id() -> None:
    reference = bom_reference(BOM_ID)
    assert reference.startswith("BOM-")
    assert reference.endswith("-00000000")


def test_admin_bom_crud_routes_are_registered() -> None:
    paths = app.openapi()["paths"]
    assert set(paths["/api/v1/admin/boms"]) >= {"get", "post"}
    assert set(paths["/api/v1/admin/boms/{bom_id}"]) >= {"get", "patch", "delete"}
    assert set(paths["/api/v1/admin/boms/{bom_id}/items"]) >= {"post"}
    assert set(paths["/api/v1/admin/boms/{bom_id}/items/{item_id}"]) >= {"patch", "delete"}


def test_bom_migration_has_cascade_items_and_nullable_sku_link() -> None:
    migration = (
        Path(__file__).resolve().parents[1]
        / "alembic"
        / "versions"
        / "202608250001_customer_boms.py"
    ).read_text(encoding="utf-8")
    assert 'ondelete="CASCADE"' in migration
    assert 'ondelete="SET NULL"' in migration


@pytest.mark.asyncio
async def test_bom_admin_requires_configured_matching_token(monkeypatch) -> None:
    monkeypatch.setattr("app.modules.boms.dependencies.settings.bom_admin_token", None)
    with pytest.raises(HTTPException) as unavailable:
        await require_bom_admin("anything")
    assert unavailable.value.status_code == 503

    monkeypatch.setattr("app.modules.boms.dependencies.settings.bom_admin_token", "secret")
    with pytest.raises(HTTPException) as unauthorized:
        await require_bom_admin("wrong")
    assert unauthorized.value.status_code == 401

    assert await require_bom_admin("secret") is None
