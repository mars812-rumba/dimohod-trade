import json

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
        lambda record, attachment: delivered.append((record, attachment)) or True,
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
