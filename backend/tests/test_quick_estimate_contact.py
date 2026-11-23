import json
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.leads.customers import list_customers
from app.modules.leads.router import router


@pytest.fixture
def contact_client(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.router.settings.media_storage_dir", str(tmp_path))
    sent = []
    monkeypatch.setattr("app.modules.leads.router.send_lead_email", lambda *args: sent.append(args) or False)
    app = FastAPI()
    app.include_router(router, prefix="/api/v1/leads")
    return TestClient(app), tmp_path, sent


def contact_data(**changes):
    data = {
        "intent": "estimate_access",
        "contact_method": "phone",
        "contact": "+7 999 123-45-67",
        "personal_data_consent": "true",
        "consent_version": "2026-08-11",
        "source": "chimney-quick-estimate",
        "estimate_json": json.dumps({
            "schemaVersion": 1,
            "profileName": "Быстрый расчёт",
            "generatedAt": "2026-11-16T10:00:00Z",
            "sourceUrl": "https://dimohod-trade.pro/bystryy-raschet",
            "lines": [{"key": "pipe", "label": "Труба", "quantity": 2,
                       "unitPriceRub": 1500, "lineTotalRub": 3000, "matchStatus": "exact"}],
            "knownSubtotalRub": 3000, "pricedLineCount": 1, "unpricedLineCount": 0, "totalUnits": 2,
        }),
    }
    return {**data, **changes}


@pytest.mark.parametrize("method,contact", [(method, "+7 999 123-45-67") for method in ("phone", "max", "whatsapp")])
def test_contact_without_name_saves_estimate_before_revealing_it(contact_client, method, contact):
    client, root, _ = contact_client
    response = client.post("/api/v1/leads", data=contact_data(contact_method=method, contact=contact))
    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    result = response.json()
    lead_dir = root / "leads" / result["id"]
    record = json.loads((lead_dir / "lead.json").read_text())
    envelope = json.loads((lead_dir / "estimate.json").read_text())
    assert record["name"] == ""
    assert record["contact"] == contact
    assert record["contact_method"] == method and record["phone"] == contact
    assert record["personal_data_consent"] is True
    assert envelope["status"] == "estimate_received"
    assert result["callback_token"] not in (lead_dir / "lead.json").read_text()
    assert client.get(f"/api/v1/leads/{result['id']}/manager", headers={
        "X-Lead-Manager-Token": result["callback_token"],
    }).status_code == 404
    customer = list_customers(root)[0]
    assert customer["estimates"][0]["status"] == "estimate_received"
    assert not customer["estimates"][0]["callback_requested_at"]


@pytest.mark.parametrize("changes", [
    {"personal_data_consent": "false"}, {"consent_version": "old"},
    {"estimate_json": ""}, {"estimate_json": "{}"},
    {"contact": "-------"}, {"contact": "invalid"},
    {"contact_method": "telegram", "contact": "@test_user"},
    {"contact_method": "max", "contact": "@test_user"},
    {"contact_method": "whatsapp", "contact": "https://t.me/test_user"},
    {"contact_method": "email", "contact": "test@example.com"},
    {"intent": "manager_review"},
])
def test_gate_rejects_invalid_contact_consent_or_missing_estimate(contact_client, changes):
    client, root, _ = contact_client
    response = client.post("/api/v1/leads", data=contact_data(**changes))
    assert response.status_code == 422
    assert not list((root / "leads").glob("*/lead.json"))


def test_callback_is_authorized_idempotent_and_updates_the_same_crm_lead(contact_client):
    client, root, sent = contact_client
    receipt = client.post("/api/v1/leads", data=contact_data()).json()
    url = f"/api/v1/leads/{receipt['id']}/callback"
    for headers in [{}, {"X-Lead-Callback-Token": "wrong"}]:
        assert client.post(url, headers=headers).status_code == 404
    lead_dir = root / "leads" / receipt["id"]
    original = json.loads((lead_dir / "estimate.json").read_text())
    headers = {"X-Lead-Callback-Token": receipt["callback_token"]}
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: client.post(url, headers=headers), range(2)))
    assert all(response.status_code == 200 for response in responses)
    assert responses[0].json() == responses[1].json()
    assert responses[0].headers["cache-control"] == "no-store"
    assert len(sent) == 2  # one initial notification and one callback notification
    envelope = json.loads((lead_dir / "estimate.json").read_text())
    assert envelope["status"] == "callback_requested"
    assert envelope["revision"] == original["revision"]
    assert envelope["estimate"] == original["estimate"]
    assert len(list((root / "leads").glob("*/lead.json"))) == 1
    customer = list_customers(root)[0]
    assert len(customer["estimates"]) == 1
    assert customer["estimates"][0]["status"] == "callback_requested"
    assert customer["estimates"][0]["callback_requested_at"] == responses[0].json()["requested_at"]


def test_contact_without_name_does_not_erase_an_existing_customer_name(contact_client):
    client, root, _ = contact_client
    assert client.post("/api/v1/leads", data=contact_data(intent="manager_review", name="Иван")).status_code == 201
    assert client.post("/api/v1/leads", data=contact_data()).status_code == 201
    assert list_customers(root)[0]["name"] == "Иван"


def test_smtp_failure_does_not_lose_callback_intent(contact_client, monkeypatch):
    client, root, _ = contact_client
    receipt = client.post("/api/v1/leads", data=contact_data()).json()
    def fail(*args):
        raise RuntimeError("SMTP unavailable")
    monkeypatch.setattr("app.modules.leads.router.send_lead_email", fail)
    response = client.post(f"/api/v1/leads/{receipt['id']}/callback", headers={
        "X-Lead-Callback-Token": receipt["callback_token"],
    })
    assert response.status_code == 200
    record = json.loads((root / "leads" / receipt["id"] / "lead.json").read_text())
    assert record["callback_requested_at"]
    assert record["callback_email_status"] == "failed"
