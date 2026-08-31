import json
from urllib.parse import parse_qs, urlparse

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.leads.router import router

app = FastAPI()
app.include_router(router, prefix="/api/v1/leads")


def test_create_lead(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.router.settings.media_storage_dir", str(tmp_path))
    delivered = []
    monkeypatch.setattr(
        "app.modules.leads.router.send_lead_email",
        lambda record, attachment, manager_url=None: delivered.append(
            (record, attachment, manager_url)
        )
        or True,
    )
    client = TestClient(app)
    response = client.post(
        "/api/v1/leads",
        data={
            "name": "Иван",
            "phone": "+7 999 123-45-67",
            "source": "test",
            "personal_data_consent": "true",
            "consent_version": "2026-08-11",
        },
    )
    assert response.status_code == 201
    assert response.json()["status"] == "accepted"
    assert response.json()["email_status"] == "sent"
    lead_files = list((tmp_path / "leads").glob("*/lead.json"))
    assert lead_files
    record = json.loads(lead_files[0].read_text(encoding="utf-8"))
    assert record["personal_data_consent"] is True
    assert record["consent_version"] == "2026-08-11"
    assert record["consented_at"]
    assert record["email_recipient"] == "office@dimohod-trade.pro"
    assert record["email_status"] == "sent"
    assert delivered[0][0]["phone"] == "+7 999 123-45-67"


def test_keeps_lead_when_email_is_not_configured(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.router.settings.media_storage_dir", str(tmp_path))
    monkeypatch.setattr("app.modules.leads.router.send_lead_email", lambda *_: False)
    client = TestClient(app)
    response = client.post(
        "/api/v1/leads",
        data={
            "name": "Иван",
            "phone": "+7 999 123-45-67",
            "personal_data_consent": "true",
            "consent_version": "2026-08-11",
        },
    )
    assert response.status_code == 201
    assert response.json()["email_status"] == "not_configured"


def test_rejects_invalid_phone():
    client = TestClient(app)
    response = client.post(
        "/api/v1/leads",
        data={
            "name": "Иван",
            "phone": "not-a-phone",
            "personal_data_consent": "true",
            "consent_version": "2026-08-11",
        },
    )
    assert response.status_code == 422


def test_rejects_lead_without_personal_data_consent(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.router.settings.media_storage_dir", str(tmp_path))
    client = TestClient(app)
    response = client.post(
        "/api/v1/leads",
        data={
            "name": "Иван",
            "phone": "+7 999 123-45-67",
            "personal_data_consent": "false",
            "consent_version": "2026-08-11",
        },
    )
    assert response.status_code == 422
    assert not (tmp_path / "leads").exists()


def test_accepts_email_contact_and_sends_customer_confirmation(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.router.settings.media_storage_dir", str(tmp_path))
    manager_deliveries = []
    customer_deliveries = []
    monkeypatch.setattr(
        "app.modules.leads.router.send_lead_email",
        lambda record, attachment, manager_url=None: manager_deliveries.append(
            (record, attachment, manager_url)
        )
        or True,
    )
    monkeypatch.setattr(
        "app.modules.leads.router.send_customer_confirmation_email",
        lambda record, attachment: customer_deliveries.append((record, attachment)) or True,
    )
    client = TestClient(app)

    response = client.post(
        "/api/v1/leads",
        data={
            "name": "Анна",
            "contact_method": "email",
            "contact": "ANNA@example.com",
            "source": "chimney-estimate",
            "configuration": "BOM: труба — 2 шт.",
            "personal_data_consent": "true",
            "consent_version": "2026-08-11",
        },
        files={"attachment": ("smeta.pdf", b"pdf", "application/pdf")},
    )

    assert response.status_code == 201
    assert response.json()["customer_email_status"] == "sent"
    assert manager_deliveries[0][0]["contact"] == "anna@example.com"
    assert customer_deliveries[0][0]["contact_method"] == "email"


def test_saves_structured_estimate_with_customer_and_sku_links(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.router.settings.media_storage_dir", str(tmp_path))
    monkeypatch.setattr(
        "app.modules.leads.router.settings.lead_manager_base_url",
        "https://dimohod-trade.pro/admin/estimates",
    )
    monkeypatch.setattr("app.modules.leads.router.settings.bom_admin_token", "manager-secret")
    deliveries = []
    monkeypatch.setattr(
        "app.modules.leads.router.send_lead_email",
        lambda record, attachment, manager_url=None: deliveries.append(manager_url) or True,
    )
    client = TestClient(app)
    estimate = {
        "schemaVersion": 1,
        "profileName": "Баня — вывод через стену",
        "generatedAt": "2026-08-28T10:00:00Z",
        "sourceUrl": "https://dimohod-trade.pro/configurator?profile=test",
        "measurements": [{"label": "Маршрут", "value": "Через стену"}],
        "lines": [
            {
                "key": "sandwich-pipe-1000",
                "skuId": "00000000-0000-0000-0000-000000000101",
                "label": "Сэндвич-труба 1000 мм",
                "article": "DT-1000",
                "skuName": "Сэндвич-труба",
                "quantity": 2,
                "unitPriceRub": 2500,
                "lineTotalRub": 5000,
                "characteristics": ["Ø 150/250 мм"],
                "note": "",
                "matchStatus": "exact",
            }
        ],
        "knownSubtotalRub": 5000,
        "pricedLineCount": 1,
        "unpricedLineCount": 0,
        "totalUnits": 2,
        "removedLabels": [],
        "reviewItems": [],
        "calculationErrors": [],
    }

    response = client.post(
        "/api/v1/leads",
        data={
            "name": "Иван",
            "contact_method": "phone",
            "contact": "+7 999 123-45-67",
            "source": "chimney-estimate",
            "estimate_json": json.dumps(estimate),
            "personal_data_consent": "true",
            "consent_version": "2026-08-11",
        },
    )

    assert response.status_code == 201
    lead_dir = next((tmp_path / "leads").iterdir())
    lead = json.loads((lead_dir / "lead.json").read_text(encoding="utf-8"))
    saved = json.loads((lead_dir / "estimate.json").read_text(encoding="utf-8"))
    assert lead["estimate"] == "estimate.json"
    assert lead["customer_id"] == saved["customer"]["id"]
    assert saved["customer"]["contact"] == "+7 999 123-45-67"
    assert saved["estimate"]["lines"][0]["sku_id"] == estimate["lines"][0]["skuId"]
    assert saved["estimate"]["lines"][0]["quantity"] == 2

    manager_url = deliveries[0]
    parsed_url = urlparse(manager_url)
    token = parse_qs(parsed_url.fragment)["token"][0]
    assert parsed_url.path.endswith(lead["id"])
    assert token not in (lead_dir / "lead.json").read_text(encoding="utf-8")

    denied = client.get(f"/api/v1/leads/{lead['id']}/manager")
    assert denied.status_code == 404
    allowed = client.get(
        f"/api/v1/leads/{lead['id']}/manager",
        headers={"X-Lead-Manager-Token": token},
    )
    assert allowed.status_code == 200
    assert allowed.headers["cache-control"] == "no-store"
    assert allowed.json()["customer"]["name"] == "Иван"
    admin_allowed = client.get(
        f"/api/v1/leads/{lead['id']}/manager",
        headers={"X-BOM-Admin-Token": "manager-secret"},
    )
    assert admin_allowed.status_code == 200

    current = allowed.json()
    line_id = current["estimate"]["lines"][0]["id"]
    updated = client.patch(
        f"/api/v1/leads/{lead['id']}/manager/items/{line_id}",
        headers={"X-Lead-Manager-Token": token},
        json={"revision": current["revision"], "quantity": 3, "unitPriceRub": 2400},
    )
    assert updated.status_code == 200
    assert updated.json()["estimate"]["known_subtotal_rub"] == 7200
    assert (lead_dir / "original.json").is_file()
    customer = json.loads(
        (tmp_path / "customers" / f"{lead['customer_id']}.json").read_text(encoding="utf-8")
    )
    assert customer["estimates"][0]["known_total_rub"] == 7200

    conflict = client.patch(
        f"/api/v1/leads/{lead['id']}/manager/items/{line_id}",
        headers={"X-Lead-Manager-Token": token},
        json={"revision": current["revision"], "quantity": 4},
    )
    assert conflict.status_code == 409

    removed = client.request(
        "DELETE",
        f"/api/v1/leads/{lead['id']}/manager/items/{line_id}",
        headers={"X-Lead-Manager-Token": token},
        json={"revision": updated.json()["revision"]},
    )
    assert removed.status_code == 200
    assert removed.json()["estimate"]["lines"] == []
    assert removed.json()["removed_lines"][0]["id"] == line_id

    restored = client.post(
        f"/api/v1/leads/{lead['id']}/manager/items/{line_id}/restore",
        headers={"X-Lead-Manager-Token": token},
        json={"revision": removed.json()["revision"]},
    )
    assert restored.status_code == 200
    assert restored.json()["estimate"]["known_subtotal_rub"] == 7200

    added = client.post(
        f"/api/v1/leads/{lead['id']}/manager/items",
        headers={"X-Lead-Manager-Token": token},
        json={
            "revision": restored.json()["revision"],
            "label": "Доставка",
            "quantity": 1,
            "unitPriceRub": 1500,
            "matchStatus": "manual",
        },
    )
    assert added.status_code == 201
    assert added.json()["estimate"]["known_subtotal_rub"] == 8700
    assert added.json()["estimate"]["lines"][-1]["match_status"] == "manual"

    revision = added.json()["revision"]
    snapshot = client.post(
        f"/api/v1/leads/{lead['id']}/manager/save",
        headers={"X-Lead-Manager-Token": token},
        json={"revision": revision},
    )
    assert snapshot.status_code == 200
    assert snapshot.json()["revision"] == revision
    assert (lead_dir / "estimate-revisions" / f"revision-{revision}.json").is_file()

    pdf_content = b"%PDF-1.7\nmanager estimate\n%%EOF"
    generated_pdf = client.post(
        f"/api/v1/leads/{lead['id']}/manager/pdf",
        headers={"X-Lead-Manager-Token": token},
        data={"revision": str(revision)},
        files={"pdf_file": ("estimate.pdf", pdf_content, "application/pdf")},
    )
    assert generated_pdf.status_code == 201
    assert generated_pdf.json()["revision"] == revision
    assert (lead_dir / "manager-estimate.pdf").read_bytes() == pdf_content
    downloaded_pdf = client.get(
        f"/api/v1/leads/{lead['id']}/manager/pdf",
        headers={"X-Lead-Manager-Token": token},
    )
    assert downloaded_pdf.status_code == 200
    assert downloaded_pdf.content == pdf_content


def test_rejects_invalid_structured_estimate_before_creating_lead(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.router.settings.media_storage_dir", str(tmp_path))
    client = TestClient(app)

    response = client.post(
        "/api/v1/leads",
        data={
            "name": "Иван",
            "contact_method": "phone",
            "contact": "+7 999 123-45-67",
            "estimate_json": json.dumps({"schemaVersion": 1, "lines": []}),
            "personal_data_consent": "true",
            "consent_version": "2026-08-11",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Некорректная структура BOM"
    assert not (tmp_path / "leads").exists()


def test_rejects_invalid_telegram_contact(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.router.settings.media_storage_dir", str(tmp_path))
    client = TestClient(app)
    response = client.post(
        "/api/v1/leads",
        data={
            "name": "Иван",
            "contact_method": "telegram",
            "contact": "не ник",
            "personal_data_consent": "true",
            "consent_version": "2026-08-11",
        },
    )
    assert response.status_code == 422
    assert not (tmp_path / "leads").exists()


def test_honeypot_filters_bot_without_saving_lead(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.router.settings.media_storage_dir", str(tmp_path))
    client = TestClient(app)
    response = client.post(
        "/api/v1/leads",
        data={
            "name": "Spam Bot",
            "phone": "+7 999 123-45-67",
            "website": "https://spam.example",
            "personal_data_consent": "true",
            "consent_version": "2026-08-11",
        },
    )
    assert response.status_code == 201
    assert response.json()["email_status"] == "filtered"
    assert not (tmp_path / "leads").exists()
