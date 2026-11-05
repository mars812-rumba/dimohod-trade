import json

from fastapi.testclient import TestClient

from app.main import app
from app.modules.leads.customers import upsert_customer
from app.modules.leads.notes import read_notes


def test_notes_require_admin_and_detect_stale_edits(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.customer_router.settings.media_storage_dir", str(tmp_path))
    monkeypatch.setattr("app.modules.boms.dependencies.settings.bom_admin_token", "test-admin")
    lead_id = "a" * 32
    directory = tmp_path / "leads" / lead_id
    directory.mkdir(parents=True)
    (directory / "lead.json").write_text(json.dumps({"id": lead_id}))
    customer_id = upsert_customer(tmp_path, lead_id=lead_id, name="Recovery test", contact_method="email",
                                  contact="test@example.invalid", created_at="2026-11-04T00:00:00Z",
                                  envelope={"estimate": {"lines": [], "known_subtotal_rub": 0}})
    client = TestClient(app)
    url = f"/api/v1/admin/customers/{customer_id}/estimates/{lead_id}/notes"
    payload = {"notes": "Первая строка\nВторая строка", "expected_notes": ""}
    assert client.patch(url, json=payload).status_code == 401
    headers = {"X-BOM-Admin-Token": "test-admin"}
    response = client.patch(url, json=payload, headers=headers)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert read_notes(tmp_path, lead_id) == payload["notes"]
    assert client.patch(url, json={"notes": "stale", "expected_notes": ""}, headers=headers).status_code == 409
    assert read_notes(tmp_path, lead_id) == payload["notes"]
    wrong = url.replace(lead_id, "b" * 32)
    assert client.patch(wrong, json=payload, headers=headers).status_code == 404
    assert client.patch(url, json={"notes": "x" * 5001, "expected_notes": ""}, headers=headers).status_code == 422


def test_private_customer_records_are_not_public_media():
    client = TestClient(app)
    assert client.get("/media/customers/test.json").status_code == 404
    assert client.get("/media/leads/test/notes.json").status_code == 404
