import json
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.modules.ready_kits import service
from app.modules.ready_kits.schemas import KitContent, KitLine, KitUpdate


@pytest.fixture
def catalog(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "media_storage_dir", str(tmp_path))
    skus = {}
    for kit in service.definitions().values():
        for line in kit.lines:
            skus[str(line.sku_id)] = SimpleNamespace(
                id=line.sku_id, article=f"REAL-{line.sku_id}", name="Каталожное изделие",
                is_active=True, product=SimpleNamespace(
                    is_active=True, name="Семейство", slug="family", product_kind="крепеж"
                ), price_rub=Decimal("10.01"), attributes={}, diameter_mm=115,
                outer_diameter_mm=None, length_mm=1000, steel_grade="AISI 304",
                wall_thickness_mm=Decimal("0.8"), insulation_mm=None,
            )

    async def load(_session, _kits):
        return skus

    monkeypatch.setattr(service, "load_skus", load)
    return skus


@pytest.fixture
def client(catalog, monkeypatch):
    monkeypatch.setattr(settings, "bom_admin_token", "ready-kits-test-only")

    async def db():
        yield object()

    app.dependency_overrides[get_db] = db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)


def update_payload(kit, **changes):
    values = {"revision": kit.revision, "lines": kit.lines, "description": kit.description,
              "limitations": kit.limitations, "approved": True, "published": True}
    values.update(changes)
    return KitUpdate(**values)


def test_matrix_contains_twelve_owner_approved_specs(catalog):
    kits = list(service.definitions().values())
    assert len(kits) == 12
    assert {k.diameter_mm for k in kits} == {115, 120, 150}
    assert all(k.lines and k.published and k.status == "approved" and k.approved_at for k in kits)
    assert all(not k.approval_notes for k in kits)
    roof4 = next(k for k in kits if k.route == "roof" and k.height_m == 4 and k.diameter_mm == 115)
    roof6 = next(k for k in kits if k.route == "roof" and k.height_m == 6 and k.diameter_mm == 115)
    assert [line.quantity for line in roof4.lines[:5]] == [1, 1, 1, 1, 2]
    assert [line.quantity for line in roof6.lines[:5]] == [1, 1, 1, 1, 5]
    assert all(k.source_revision == 7 and k.source_sha256 for k in kits if k.diameter_mm == 115)
    assert all(k.preparation_basis for k in kits if k.diameter_mm != 115)


def test_all_twelve_kits_have_content_without_mutating_saved_boms(client, catalog):
    seed_dir = Path(service.__file__).parent
    approved = json.loads((seed_dir / "approved.json").read_text())
    prepared = json.loads((seed_dir / "prepared.json").read_text())
    descriptions = set()
    for kit in service.definitions().values():
        scheme = f"{kit.route}-{kit.height_m}"
        seed = approved[scheme] if kit.diameter_mm == 115 else prepared[f"{scheme}-d{kit.diameter_mm}"]
        assert [line.model_dump(mode="json") for line in kit.lines] == seed["lines"]
        assert kit.content and len(kit.content.faq) == 6
        assert len(kit.content.selection_checklist) == 6
        response = client.get(f"/api/v1/ready-kits/{kit.slug}").json()["kit"]
        content = response["content"]
        assert all(content[field] for field in ("short_description", "application_description", "composition_description"))
        assert f"Ø{kit.diameter_mm} мм" in content["seo_description"]
        assert "{diameter}" not in content["seo_description"]
        assert "Редактору:" not in json.dumps(content, ensure_ascii=False)
        descriptions.add(content["seo_description"])
    assert len(descriptions) == 12
    assert not (Path(settings.media_storage_dir) / "ready-kits").exists()


@pytest.mark.parametrize("custom", [None, "Текст менеджера", "Д" * 1500])
def test_legacy_content_inheritance_preserves_manual_text_without_writing(catalog, custom):
    kit = service.get_definition("cherez-perekrytie-4m-d115")
    legacy = kit.model_dump(mode="json", exclude={"content"})
    if custom is not None:
        legacy["description"] = custom
    directory = Path(settings.media_storage_dir) / "ready-kits"
    directory.mkdir()
    path = directory / f"{kit.slug}.json"
    original = json.dumps(legacy, ensure_ascii=False)
    path.write_text(original)
    loaded = service.get_definition(kit.slug)
    assert loaded.content and len(loaded.content.faq) == 6
    if custom is not None:
        assert loaded.description == custom and loaded.content.application_description == custom
        assert loaded.content.short_description == (custom if len(custom) <= 1200 else "")
    assert path.read_text() == original


