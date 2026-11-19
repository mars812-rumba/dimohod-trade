import json
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.modules.ready_kits import service
from app.modules.ready_kits.schemas import KitLine, KitUpdate


@pytest.fixture
def catalog(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "media_storage_dir", str(tmp_path))
    skus = {}
    for kit in service.definitions().values():
        for line in kit.lines:
            skus[str(line.sku_id)] = SimpleNamespace(
                id=line.sku_id, article=f"REAL-{line.sku_id}", name="Каталожное изделие",
                is_active=True, product=SimpleNamespace(
                    is_active=True, name="Семейство", slug="family", product_kind="крепеж"
                ), price_rub=Decimal("10.01"), attributes={}, diameter_mm=115,
                outer_diameter_mm=None, length_mm=1000, steel_grade="AISI 304",
                wall_thickness_mm=Decimal("0.8"), insulation_mm=None,
            )

    async def load(_session, _kits):
        return skus

    monkeypatch.setattr(service, "load_skus", load)
    return skus


@pytest.fixture
def client(catalog, monkeypatch):
    monkeypatch.setattr(settings, "bom_admin_token", "ready-kits-test-only")

    async def db():
        yield object()

    app.dependency_overrides[get_db] = db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)


def update_payload(kit, **changes):
    values = {"revision": kit.revision, "lines": kit.lines, "description": kit.description,
              "limitations": kit.limitations, "approved": True, "published": True}
    values.update(changes)
    return KitUpdate(**values)


def test_matrix_contains_only_four_explicitly_approved_specs(catalog):
    kits = list(service.definitions().values())
    assert len(kits) == 12
    assert {k.diameter_mm for k in kits} == {115, 120, 150}
    assert sum(k.published and k.status == "approved" for k in kits) == 4
    assert all(not k.lines and not k.published for k in kits if k.diameter_mm != 115)
    roof4 = next(k for k in kits if k.route == "roof" and k.height_m == 4 and k.diameter_mm == 115)
    roof6 = next(k for k in kits if k.route == "roof" and k.height_m == 6 and k.diameter_mm == 115)
    assert [line.quantity for line in roof4.lines[:5]] == [1, 1, 1, 1, 2]
    assert [line.quantity for line in roof6.lines[:5]] == [1, 1, 1, 1, 5]
    assert all(k.source_revision == 7 and k.source_sha256 for k in kits if k.published)


def test_public_only_returns_approved_active_specs_without_private_provenance(client):
    response = client.get("/api/v1/ready-kits")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 4 and all(k["diameter_mm"] == 115 for k in items)
    assert response.headers["cache-control"] == "no-store"
    text = response.text
    for private in ("source_sha256", "source_revision", "contact", "customer", "lead_id", "approved_at"):
        assert private not in text


def test_drafts_are_404_and_never_appear_in_variant_links(client):
    assert client.get("/api/v1/ready-kits/cherez-perekrytie-4m-d120").status_code == 404
    assert client.get("/api/v1/ready-kits/unknown").status_code == 404
    data = client.get("/api/v1/ready-kits/cherez-perekrytie-4m-d115").json()
    assert len(data["variants"]) == 4
    assert all(k["diameter_mm"] == 115 for k in data["variants"])


def test_prices_are_live_and_decimal_totals_are_not_snapshot_prices(client, catalog):
    path = "/api/v1/ready-kits/cherez-perekrytie-4m-d115"
    before = client.get(path).json()["kit"]
    first = before["lines"][0]
    catalog[first["sku_id"]].price_rub = Decimal("27.19")
    after = client.get(path).json()["kit"]
    assert after["lines"][0]["unit_price_rub"] == "27.19"
    assert Decimal(after["total_rub"]) - Decimal(before["total_rub"]) == Decimal("17.18")
    assert Decimal(after["total_rub"]) == sum(Decimal(l["line_total_rub"]) for l in after["lines"])


