"""Loopback-only form test harness: local writes, public GETs, no database/mail."""
import json
from asyncio import to_thread
from urllib.error import HTTPError
from urllib.request import urlopen

from fastapi.responses import JSONResponse, Response

from tests.ready_kits_preview import app, test_storage
from app.modules.leads import router as leads

# ready_kits_preview enforces an explicit opt-in and /tmp/dimohod-* storage.
leads.send_lead_email = lambda *args, **kwargs: False
leads.send_customer_confirmation_email = lambda *args, **kwargs: False
cache = {}


def public_get(path):
    if path not in cache:
        try:
            with urlopen("https://dimohod-trade.pro" + path, timeout=30) as result:
                cache[path] = result.status, result.headers.get("Content-Type", "application/json"), result.read()
        except HTTPError as error:
            cache[path] = error.code, "application/json", error.read()
    return cache[path]


@app.middleware("http")
async def isolated_forms(request, call_next):
    path = request.url.path
    if request.method == "GET" and path == "/api/v1/contact-forms-test-preview":
        records = [json.loads(file.read_text()) for file in (test_storage / "leads").glob("*/lead.json")]
        return JSONResponse({"isolated_contact_forms_preview": True, "records": [
            {key: record.get(key) for key in ("id", "source", "intent", "contact_method", "contact", "phone")}
            for record in records
        ]})
    if request.method == "GET" and (path in {"/api/v1/catalog/tree", "/api/v1/products", "/api/v1/ready-kits"}
                                    or path.startswith(("/api/v1/products/", "/api/v1/ready-kits/", "/media/"))):
        upstream = path + ("?" + request.url.query if request.url.query else "")
        status, content_type, body = await to_thread(public_get, upstream)
        return Response(body, status_code=status, headers={"Content-Type": content_type})
    if request.method != "GET" and not (path == "/api/v1/leads" or
        (path.startswith("/api/v1/ready-kits/") and path.endswith("/inquiry")) or
        (path.startswith("/api/v1/leads/") and path.endswith("/callback"))):
        return JSONResponse({"detail": "Contact form tests only"}, status_code=405)
    return await call_next(request)