def test_legacy_changed_bom_does_not_inherit_composition_text(catalog):
    kit = service.get_definition("cherez-perekrytie-4m-d115")
    legacy = kit.model_dump(mode="json", exclude={"content"})
    legacy["lines"][0]["quantity"] += 1
    directory = Path(settings.media_storage_dir) / "ready-kits"
    directory.mkdir()
    (directory / f"{kit.slug}.json").write_text(json.dumps(legacy))
    assert service.get_definition(kit.slug).content is None


async def test_content_edits_persist_with_history_and_leave_prices_bom_and_approval_unchanged(client, catalog):
    kit = service.get_definition("cherez-perekrytie-4m-d115")
    before = client.get(f"/api/v1/ready-kits/{kit.slug}").json()["kit"]
    content = kit.content.model_copy(update={
        "short_description": "Короткий текст редактора",
        "application_description": "Основной текст редактора",
        "seo_description": "Комплект Ø{diameter} мм — описание редактора",
        "faq": [],
    })
    await service.save_kit(None, kit.slug, update_payload(kit, content=content, description=content.application_description))
    loaded = service.get_definition(kit.slug)
    assert loaded.content == content
    assert loaded.lines == kit.lines and loaded.status == kit.status and loaded.published == kit.published
    assert loaded.source_sha256 == kit.source_sha256
    after = client.get(f"/api/v1/ready-kits/{kit.slug}").json()["kit"]
    assert before["lines"] == after["lines"] and before["total_rub"] == after["total_rub"]
    assert after["content"]["faq"] == []
    assert "Ø115 мм" in after["content"]["seo_description"]
    history = Path(settings.media_storage_dir) / "ready-kits" / "history" / kit.slug / "revision-1.json"
    assert json.loads(history.read_text())["content"] == kit.content.model_dump(mode="json")
    await service.save_kit(None, kit.slug, update_payload(loaded, content=None))
    assert service.get_definition(kit.slug).content is None


async def test_legacy_editor_preserves_content_but_changed_bom_clears_it(catalog):
    kit = service.get_definition("cherez-perekrytie-4m-d115")
    await service.save_kit(None, kit.slug, update_payload(kit))
    unchanged = service.get_definition(kit.slug)
    assert unchanged.content == kit.content
    await service.save_kit(None, kit.slug, update_payload(unchanged, description="Правка старого редактора"))
    edited = service.get_definition(kit.slug)
    assert edited.content.application_description == "Правка старого редактора"
    lines = [line.model_copy() for line in edited.lines]
    lines[0].quantity += 1
    await service.save_kit(None, kit.slug, update_payload(edited, lines=lines))
    assert service.get_definition(kit.slug).content is None


@pytest.mark.parametrize("content", [
    {"faq": [{"question": " ", "answer": "Ответ"}]},
    {"faq": [{"question": "Вопрос", "answer": ""}]},
    {"short_description": "А" * 1201}, {"seo_description": "А" * 321},
    {"selection_checklist": [""]}, {"unexpected": "нельзя"},
])
def test_admin_content_validation(client, content):
    kit = service.get_definition("cherez-perekrytie-4m-d115")
    payload = update_payload(kit).model_dump(mode="json")
    payload["content"] = content
    response = client.put(f"/api/v1/admin/ready-kits/{kit.slug}", json=payload,
                          headers={"X-BOM-Admin-Token": "ready-kits-test-only"})
    assert response.status_code == 422


def test_content_fields_trim_whitespace():
    content = KitContent(short_description=" текст ", faq=[{"question": " Вопрос ", "answer": " Ответ "}])
    assert content.short_description == "текст"
    assert content.faq[0].question == "Вопрос" and content.faq[0].answer == "Ответ"


