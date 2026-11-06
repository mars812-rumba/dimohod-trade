import json
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.leads.customer_router import router
from app.modules.leads.customers import canonical_contact, list_customers, upsert_customer

app = FastAPI()
app.include_router(router, prefix="/api/v1/admin/customers")


def estimate(profile_name: str, total: int, quotation_number: str = "") -> dict:
    return {
        "quotation_number": quotation_number,
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
        envelope=estimate("Дом", 9000, "КП-2026-15"),
    )

    assert first_id == second_id
    customers = list_customers(tmp_path)
    assert len(customers) == 1
    assert {item["profile_name"] for item in customers[0]["estimates"]} == {"Баня", "Дом"}
    assert len(customers[0]["contacts"]) == 2
    assert {item["quotation_number"] for item in customers[0]["estimates"]} == {
        "",
        "КП-2026-15",
    }
    assert list_customers(tmp_path, "Иван") == customers
    assert list_customers(tmp_path, "Дом") == customers
    assert list_customers(tmp_path, "КП-2026-15") == customers


def test_list_customers_reads_legacy_quotation_number_from_estimate(tmp_path) -> None:
    lead_id = "a" * 32
    created_at = datetime.now(UTC).isoformat()
    customer_id = upsert_customer(
        tmp_path,
        lead_id=lead_id,
        name="Олег",
        contact_method="phone",
        contact="+7 900 000-00-00",
        created_at=created_at,
        envelope=estimate("Дом", 12000),
    )
    customer_path = tmp_path / "customers" / f"{customer_id}.json"
    customer = json.loads(customer_path.read_text(encoding="utf-8"))
    customer["estimates"][0].pop("quotation_number")
    customer_path.write_text(json.dumps(customer), encoding="utf-8")
    lead_dir = tmp_path / "leads" / lead_id
    lead_dir.mkdir(parents=True)
    (lead_dir / "estimate.json").write_text(
        json.dumps(estimate("Дом", 12000, "2026-11/42")),
        encoding="utf-8",
    )

    customers = list_customers(tmp_path, "2026-11/42")

    assert customers[0]["estimates"][0]["quotation_number"] == "2026-11/42"


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
