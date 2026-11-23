import json
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.leads.customer_deletion import delete_customer, deletion_preview, restore_customer
from app.modules.leads.customer_router import router as customers_router
from app.modules.leads.customers import (
    index_customer_inquiry, list_customers, update_customer_name, upsert_customer,
)
from app.modules.leads.router import router as leads_router
from app.modules.leads import customers as customer_store

ADMIN = {"X-BOM-Admin-Token": "inquiry-test-admin"}
BASE = "/api/v1/admin/customers"


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.customer_router.settings.media_storage_dir", str(tmp_path))
    monkeypatch.setattr("app.modules.boms.dependencies.settings.bom_admin_token", "inquiry-test-admin")
    monkeypatch.setattr("app.modules.leads.router.send_lead_email", lambda *args: False)
    app = FastAPI()
    app.include_router(customers_router, prefix=BASE)
    app.include_router(leads_router, prefix="/api/v1/leads")
    return TestClient(app)


def seed_plain(root, lead_id="a" * 32, **changes):
    directory = root / "leads" / lead_id
    directory.mkdir(parents=True)
    record = {"id": lead_id, "created_at": "2026-11-23T16:20:39+00:00", "name": "Олег",
              "contact_method": "phone", "contact": "+7 999 123-45-67", "source": "homepage-materials",
              "comment": "Прошу перезвонить", "configuration": "Страница заявки: https://dimohod-trade.pro/",
              "estimate": None, "attachment": None, "email_status": "sent", **changes}
    (directory / "lead.json").write_text(json.dumps(record, ensure_ascii=False))
    return directory


@pytest.mark.parametrize("method", ["phone", "max", "whatsapp"])
def test_new_plain_lead_is_indexed_without_an_estimate(client, tmp_path, method):
    response = client.post("/api/v1/leads", data={
        "name": "Олег", "contact_method": method, "contact": "+7 999 123-45-67",
        "source": "homepage-materials", "comment": "Прошу перезвонить",
        "personal_data_consent": "true", "consent_version": "2026-08-11",
    })
    assert response.status_code == 201
    lead_id = response.json()["id"]
    customer = client.get(BASE, headers=ADMIN).json()["items"][0]
    assert customer["contacts"] == [{"method": method, "value": "+7 999 123-45-67"}]
    assert customer["estimates"] == []
    assert customer["inquiries"][0]["lead_id"] == lead_id
    assert customer["inquiries"][0]["comment"] == "Прошу перезвонить"
    lead_dir = tmp_path / "leads" / lead_id
    assert not (lead_dir / "estimate.json").exists()
    assert json.loads((lead_dir / "lead.json").read_text())["customer_id"] == customer["id"]


def test_legacy_backfill_is_idempotent_searchable_and_preserves_lead_bytes(client, tmp_path):
    directory = seed_plain(tmp_path)
    before = (directory / "lead.json").read_bytes()
    assert client.get(BASE).status_code == 401
    assert not (tmp_path / "customers").exists()
    first = client.get(BASE, headers=ADMIN).json()
    customer = first["items"][0]
    customer_path = tmp_path / "customers" / f"{customer['id']}.json"
    customer_bytes = customer_path.read_bytes()
    assert first["total"] == 1 and customer["estimates"] == []
    assert customer["inquiries"][0]["source"] == "homepage-materials"
    for query in ["a" * 32, "homepage-materials", "перезвонить", "dimohod-trade.pro", "Олег"]:
        assert client.get(BASE, params={"q": query}, headers=ADMIN).json()["total"] == 1
    assert customer_path.read_bytes() == customer_bytes
    assert (directory / "lead.json").read_bytes() == before
    assert list_customers(tmp_path) == first["items"]


def test_inquiry_merges_with_same_phone_estimates_and_preserves_manual_name(tmp_path):
    cid = upsert_customer(tmp_path, lead_id="b" * 32, name="Новое имя", contact_method="whatsapp",
                          contact="+79991234567", created_at="2026-11-24T00:00:00Z",
                          envelope={"estimate": {"profile_name": "Дом", "lines": []}})
    update_customer_name(tmp_path, cid, "Имя менеджера", "Новое имя")
    seed_plain(tmp_path)
    customers = list_customers(tmp_path)
    assert len(customers) == 1 and customers[0]["id"] == cid
    assert customers[0]["name"] == "Имя менеджера"
    assert len(customers[0]["estimates"]) == len(customers[0]["inquiries"]) == 1
    assert len(customers[0]["contacts"]) == 2