def test_public_only_returns_approved_active_specs_without_private_provenance(client):
    response = client.get("/api/v1/ready-kits")
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 12 and {k["diameter_mm"] for k in items} == {115, 120, 150}
    assert response.headers["cache-control"] == "no-store"
    text = response.text
    for private in ("source_sha256", "source_revision", "contact", "customer", "lead_id", "approved_at", "preparation_basis", "approval_notes"):
        assert private not in text


async def test_drafts_are_404_and_never_appear_in_variant_links(client):
    kit = service.get_definition("cherez-perekrytie-4m-d120")
    await service.save_kit(None, kit.slug, update_payload(kit, approved=False, published=False))
    assert client.get("/api/v1/ready-kits/cherez-perekrytie-4m-d120").status_code == 404
    assert client.get("/api/v1/ready-kits/unknown").status_code == 404
    data = client.get("/api/v1/ready-kits/cherez-perekrytie-4m-d115").json()
    assert len(data["variants"]) == 11
    assert all(k["slug"] != kit.slug for k in data["variants"])


def test_prepared_specs_without_explicit_owner_approval_stay_private(client, monkeypatch):
    path = Path(service.__file__).with_name("prepared.json")
    data = json.loads(path.read_text())
    data["roof-4-d120"].pop("approval")
    read_text = Path.read_text

    def read(self, *args, **kwargs):
        return json.dumps(data) if self == path else read_text(self, *args, **kwargs)

    monkeypatch.setattr(Path, "read_text", read)
    kit = service.get_definition("cherez-perekrytie-4m-d120")
    assert kit.lines and kit.status == "draft" and not kit.published and kit.approved_at is None
    assert kit.approval_notes
    assert client.get(f"/api/v1/ready-kits/{kit.slug}").status_code == 404


def test_prices_are_live_and_decimal_totals_are_not_snapshot_prices(client, catalog):
    path = "/api/v1/ready-kits/cherez-perekrytie-4m-d115"
    before = client.get(path).json()["kit"]
    first = before["lines"][0]
    catalog[first["sku_id"]].price_rub = Decimal("27.19")
    after = client.get(path).json()["kit"]
    assert after["lines"][0]["unit_price_rub"] == "27.19"
    assert Decimal(after["total_rub"]) - Decimal(before["total_rub"]) == Decimal("17.18")
    assert Decimal(after["total_rub"]) == sum(Decimal(l["line_total_rub"]) for l in after["lines"])


def test_kit_media_prefers_exact_sku_then_applicable_family_and_never_other_variants(client, catalog):
    target = next(iter(catalog.values()))
    target.product.extra_attributes = {"media": [
        {"url": "/media/catalog/general.jpg", "role": "general"},
        {"url": "/media/catalog/wrong-length.jpg", "role": "general", "lengths_mm": [250]},
    ]}
    path = "/api/v1/ready-kits/cherez-perekrytie-4m-d115"
    line = client.get(path).json()["kit"]["lines"][0]
    assert line["primary_image"]["url"] == "/media/catalog/general.jpg"
    assert line["characteristic_groups"][0]["kind"] == "general"
    target.attributes = {"sku_media": [{"url": "/media/catalog/exact.jpg", "role": "general"}]}
    assert client.get(path).json()["kit"]["lines"][0]["primary_image"]["url"] == "/media/catalog/exact.jpg"
    target.attributes = {}
    target.product.extra_attributes["media"] = [{"url": "/media/catalog/other.jpg", "role": "general", "diameter_keys": ["999"]}]
    assert client.get(path).json()["kit"]["lines"][0]["primary_image"] is None


@pytest.mark.parametrize("price", [None, Decimal(0), Decimal(-1), Decimal("NaN")])
def test_absent_or_invalid_price_is_not_silently_zero(client, catalog, price):
    next(iter(catalog.values())).price_rub = price
    kit = client.get("/api/v1/ready-kits/cherez-perekrytie-4m-d115").json()["kit"]
    assert kit["total_rub"] is None and kit["unpriced_count"] == 1
    assert kit["lines"][0]["unit_price_rub"] is None


