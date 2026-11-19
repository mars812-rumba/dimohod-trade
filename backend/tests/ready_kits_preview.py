"""Loopback-only visual test harness. Never used by the production application."""
import json
import os
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID

if os.environ.get("DIMOHOD_READY_KITS_PREVIEW") != "1":
    raise RuntimeError("This harness requires DIMOHOD_READY_KITS_PREVIEW=1")

from fastapi.routing import APIRoute

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.modules.boms.dependencies import require_bom_admin
from app.modules.ready_kits import service

test_storage = Path(settings.media_storage_dir).resolve()
if test_storage.parent != Path("/tmp") or not test_storage.name.startswith("dimohod-"):
    raise RuntimeError("Preview writes require a dedicated /tmp/dimohod-* storage directory")
raw = json.loads(Path(__file__).with_name("fixtures").joinpath("ready_kits_catalog.json").read_text())
skus = {}
for item in raw:
    item["id"] = UUID(item["id"])
    item["product"] = SimpleNamespace(**item["product"])
    skus[str(item["id"])] = SimpleNamespace(**item)


async def load_skus(_session, _kits):
    return skus


async def no_db():
    yield None


async def allow_test_admin():
    return None


async def empty_categories():
    return {"items": []}


async def isolated_preview():
    return {"isolated_ready_kits_preview": True}


service.load_skus = load_skus
app.dependency_overrides[get_db] = no_db
app.dependency_overrides[require_bom_admin] = allow_test_admin
# Avoid any unrelated catalog/DB access from the shared navigation in this preview.
app.router.routes.insert(0, APIRoute("/api/v1/catalog/tree", empty_categories))
app.router.routes.insert(0, APIRoute("/api/v1/ready-kits-test-preview", isolated_preview))
