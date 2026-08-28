from fastapi.testclient import TestClient

from app.main import app
from app.modules.admin.auth import create_admin_session, valid_admin_session


def test_admin_session_is_signed_and_expires(monkeypatch) -> None:
    monkeypatch.setattr("app.modules.admin.auth.settings.bom_admin_token", "strong-secret")
    token = create_admin_session(now=1_000)

    assert valid_admin_session(token, now=1_001)
    assert not valid_admin_session(token + "changed", now=1_001)
    assert not valid_admin_session(token, now=1_000 + 31 * 24 * 60 * 60)


def test_admin_login_sets_http_only_cookie_and_logout_clears_it(monkeypatch) -> None:
    monkeypatch.setattr("app.modules.admin.auth_router.settings.bom_admin_token", "strong-secret")
    monkeypatch.setattr("app.modules.admin.auth.settings.bom_admin_token", "strong-secret")
    monkeypatch.setattr("app.modules.admin.auth_router.settings.admin_session_cookie_secure", False)
    client = TestClient(app)

    denied = client.post("/api/v1/admin/auth/login", json={"password": "wrong"})
    assert denied.status_code == 401

    logged_in = client.post("/api/v1/admin/auth/login", json={"password": "strong-secret"})
    assert logged_in.status_code == 200
    assert "HttpOnly" in logged_in.headers["set-cookie"]
    assert "SameSite=lax" in logged_in.headers["set-cookie"]

    session = client.get("/api/v1/admin/auth/session")
    assert session.status_code == 200
    assert session.json() == {"authenticated": True}

    logged_out = client.post("/api/v1/admin/auth/logout")
    assert logged_out.status_code == 200
    assert client.get("/api/v1/admin/auth/session").json() == {"authenticated": False}


def test_catalog_admin_api_rejects_anonymous_requests(monkeypatch) -> None:
    monkeypatch.setattr("app.modules.boms.dependencies.settings.bom_admin_token", "strong-secret")
    response = TestClient(app).get("/api/v1/admin/categories")
    assert response.status_code == 401