@pytest.mark.parametrize("change", ["missing", "inactive", "inactive_product", "placeholder", "wrong_diameter"])
def test_invalid_catalog_line_hides_whole_kit(client, catalog, change):
    key = str(service.get_definition("cherez-perekrytie-4m-d115").lines[0].sku_id)
    sku = catalog[key]
    if change == "missing":
        del catalog[key]
    elif change == "inactive":
        sku.is_active = False
    elif change == "inactive_product":
        sku.product.is_active = False
    elif change == "placeholder":
        sku.article = "RECOVERY-TEMP-POWER-CLAMP-D215"
    else:
        sku.product.product_kind = "труба"
        sku.diameter_mm = 120
    assert client.get("/api/v1/ready-kits/cherez-perekrytie-4m-d115").status_code == 404


def test_admin_routes_require_authentication(client):
    assert client.get("/api/v1/admin/ready-kits").status_code == 401
    assert client.put("/api/v1/admin/ready-kits/cherez-perekrytie-4m-d115", json={}).status_code == 401
    response = client.get("/api/v1/admin/ready-kits", headers={"X-BOM-Admin-Token": "ready-kits-test-only"})
    assert response.status_code == 200 and len(response.json()["items"]) == 12


async def test_approval_is_explicit_and_overrides_survive_seed_reload(catalog):
    draft = service.get_definition("cherez-perekrytie-4m-d120")
    with pytest.raises(HTTPException) as error:
        await service.save_kit(None, draft.slug, update_payload(draft, lines=[]))
    assert error.value.status_code == 422
    sku = next(iter(catalog.values()))
    sku.product.product_kind = "труба"
    sku.diameter_mm = 120
    line = KitLine(sku_id=sku.id, quantity=3, label="Согласованная строка")
    saved = await service.save_kit(None, draft.slug, update_payload(draft, lines=[line]))
    assert saved["definition"]["revision"] == 2
    assert saved["definition"]["status"] == "approved"
    assert saved["definition"]["preparation_basis"] is None
    assert service.get_definition(draft.slug).lines == [line]
    assert draft.slug in [k["slug"] for k in await service.public_kits(None)]
    with pytest.raises(HTTPException) as error:
        await service.save_kit(None, draft.slug, update_payload(draft, lines=[line]))
    assert error.value.status_code == 409


async def test_unpublish_is_persistent_and_history_is_private(catalog):
    kit = service.get_definition("cherez-perekrytie-4m-d115")
    await service.save_kit(None, kit.slug, update_payload(kit, approved=False, published=False))
    assert kit.slug not in [k["slug"] for k in await service.public_kits(None)]
    history = Path(settings.media_storage_dir) / "ready-kits/history" / kit.slug / "revision-1.json"
    assert json.loads(history.read_text())["published"] is True
    with pytest.raises(HTTPException):
        await service.save_kit(None, kit.slug, update_payload(service.get_definition(kit.slug), approved=False, published=True))


def test_corrupt_override_never_republishes_seed(catalog):
    kit = service.get_definition("cherez-perekrytie-4m-d115")
    directory = Path(settings.media_storage_dir) / "ready-kits"
    directory.mkdir()
    (directory / f"{kit.slug}.json").write_text("broken")
    with pytest.raises(HTTPException) as error:
        service.definitions()
    assert error.value.status_code == 503


async def test_existing_runtime_draft_is_not_overwritten_by_new_prepared_seed(catalog):
    draft = service.get_definition("cherez-perekrytie-4m-d120")
    await service.save_kit(None, draft.slug, update_payload(draft, lines=[], approved=False, published=False))
    assert service.get_definition(draft.slug).lines == []
    assert service.get_definition(draft.slug).revision == 2


async def test_private_media_block(tmp_path):
    from app.main import PublicMediaFiles
    directory = tmp_path / "ready-kits"
    directory.mkdir()
    (directory / "spec.json").write_text('{"published":false}')
    files = PublicMediaFiles(directory=tmp_path)
    response = await files.get_response("ready-kits/spec.json", {"type": "http", "method": "GET", "headers": []})
    assert response.status_code == 404


