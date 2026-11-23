"""Opt-in loopback browser harness: synthetic CRM only, no database or SMTP."""
import json
import os
from pathlib import Path

from fastapi import FastAPI

if os.environ.get("DIMOHOD_CUSTOMER_INQUIRIES_PREVIEW") != "1":
    raise RuntimeError("Requires DIMOHOD_CUSTOMER_INQUIRIES_PREVIEW=1")

from app.core.config import settings
from app.modules.admin.auth import create_admin_session
from app.modules.leads import router as leads
from app.modules.leads.customer_router import router as customers_router
from app.modules.leads.customers import upsert_customer

root = Path(settings.media_storage_dir).resolve()
if root.parent != Path("/tmp") or not root.name.startswith("dimohod-"):
    raise RuntimeError("Preview requires dedicated /tmp/dimohod-* storage")
settings.bom_admin_token = "local-inquiry-preview-only"
leads.send_lead_email = lambda *args, **kwargs: False
leads.send_customer_confirmation_email = lambda *args, **kwargs: False
app = FastAPI()
app.include_router(customers_router, prefix="/api/v1/admin/customers")
app.include_router(leads.router, prefix="/api/v1/leads")

for lead_id, contact, name in [("a" * 32, "+7 999 000-00-01", "Тестовая заявка"),
                              ("b" * 32, "+7 999 000-00-02", "Заявка и смета")]:
    directory = root / "leads" / lead_id
    directory.mkdir(parents=True, exist_ok=True)
    if not (directory / "lead.json").exists():
        record = {"id": lead_id, "created_at": "2026-11-23T16:20:39+00:00", "name": name,
                  "contact_method": "phone", "contact": contact, "source": "homepage-materials",
                  "comment": "Прошу перезвонить\nЕсть фото печи", "configuration": "Страница заявки: https://dimohod-trade.pro/",
                  "attachment": "attachment.pdf", "estimate": None, "email_status": "sent"}
        (directory / "lead.json").write_text(json.dumps(record, ensure_ascii=False))
        (directory / "attachment.pdf").write_bytes(b"%PDF-synthetic-inquiry-only")

estimate_id = "c" * 32
directory = root / "leads" / estimate_id
directory.mkdir(parents=True, exist_ok=True)
envelope = {"status": "submitted", "estimate": {"profile_name": "Тестовая смета", "lines": [], "known_subtotal_rub": 15000}}
if not (directory / "lead.json").exists():
    cid = upsert_customer(root, lead_id=estimate_id, name="Заявка и смета", contact_method="whatsapp",
                          contact="+79990000002", created_at="2026-11-23T17:00:00+00:00", envelope=envelope)
    (directory / "lead.json").write_text(json.dumps({"id": estimate_id, "customer_id": cid, "estimate": "estimate.json"}))
    (directory / "estimate.json").write_text(json.dumps(envelope))


@app.get("/api/v1/customer-inquiries-test-preview")
def preview_marker():
    return {"isolated_customer_inquiries_preview": True, "admin_session": create_admin_session()}


@app.get("/api/v1/catalog/tree")
def empty_catalog():
    return {"items": []}
