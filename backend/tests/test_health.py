from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app, create_app


def test_health() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_private_lead_files_are_not_public(tmp_path, monkeypatch) -> None:
    lead_dir = tmp_path / "leads" / "private-lead"
    lead_dir.mkdir(parents=True)
    (lead_dir / "lead.json").write_text('{"phone":"+79990000000"}', encoding="utf-8")
    catalog_dir = tmp_path / "catalog"
    catalog_dir.mkdir()
    (catalog_dir / "photo.txt").write_text("public", encoding="utf-8")

    monkeypatch.setattr(settings, "media_storage_dir", str(tmp_path))
    client = TestClient(create_app())

    assert client.get("/media/leads/private-lead/lead.json").status_code == 404
    public_response = client.get("/media/catalog/photo.txt")
    assert public_response.status_code == 200
    assert public_response.text == "public"
