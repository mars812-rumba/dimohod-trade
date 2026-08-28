from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.leads.customer_router import router
from app.modules.leads.customers import canonical_contact, list_customers, upsert_customer

app = FastAPI()
app.include_router(router, prefix="/api/v1/admin/customers")


def estimate(profile_name: str, total: int) -> dict:
    return {
        "status": "submitted",
        "estimate": {
            "profile_name": profile_name,
            "lines": [{"label": "Труба"}],
            "known_subtotal_rub": total,
            "total_units": 2,
        },
    }


def test_phone_and_whatsapp_contacts_use_one_customer_identity() -> None:
    assert canonical_contact("phone", "8 (999) 123-45-67") == "phone:79991234567"
    assert canonical_contact("whatsapp", "+7 999 123 45 67") == "phone:79991234567"


def test_upsert_customer_collects_estimates_without_duplicates(tmp_path) -> None:
    created_at = datetime.now(UTC).isoformat()
    first_id = upsert_customer(
        tmp_path,
        lead_id="lead-one",
        name="Иван Петров",
        contact_method="phone",
        contact="8 999 123-45-67",
        created_at=created_at,
        envelope=estimate("Баня", 5000),
    )
    second_id = upsert_customer(
        tmp_path,
        lead_id="lead-two",
        name="Иван Петров",
        contact_method="whatsapp",
        contact="+7 999 123-45-67",
        created_at=created_at,
        envelope=estimate("Дом", 9000),
    )

    assert first_id == second_id
    customers = list_customers(tmp_path)
    assert len(customers) == 1
    assert {item["profile_name"] for item in customers[0]["estimates"]} == {"Баня", "Дом"}
    assert len(customers[0]["contacts"]) == 2
    assert list_customers(tmp_path, "Иван") == customers
    assert list_customers(tmp_path, "Дом") == customers


def test_customer_api_requires_admin_token_and_supports_search(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr("app.modules.leads.customer_router.settings.media_storage_dir", str(tmp_path))
    monkeypatch.setattr("app.modules.boms.dependencies.settings.bom_admin_token", "manager-secret")
    upsert_customer(
        tmp_path,
        lead_id="lead-one",
        name="Анна",
        contact_method="email",
        contact="anna@example.com",
        created_at=datetime.now(UTC).isoformat(),
        envelope=estimate("Камин", 7000),
    )
    client = TestClient(app)

    assert client.get("/api/v1/admin/customers").status_code == 401
    response = client.get(
        "/api/v1/admin/customers?q=Камин",
        headers={"X-BOM-Admin-Token": "manager-secret"},
    )

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["content-type"].startswith("application/json")
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["name"] == "Анна"