def test_prepared_diameters_use_exact_catalog_variants_and_preserve_approved_quantities(catalog):
    rows = json.loads(Path(__file__).with_name("fixtures").joinpath("ready_kits_catalog.json").read_text())
    actual = {item["id"]: item for item in rows}
    seeds = json.loads(Path(service.__file__).with_name("approved.json").read_text())
    prepared = json.loads(Path(service.__file__).with_name("prepared.json").read_text())
    for scheme, seed in seeds.items():
        for diameter in (120, 150):
            draft = prepared[f"{scheme}-d{diameter}"]
            assert draft["source_sha256"] == seed["sha256"]
            assert len(draft["lines"]) == len(seed["lines"])
            for original, replacement in zip(seed["lines"], draft["lines"], strict=True):
                assert replacement["quantity"] == original["quantity"]
                assert replacement["label"] == original["label"]
                old, new = actual[original["sku_id"]], actual[replacement["sku_id"]]
                assert new["is_active"] and new["product"]["is_active"]
                assert old["product"]["id"] == new["product"]["id"]
                for field in ("material", "steel_grade", "wall_thickness_mm", "length_mm", "angle_deg", "contour", "insulation_mm"):
                    assert old[field] == new[field], (scheme, diameter, field)
                for field in ("outer_material", "outer_steel_grade", "outer_wall_thickness_mm"):
                    assert old["attributes"].get(field) == new["attributes"].get(field)
                if old["diameter_mm"] == 115:
                    assert new["diameter_mm"] == diameter
                    if old["outer_diameter_mm"]:
                        assert new["outer_diameter_mm"] == diameter + 100
                elif old["diameter_mm"] == 215:
                    assert new["diameter_mm"] == diameter + 100
                    assert new["steel_grade"] == "AISI 430" and Decimal(new["wall_thickness_mm"]) == Decimal("0.8")
                else:
                    assert new["id"] == old["id"]


def inquiry_payload(**changes):
    return {"contact_method": "phone", "contact": "+7 999 123-45-67", "intent": "order",
            "personal_data_consent": True, "consent_version": "2026-08-11", **changes}


@pytest.mark.parametrize("intent,method,contact", [
    ("order", "phone", "+7 999 123-45-67"), ("order", "telegram", "@kit_buyer"),
    ("consultation", "phone", "+7 999 123-45-67"), ("consultation", "telegram", "@kit_buyer"),
])
def test_inquiry_creates_named_kit_estimate_in_crm_without_customer_name(client, catalog, monkeypatch, intent, method, contact):
    delivered = []
    monkeypatch.setattr("app.modules.leads.router.send_lead_email", lambda *args: delivered.append(args) or True)
    slug = "cherez-stenu-3m-d115"
    # Re-read price on POST, rather than accepting the previously displayed one.
    first = service.get_definition(slug).lines[0]
    catalog[str(first.sku_id)].price_rub = Decimal("321.45")
    response = client.post(f"/api/v1/ready-kits/{slug}/inquiry", json=inquiry_payload(intent=intent, contact_method=method, contact=contact))
    assert response.status_code == 201, response.text
    assert response.json()["email_status"] == "sent"
    assert response.headers["cache-control"] == "no-store"
    assert set(response.json()) == {"id", "status", "email_status"}
    lead_dir = Path(settings.media_storage_dir) / "leads" / response.json()["id"]
    lead = json.loads((lead_dir / "lead.json").read_text())
    envelope = json.loads((lead_dir / "estimate.json").read_text())
    estimate = envelope["estimate"]
    assert lead["name"] == "" and lead["contact"] == contact and lead["contact_method"] == method
    assert lead["source"] == f"ready-kit-{intent}" and lead["intent"] == f"ready_kit_{intent}"
    assert lead["personal_data_consent"] and lead["consented_at"]
    assert envelope["status"] == "submitted" and envelope["customer"]["name"] == ""
    assert estimate["profile_name"] == "Комплект дымохода через стену, 3 м, Ø115 мм"
    assert len(estimate["lines"]) == 14
    assert len({line["key"] for line in estimate["lines"]}) == 14  # Same console SKU in two rows.
    assert estimate["lines"][0]["unit_price_rub"] == 321.45
    customer = json.loads((Path(settings.media_storage_dir) / "customers" / f"{lead['customer_id']}.json").read_text())
    assert customer["name"] == "" and estimate["profile_name"] in json.dumps(customer, ensure_ascii=False)
    assert delivered[0][0]["_estimate"]["profile_name"] == estimate["profile_name"]
    assert delivered[0][2]  # Manager link is included in the notification.
    crm = client.get("/api/v1/admin/customers", headers={"X-BOM-Admin-Token": "ready-kits-test-only"})
    assert crm.status_code == 200 and estimate["profile_name"] in crm.text