def test_concurrent_backfill_has_no_duplicates_and_skips_estimates_and_broken_records(tmp_path):
    seed_plain(tmp_path)
    seed_plain(tmp_path, "b" * 32, estimate="estimate.json")
    directory = seed_plain(tmp_path, "c" * 32)
    (directory / "estimate.json").write_text("{}")
    seed_plain(tmp_path, "d" * 32, contact="")
    seed_plain(tmp_path, "e" * 32, customer_id="f" * 32)
    with ThreadPoolExecutor(max_workers=6) as pool:
        ids = list(pool.map(lambda _: index_customer_inquiry(tmp_path, "a" * 32), range(12)))
    assert len(set(ids)) == 1
    assert len(list_customers(tmp_path)[0]["inquiries"]) == 1


def test_notes_attachment_and_customer_boundary_are_protected(client, tmp_path):
    directory = seed_plain(tmp_path, attachment="attachment.pdf")
    (directory / "attachment.pdf").write_bytes(b"%PDF-private-inquiry")
    cid = client.get(BASE, headers=ADMIN).json()["items"][0]["id"]
    url = f"{BASE}/{cid}/inquiries/{'a' * 32}"
    assert client.get(url + "/attachment").status_code == 401
    result = client.get(url + "/attachment", headers=ADMIN)
    assert result.status_code == 200 and result.content == b"%PDF-private-inquiry"
    assert result.headers["cache-control"] == "no-store"
    assert result.headers["content-disposition"].startswith("attachment;")
    assert client.get(url.replace(cid, "b" * 32) + "/attachment", headers=ADMIN).status_code == 404
    payload = {"notes": "Позвонить завтра", "expected_notes": ""}
    assert client.patch(url + "/notes", json=payload).status_code == 401
    assert client.patch(url + "/notes", json=payload, headers=ADMIN).status_code == 200
    assert client.patch(url + "/notes", json=payload, headers=ADMIN).status_code == 409
    assert list_customers(tmp_path)[0]["inquiries"][0]["notes"] == payload["notes"]
    record = json.loads((directory / "lead.json").read_text())
    record["attachment"] = "../../customers/private.json"
    (directory / "lead.json").write_text(json.dumps(record))
    assert client.get(url + "/attachment", headers=ADMIN).status_code == 404


def test_plain_lead_deletion_and_restore_never_reappear_during_backfill(client, tmp_path):
    directory = seed_plain(tmp_path, attachment="attachment.pdf")
    (directory / "attachment.pdf").write_bytes(b"%PDF-private-inquiry")
    cid = client.get(BASE, headers=ADMIN).json()["items"][0]["id"]
    original = (directory / "lead.json").read_bytes()
    preview = deletion_preview(tmp_path, cid)
    assert preview["lead_count"] == 1 and preview["estimate_count"] == 0
    result = delete_customer(tmp_path, cid, preview["version"])
    assert list_customers(tmp_path) == []
    assert index_customer_inquiry(tmp_path, "a" * 32) is None
    restore_customer(tmp_path, result["deletion_id"])
    assert len(list_customers(tmp_path)[0]["inquiries"]) == 1
    assert (directory / "lead.json").read_bytes() == original


@pytest.mark.parametrize("method,contact", [("telegram", "@legacy_client"), ("email", "legacy@example.invalid")])
def test_legacy_contact_methods_remain_visible_without_reopening_public_form_methods(tmp_path, method, contact):
    seed_plain(tmp_path, contact_method=method, contact=contact)
    customer = list_customers(tmp_path)[0]
    assert customer["contacts"] == [{"method": method, "value": contact}]
    assert len(customer["inquiries"]) == 1


def test_old_phone_only_record_is_discovered(tmp_path):
    seed_plain(tmp_path, contact=None, phone="+7 999 123-45-67")
    assert list_customers(tmp_path)[0]["contacts"][0]["value"] == "+7 999 123-45-67"


def test_in_flight_index_cannot_resurrect_a_customer_deleted_before_lock(tmp_path, monkeypatch):
    seed_plain(tmp_path)
    cid = list_customers(tmp_path)[0]["id"]
    version = deletion_preview(tmp_path, cid)["version"]
    original_lock = customer_store.customer_lock

    @contextmanager
    def delete_before_index_lock(root, customer_id):
        delete_customer(root, customer_id, version)
        with original_lock(root, customer_id) as path:
            yield path

    monkeypatch.setattr(customer_store, "customer_lock", delete_before_index_lock)
    assert index_customer_inquiry(tmp_path, "a" * 32) is None
    assert list_customers(tmp_path) == []
