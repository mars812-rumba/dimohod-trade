import json
from hashlib import sha256

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.leads.router import router

LEAD = "0" * 32
TOKEN = "local-test-access"
BASE = f"/leads/{LEAD}/manager"
HEADERS = {"X-Lead-Manager-Token": TOKEN}
PDF = b"%PDF-1.7\nestimate\n%%EOF"
SPEC = b"%PDF-1.7\nspecification\n%%EOF"


@pytest.fixture
def fixture(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.router.settings.media_storage_dir", str(tmp_path))
    directory = tmp_path / "leads" / LEAD
    directory.mkdir(parents=True)
    record = {"id": LEAD, "estimate": "estimate.json", "manager_access": {"token_sha256": sha256(TOKEN.encode()).hexdigest()}}
    envelope = {"lead_id": LEAD, "schema_version": 1, "status": "new", "revision": 1, "removed_lines": [],
                "customer": {"name": "Local test", "contact_method": "phone", "contact": "+70000000000"},
                "estimate": {"profile_name": "Test", "lines": [{"id": "line", "quantity": 2, "unit_price_rub": 4800.5, "line_total_rub": 9601}],
                             "known_subtotal_rub": 9601}}
    (directory / "lead.json").write_text(json.dumps(record))
    (directory / "estimate.json").write_text(json.dumps(envelope))
    app = FastAPI()
    app.include_router(router, prefix="/leads")
    with TestClient(app) as client:
        yield client, directory, envelope


def set_number(client, number="2026-07/81", revision=1):
    return client.patch(BASE + "/document", headers=HEADERS, json={"revision": revision, "quotationNumber": number})


def upload(client, revision=2, specification=SPEC):
    return client.post(BASE + "/pdf", headers=HEADERS, data={"revision": revision}, files={
        "pdf_file": ("estimate.pdf", PDF, "application/pdf"),
        "specification_file": ("spec.pdf", specification, "application/pdf"),
    })


def test_number_is_private_persisted_and_revision_checked(fixture):
    client, directory, original = fixture
    denied = client.patch(BASE + "/document", json={"revision": 1, "quotationNumber": "private"})
    assert denied.status_code == 404
    result = set_number(client, "  2026-07/81  ")
    assert result.status_code == 200
    body = result.json()
    assert body["quotation_number"] == "2026-07/81" and body["revision"] == 2
    assert body["estimate"] == original["estimate"]
    assert json.loads((directory / "estimate.json").read_text())["quotation_number"] == "2026-07/81"
    assert set_number(client, revision=2).json()["revision"] == 2
    assert set_number(client, "other", revision=1).status_code == 409
    assert set_number(client, "x" * 81, revision=2).status_code == 422
    assert set_number(client, "bad\nnumber", revision=2).status_code == 422


def test_two_pdfs_share_number_snapshot_and_access_control(fixture):
    client, directory, _ = fixture
    set_number(client)
    response = upload(client)
    assert response.status_code == 201
    assert response.json()["quotation_number"] == "2026-07/81"
    assert (directory / "estimate-r2.pdf").read_bytes() == PDF
    assert (directory / "specification-r2.pdf").read_bytes() == SPEC
    snapshot = json.loads((directory / "estimate-revisions/revision-2.json").read_text())
    assert snapshot["quotation_number"] == "2026-07/81"
    assert snapshot["estimate"]["lines"][0]["unit_price_rub"] == 4800.5
    assert client.get(BASE + "/pdf", headers=HEADERS).content == PDF
    assert client.get(BASE + "/pdf?document=specification", headers=HEADERS).content == SPEC
    assert client.get(BASE + "/pdf?document=specification").status_code == 404
    assert client.get(BASE + "/pdf?document=../../lead.json", headers=HEADERS).status_code == 422
    set_number(client, "other", revision=2)
    assert client.get(BASE + "/pdf?document=specification", headers=HEADERS).status_code == 404


def test_invalid_or_stale_bundle_does_not_save_partial_documents(fixture, monkeypatch):
    client, directory, _ = fixture
    assert upload(client, revision=1).status_code == 422  # No quotation number.
    set_number(client)
    assert upload(client, revision=1).status_code == 409
    assert upload(client, specification=b"not a PDF").status_code == 422
    wrong_type = client.post(BASE + "/pdf", headers=HEADERS, data={"revision": 2}, files={
        "pdf_file": ("estimate.pdf", PDF, "application/pdf"),
        "specification_file": ("spec.txt", SPEC, "text/plain"),
    })
    assert wrong_type.status_code == 415
    monkeypatch.setattr("app.modules.leads.router.MAX_MANAGER_PDF_SIZE", 100)
    assert upload(client, specification=b"%PDF-" + b"x" * 100).status_code == 413
    assert not (directory / "manager-estimate.pdf").exists()
    assert not list(directory.glob("specification-*.pdf"))


def test_legacy_estimate_pdf_upload_still_works_without_number(fixture):
    client, directory, _ = fixture
    result = client.post(BASE + "/pdf", headers=HEADERS, data={"revision": 1},
                         files={"pdf_file": ("estimate.pdf", PDF, "application/pdf")})
    assert result.status_code == 201
    assert client.get(BASE + "/pdf", headers=HEADERS).content == PDF
    assert client.get(BASE + "/pdf?document=specification", headers=HEADERS).status_code == 404


def test_discount_persists_recalculates_and_is_captured_in_pdf_revision(fixture):
    client, directory, _ = fixture
    result = client.patch(BASE + "/document", headers=HEADERS, json={
        "revision": 1, "quotationNumber": "DISCOUNT-1", "discountEnabled": True, "discountPercent": 10,
    })
    assert result.status_code == 200
    estimate = result.json()["estimate"]
    assert estimate["known_subtotal_rub"] == 9601
    assert estimate["discount_amount_rub"] == 960.10
    assert estimate["total_after_discount_rub"] == 8640.90
    assert estimate["lines"][0]["unit_price_rub"] == 4800.5
    assert client.get(BASE, headers=HEADERS).json()["estimate"] == estimate
    assert upload(client).status_code == 201
    snapshot = json.loads((directory / "estimate-revisions/revision-2.json").read_text())
    assert snapshot["estimate"] == estimate
    edited = client.patch(BASE + "/items/line", headers=HEADERS, json={"revision": 2, "quantity": 1})
    assert edited.status_code == 200
    assert edited.json()["estimate"]["total_after_discount_rub"] == 4320.45
    assert client.patch(BASE + "/document", headers=HEADERS, json={"revision": 2, "quotationNumber": "X", "discountEnabled": False}).status_code == 409
    removed = client.patch(BASE + "/document", headers=HEADERS, json={"revision": 3, "quotationNumber": "DISCOUNT-1", "discountEnabled": False})
    assert removed.status_code == 200
    assert removed.json()["estimate"]["discount_amount_rub"] == 0
    assert removed.json()["estimate"]["total_after_discount_rub"] == 4800.5


@pytest.mark.parametrize("percent", [-1, 101, "NaN", "Infinity", 1.234])
def test_invalid_discount_is_rejected_without_writing(fixture, percent):
    client, directory, _ = fixture
    before = (directory / "estimate.json").read_bytes()
    result = client.patch(BASE + "/document", headers=HEADERS, json={"revision": 1, "quotationNumber": "X", "discountEnabled": True, "discountPercent": percent})
    assert result.status_code == 422
    assert (directory / "estimate.json").read_bytes() == before


@pytest.mark.parametrize("percent,amount,total", [(0, 0, 9601), (100, 9601, 0), (12.55, 1204.93, 8396.07)])
def test_discount_boundaries_and_fractional_percent(fixture, percent, amount, total):
    client, _, _ = fixture
    body = {"revision": 1, "quotationNumber": "X", "discountEnabled": True, "discountPercent": percent}
    assert client.patch(BASE + "/document", json=body).status_code == 404
    result = client.patch(BASE + "/document", headers=HEADERS, json=body)
    assert result.status_code == 200
    assert result.json()["estimate"]["discount_amount_rub"] == amount
    assert result.json()["estimate"]["total_after_discount_rub"] == total


def test_discount_rounding_unpriced_lines_and_customer_total():
    from app.modules.leads.router import recalculate_estimate
    from app.modules.leads.customers import estimate_summary

    envelope = {"estimate": {"discount_enabled": True, "discount_percent": 10, "lines": [
        {"quantity": 1, "unit_price_rub": 60251.53}, {"quantity": 2, "unit_price_rub": None},
    ]}}
    recalculate_estimate(envelope)
    estimate = envelope["estimate"]
    assert estimate["discount_amount_rub"] == 6025.15
    assert estimate["total_after_discount_rub"] == 54226.38
    assert estimate["unpriced_line_count"] == 1
    assert estimate_summary(LEAD, "2026-10-28", envelope)["known_total_rub"] == 54226.38
    estimate["lines"] = [{"quantity": 1, "unit_price_rub": 0.05}]
    recalculate_estimate(envelope)
    assert estimate["discount_amount_rub"] == 0.01
    assert estimate["total_after_discount_rub"] == 0.04


def test_forced_catalog_selection_keeps_real_sku_and_persists_warning(fixture, monkeypatch):
    from decimal import Decimal
    from types import SimpleNamespace
    from uuid import UUID
    from app.db.session import get_db

    client, directory, _ = fixture
    sid = UUID("00000000-0000-0000-0000-000000000250")
    sku = SimpleNamespace(id=sid, article="LOCAL-CLAMP-D250", name="Хомут Ø250",
        diameter_mm=250, outer_diameter_mm=None, steel_grade="AISI 430", material="нержавеющая сталь",
        wall_thickness_mm=Decimal("0.50"), length_mm=None, angle_deg=None, insulation_mm=None,
        price_rub=Decimal("1234.50"), attributes={})
    sku.product = SimpleNamespace(id=sid, slug="local-clamp", name="Широкий хомут", product_kind="крепеж", category_id=sid,
        skus=[sku], extra_attributes={}, category=SimpleNamespace(id=sid, slug="homuty-i-krepezh", name="Хомуты"))
    async def lookup(session, ids):
        return {str(sid): sku} if sid in ids else {}
    monkeypatch.setattr("app.modules.leads.router.catalog_skus", lookup)
    monkeypatch.setattr("app.modules.leads.router.primary_visual_sku_image", lambda *args: None)
    monkeypatch.setattr("app.modules.leads.router.primary_product_image", lambda *args: None)
    client.app.dependency_overrides[get_db] = lambda: None
    body = {"revision":1,"skuId":str(sid),"quantity":2,"note":"Локальное примечание","forceAdd":True}
    assert client.post(BASE+"/catalog/items", json=body).status_code == 404
    added = client.post(BASE+"/catalog/items", headers=HEADERS, json=body)
    assert added.status_code == 201
    line = added.json()["estimate"]["lines"][-1]
    assert line["sku_id"] == str(sid) and line["unit_price_rub"] == 1234.5
    assert line["quantity"] == 2 and line["note"] == body["note"]
    assert line["match_status"] == "candidate" and "Требует проверки" in line["selection_warning"]
    assert client.get(BASE, headers=HEADERS).json()["estimate"]["lines"][-1] == line
    assert client.post(BASE+"/save", headers=HEADERS, json={"revision":2}).status_code == 200
    saved = json.loads((directory/"estimate-revisions/revision-2.json").read_text())
    assert saved["estimate"]["lines"][-1]["selection_warning"] == line["selection_warning"]
    assert client.post(BASE+"/catalog/items", headers=HEADERS, json=body).status_code == 409
    assert client.post(BASE+"/catalog/items", headers=HEADERS, json={**body,"revision":2,"skuId":"00000000-0000-0000-0000-000000000999"}).status_code == 404
    updated = client.patch(BASE+"/catalog/items/"+line["id"], headers=HEADERS, json={**body,"revision":2,"forceAdd":False})
    assert updated.status_code == 200
    assert updated.json()["estimate"]["lines"][-1]["selection_warning"] is None
    client.app.dependency_overrides.clear()
