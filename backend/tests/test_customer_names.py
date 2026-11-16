import json
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.leads.customer_router import router
from app.modules.leads.customers import (
    CustomerNameConflictError,
    list_customers,
    sync_customer_estimate,
    update_customer_name,
    upsert_customer,
)

HEADERS = {"X-BOM-Admin-Token": "name-test-admin"}
ENVELOPE = {"status": "estimate_received", "estimate": {"profile_name": "Дом", "lines": []}}


def add_customer(root, name="", lead_id="a" * 32):
    return upsert_customer(
        root, lead_id=lead_id, name=name, contact_method="phone", contact="+7 999 123-45-67",
        created_at="2026-11-16T00:00:00Z", envelope=ENVELOPE,
    )


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.customer_router.settings.media_storage_dir", str(tmp_path))
    monkeypatch.setattr("app.modules.boms.dependencies.settings.bom_admin_token", "name-test-admin")
    app = FastAPI()
    app.include_router(router, prefix="/api/v1/admin/customers")
    with TestClient(app) as test_client:
        yield test_client


def test_add_rename_clear_name_and_search_without_changing_contacts_or_documents(tmp_path, client):
    customer_id = add_customer(tmp_path)
    path = tmp_path / "customers" / f"{customer_id}.json"
    before = json.loads(path.read_text())
    # Legacy records need no migration.
    before.pop("name_source", None)
    path.write_text(json.dumps(before))
    directory = tmp_path / "leads" / ("a" * 32)
    directory.mkdir(parents=True)
    files = {"lead.json": b'{"name":""}', "estimate.json": b'{"customer":{"name":""}}',
             "quotation.pdf": b"historical-document"}
    for filename, content in files.items():
        (directory / filename).write_bytes(content)

    url = f"/api/v1/admin/customers/{customer_id}/name"
    response = client.patch(url, json={"name": "  Иван Петров  ", "expected_name": ""}, headers=HEADERS)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["name"] == "Иван Петров"
    assert response.json()["name_source"] == "manual"
    assert response.json()["name_updated_at"]
    assert client.get("/api/v1/admin/customers?q=петров", headers=HEADERS).json()["total"] == 1
    assert client.patch(url, json={"name": "Иван", "expected_name": "Иван Петров"},
                        headers=HEADERS).status_code == 200
    assert client.patch(url, json={"name": "   ", "expected_name": "Иван"},
                        headers=HEADERS).json()["name"] == ""
    after = json.loads(path.read_text())
    assert after["contacts"] == before["contacts"]
    assert after["estimates"] == before["estimates"]
    assert after["id"] == before["id"]
    assert len(list_customers(tmp_path)) == 1
    for filename, content in files.items():
        assert (directory / filename).read_bytes() == content


def test_name_endpoint_requires_admin_and_detects_stale_edits(tmp_path, client):
    customer_id = add_customer(tmp_path, "Старое имя")
    url = f"/api/v1/admin/customers/{customer_id}/name"
    payload = {"name": "Новое имя", "expected_name": "Старое имя"}
    assert client.patch(url, json=payload).status_code == 401
    assert client.patch(url, json=payload, headers={"X-BOM-Admin-Token": "wrong"}).status_code == 401
    assert list_customers(tmp_path)[0]["name"] == "Старое имя"
    assert client.patch(url, json=payload, headers=HEADERS).status_code == 200
    assert client.patch(url, json=payload, headers=HEADERS).status_code == 409
    assert list_customers(tmp_path)[0]["name"] == "Новое имя"


@pytest.mark.parametrize("payload", [
    {"name": "x" * 101, "expected_name": ""}, {"name": None, "expected_name": ""},
    {"name": "Иван"}, {"name": "Иван", "expected_name": "", "contacts": []},
    {"name": "Иван", "expected_name": "", "name_source": "auto"},
])
def test_invalid_name_payload_does_not_change_customer(tmp_path, client, payload):
    customer_id = add_customer(tmp_path)
    path = tmp_path / "customers" / f"{customer_id}.json"
    before = path.read_bytes()
    assert client.patch(f"/api/v1/admin/customers/{customer_id}/name", json=payload,
                        headers=HEADERS).status_code == 422
    assert path.read_bytes() == before


@pytest.mark.parametrize("customer_id", ["b" * 32, "invalid", "a" * 33])
def test_missing_customer_name_returns_404(client, customer_id):
    assert client.patch(f"/api/v1/admin/customers/{customer_id}/name",
                        json={"name": "Иван", "expected_name": ""}, headers=HEADERS).status_code == 404


@pytest.mark.parametrize("manual_name", ["Подписал менеджер", ""])
def test_manual_name_including_cleared_name_survives_new_estimates(tmp_path, manual_name):
    customer_id = add_customer(tmp_path, "Из формы")
    update_customer_name(tmp_path, customer_id, manual_name, "Из формы")
    assert add_customer(tmp_path, "Новое автоматическое имя", "b" * 32) == customer_id
    assert add_customer(tmp_path, "", "c" * 32) == customer_id
    customer = list_customers(tmp_path)[0]
    assert customer["name"] == manual_name
    assert customer["name_source"] == "manual"
    assert len(customer["estimates"]) == 3


def test_automatic_name_can_still_update_before_manual_edit(tmp_path):
    add_customer(tmp_path)
    add_customer(tmp_path, "Из формы", "b" * 32)
    add_customer(tmp_path, "Уточнённое из формы", "c" * 32)
    assert list_customers(tmp_path)[0]["name"] == "Уточнённое из формы"


def test_simultaneous_name_edits_have_one_winner(tmp_path):
    customer_id = add_customer(tmp_path)

    def rename(name):
        try:
            update_customer_name(tmp_path, customer_id, name, "")
            return "saved"
        except CustomerNameConflictError:
            return "conflict"

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(rename, ["Первый", "Второй"])) == ["conflict", "saved"]


def test_rename_upsert_and_estimate_sync_share_one_lock(tmp_path):
    customer_id = add_customer(tmp_path)
    update_customer_name(tmp_path, customer_id, "Менеджер", "")

    def change(index):
        if index % 3 == 0:
            add_customer(tmp_path, "Из формы", f"{index:032x}")
        elif index % 3 == 1:
            sync_customer_estimate(tmp_path, {"id": "a" * 32, "customer_id": customer_id,
                                            "created_at": "2026-11-16T00:00:00Z"}, ENVELOPE)
        else:
            update_customer_name(tmp_path, customer_id, "Менеджер", "Менеджер")

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(change, range(30)))
    customers = list_customers(tmp_path)
    assert len(customers) == 1
    assert customers[0]["name"] == "Менеджер"
    assert len(customers[0]["estimates"]) == 11
    assert len(customers[0]["contacts"]) == 1