@pytest.mark.parametrize("changes", [
    {"personal_data_consent": False}, {"consent_version": "old"}, {"contact": "bad"},
    {"contact_method": "email", "contact": "buyer@example.com"}, {"intent": "bogus"},
    {"name": "Not requested"}, {"lines": []}, {"total_rub": "1"},
])
def test_invalid_inquiry_has_no_side_effects(client, changes):
    response = client.post("/api/v1/ready-kits/cherez-stenu-3m-d115/inquiry", json=inquiry_payload(**changes))
    assert response.status_code == 422
    assert not (Path(settings.media_storage_dir) / "leads").exists()


async def test_drafts_and_unavailable_skus_cannot_be_ordered(client, catalog):
    for slug in ("cherez-stenu-3m-d120", "cherez-stenu-6m-d150"):
        kit = service.get_definition(slug)
        await service.save_kit(None, kit.slug, update_payload(kit, approved=False, published=False))
    for slug in ("unknown", "cherez-stenu-3m-d120", "cherez-stenu-6m-d150"):
        assert client.post(f"/api/v1/ready-kits/{slug}/inquiry", json=inquiry_payload()).status_code == 404
    first = service.get_definition("cherez-stenu-3m-d115").lines[0]
    catalog[str(first.sku_id)].is_active = False
    assert client.post("/api/v1/ready-kits/cherez-stenu-3m-d115/inquiry", json=inquiry_payload()).status_code == 404
    assert not (Path(settings.media_storage_dir) / "leads").exists()


def test_owner_approval_keeps_same_passage_skus_for_all_diameters(catalog):
    seeds = json.loads(Path(service.__file__).with_name("approved.json").read_text())
    prepared = json.loads(Path(service.__file__).with_name("prepared.json").read_text())
    shared = {"767e3b91-c393-5e51-932c-cd5ed853c70e",  # Passage cup
              "2a1a062b-4088-5551-8a7d-32f425d0d9eb",  # Flange 600x600
              "c73b887d-06e9-5151-99cd-5a8103d20a00"}  # Master flash (Roof only)
    for key, item in prepared.items():
        assert item["approval"]["approved"] is True
        assert item["approval"]["approved_at"] == "2026-11-19T10:19:14Z"
        assert "600на 600" in item["approval"]["source"]
        base = seeds[key.rsplit("-d", 1)[0]]
        originals = [line for line in base["lines"] if line["sku_id"] in shared]
        selected = [line for line in item["lines"] if line["sku_id"] in shared]
        assert selected == originals
        assert len(selected) == (3 if key.startswith("roof-") else 2)


def test_unpriced_kit_can_only_request_consultation_and_smtp_failure_keeps_crm(client, catalog, monkeypatch):
    first = service.get_definition("cherez-stenu-3m-d115").lines[0]
    catalog[str(first.sku_id)].price_rub = None
    path = "/api/v1/ready-kits/cherez-stenu-3m-d115/inquiry"
    assert client.post(path, json=inquiry_payload()).status_code == 409
    assert not (Path(settings.media_storage_dir) / "leads").exists()

    def smtp_failure(*_args):
        raise RuntimeError("isolated test SMTP failure")

    monkeypatch.setattr("app.modules.leads.router.send_lead_email", smtp_failure)
    response = client.post(path, json=inquiry_payload(intent="consultation"))
    assert response.status_code == 201 and response.json()["email_status"] == "failed"
    directory = Path(settings.media_storage_dir) / "leads" / response.json()["id"]
    estimate = json.loads((directory / "estimate.json").read_text())["estimate"]
    assert estimate["lines"][0]["unit_price_rub"] is None and estimate["unpriced_line_count"] == 1
    assert len(list((Path(settings.media_storage_dir) / "customers").glob("*.json"))) == 1