@pytest.mark.parametrize("price", [None, Decimal(0), Decimal(-1), Decimal("NaN")])
def test_absent_or_invalid_price_is_not_silently_zero(client, catalog, price):
    next(iter(catalog.values())).price_rub = price
    kit = client.get("/api/v1/ready-kits/cherez-perekrytie-4m-d115").json()["kit"]
    assert kit["total_rub"] is None and kit["unpriced_count"] == 1
    assert kit["lines"][0]["unit_price_rub"] is None


@pytest.mark.parametrize("change", ["missing", "inactive", "inactive_product", "placeholder", "wrong_diameter"])
def test_invalid_catalog_line_hides_whole_kit(client, catalog, change):
    key = str(service.get_definition("cherez-perekrytie-4m-d115").lines[0].sku_id)
    sku = catalog[key]
    if change == "missing":
        del catalog[key]
    elif change == "inactive":
        sku.is_active = False
    elif change == "inactive_product":
        sku.product.is_active = False
    elif change == "placeholder":
        sku.article = "RECOVERY-TEMP-POWER-CLAMP-D215"
    else:
        sku.product.product_kind = "труба"
        sku.diameter_mm = 120
    assert client.get("/api/v1/ready-kits/cherez-perekrytie-4m-d115").status_code == 404


def test_admin_routes_require_authentication(client):
    assert client.get("/api/v1/admin/ready-kits").status_code == 401
    assert client.put("/api/v1/admin/ready-kits/cherez-perekrytie-4m-d115", json={}).status_code == 401
    response = client.get("/api/v1/admin/ready-kits", headers={"X-BOM-Admin-Token": "ready-kits-test-only"})
    assert response.status_code == 200 and len(response.json()["items"]) == 12


async def test_approval_is_explicit_and_overrides_survive_seed_reload(catalog):
    draft = service.get_definition("cherez-perekrytie-4m-d120")
    with pytest.raises(HTTPException) as error:
        await service.save_kit(None, draft.slug, update_payload(draft))
    assert error.value.status_code == 422
    sku = next(iter(catalog.values()))
    sku.product.product_kind = "труба"
    sku.diameter_mm = 120
    line = KitLine(sku_id=sku.id, quantity=3, label="Согласованная строка")
    saved = await service.save_kit(None, draft.slug, update_payload(draft, lines=[line]))
    assert saved["definition"]["revision"] == 2
    assert saved["definition"]["status"] == "approved"
    assert service.get_definition(draft.slug).lines == [line]
    assert draft.slug in [k["slug"] for k in await service.public_kits(None)]
    with pytest.raises(HTTPException) as error:
        await service.save_kit(None, draft.slug, update_payload(draft, lines=[line]))
    assert error.value.status_code == 409


async def test_unpublish_is_persistent_and_history_is_private(catalog):
    kit = service.get_definition("cherez-perekrytie-4m-d115")
    await service.save_kit(None, kit.slug, update_payload(kit, approved=False, published=False))
    assert kit.slug not in [k["slug"] for k in await service.public_kits(None)]
    history = Path(settings.media_storage_dir) / "ready-kits/history" / kit.slug / "revision-1.json"
    assert json.loads(history.read_text())["published"] is True
    with pytest.raises(HTTPException):
        await service.save_kit(None, kit.slug, update_payload(service.get_definition(kit.slug), approved=False, published=True))


def test_corrupt_override_never_republishes_seed(catalog):
    kit = service.get_definition("cherez-perekrytie-4m-d115")
    directory = Path(settings.media_storage_dir) / "ready-kits"
    directory.mkdir()
    (directory / f"{kit.slug}.json").write_text("broken")
    with pytest.raises(HTTPException) as error:
        service.definitions()
    assert error.value.status_code == 503


async def test_private_media_block(tmp_path):
    from app.main import PublicMediaFiles
    directory = tmp_path / "ready-kits"
    directory.mkdir()
    (directory / "spec.json").write_text('{"published":false}')
    files = PublicMediaFiles(directory=tmp_path)
    response = await files.get_response("ready-kits/spec.json", {"type": "http", "method": "GET", "headers": []})
    assert response.status_code == 404
