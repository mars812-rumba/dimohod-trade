import base64
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.modules.catalog.service import category_cover
from app.modules.admin.service import (
    extract_openai_output_text,
    build_product_seo_prompt,
    canonical_photo_name,
    decode_photo_payload,
    normalize_media_item,
    normalize_media_list,
    resolve_product_media,
    normalize_seo_knowledge,
    parameterize_sku_meta,
    product_seo_facts,
    remove_dynamic_sku_section,
    safe_asset_name,
    safe_storage_key,
)
from app.modules.products.router import parse_diameter_filter, primary_product_image
from app.modules.products.service import compatible_tube_matches, material_group


def test_admin_routes_are_registered() -> None:
    client = TestClient(app)

    response = client.get("/api/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/admin/categories" in paths
    assert "/api/v1/admin/skus" in paths
    assert "/api/v1/admin/products/{product_id}/skus" in paths
    assert "patch" in paths["/api/v1/admin/products/{product_id}"]
    assert "/api/v1/admin/products/{product_id}/seo/generate" in paths
    assert "/api/v1/admin/products/{product_id}/photos" in paths
    assert "/api/v1/admin/products/{product_id}/photos/upload" in paths
    assert "/api/v1/admin/categories/{category_id}/cover" in paths
    assert "/api/v1/admin/skus/{sku_id}/photo" in paths


def test_normalize_media_list_skips_invalid_items() -> None:
    media = normalize_media_list(
        {
            "media": [
                {"url": "/media/catalog/photo.jpg", "alt": "Фото", "role": "general"},
                {"alt": "broken"},
                "broken",
            ]
        }
    )

    assert len(media) == 1
    assert media[0].url == "/media/catalog/photo.jpg"
    assert media[0].alt == "Фото"
    assert media[0].role == "general"


def test_normalize_media_item_reads_category_or_sku_photo() -> None:
    media = normalize_media_item(
        {"url": "/media/catalog/category-covers/deflectors/category-cover.jpg", "role": "category-cover"}
    )

    assert media is not None
    assert media.url.endswith("category-cover.jpg")
    assert media.role == "category-cover"
    assert normalize_media_item({"alt": "broken"}) is None


def test_public_catalog_media_comes_from_stored_attributes() -> None:
    cover = category_cover(
        {"category_cover": {"url": "/media/catalog/category-covers/deflectors/category-cover.jpg", "alt": "Ассортимент"}}
    )
    image = primary_product_image(
        {
            "media": [
                {"url": "/media/catalog/categories/deflector/photo-2.jpg", "role": "top"},
                {"url": "/media/catalog/categories/deflector/photo-1.jpg", "role": "general"},
            ]
        }
    )

    assert cover is not None and cover.alt == "Ассортимент"
    assert image is not None and image.url.endswith("photo-1.jpg")
    assert category_cover({}) is None
    assert primary_product_image({"media": []}) is None


def test_safe_asset_name_keeps_allowed_extension_and_removes_path() -> None:
    assert safe_asset_name("../IMG 100.PNG") == "img-100.png"
    assert safe_asset_name("фото товара.exe") == "photo.jpg"


def test_form_factor_photo_names_are_canonical() -> None:
    assert canonical_photo_name("IMG 100.PNG", "general") == "photo-1.png"
    assert canonical_photo_name("top.webp", "top") == "photo-2.webp"
    assert canonical_photo_name("detail.jpg", "connection") == "photo-3.jpg"
    assert safe_storage_key("Deflector Standard") == "deflector-standard"


def test_product_media_overrides_legacy_category_media() -> None:
    product_media = {"media": [{"url": "/media/catalog/categories/deflector/photo-1.jpg"}]}
    category_media = {"media": [{"url": "/media/legacy/category.jpg"}]}

    assert resolve_product_media(product_media, category_media)[0].url.endswith("photo-1.jpg")
    assert resolve_product_media({"media": []}, category_media) == []
    assert resolve_product_media({}, category_media)[0].url.endswith("category.jpg")


def test_decode_photo_payload_accepts_data_url() -> None:
    raw = b"image-bytes"
    encoded = base64.b64encode(raw).decode()

    assert decode_photo_payload(f"data:image/png;base64,{encoded}") == raw


def test_decode_photo_payload_rejects_invalid_base64() -> None:
    with pytest.raises(HTTPException) as exc:
        decode_photo_payload("not-base64")

    assert exc.value.status_code == 400


def test_extract_openai_output_text_reads_responses_payload() -> None:
    payload = {
        "output": [
            {
                "type": "message",
                "content": [
                    {"type": "output_text", "text": '{"seo_title":"Тест"}'},
                ],
            }
        ]
    }

    assert extract_openai_output_text(payload) == '{"seo_title":"Тест"}'


def test_product_seo_facts_separate_selected_sku_from_family_ranges() -> None:
    selected_sku = SimpleNamespace(
        id="sku-1",
        is_active=True,
        article="DT-100-200",
        name="Сэндвич-дефлектор 100/200",
        diameter_mm=100,
        outer_diameter_mm=200,
        length_mm=240,
        wall_thickness_mm=None,
        insulation_mm=50,
        steel_grade="AISI 430",
        material="Нержавеющая сталь",
        contour="сэндвич",
        angle_deg=None,
    )
    other_sku = SimpleNamespace(**{**selected_sku.__dict__, "id": "sku-2", "diameter_mm": 150})
    product = SimpleNamespace(
        name="Сэндвич-дефлектор",
        category=SimpleNamespace(name="Оголовки"),
        product_kind="оголовок",
        brand="Дымоход Трейд",
        purpose=[],
        application_tags=[],
        compatibility_notes=None,
        extra_attributes={
            "seo_knowledge": {
                "purpose": ["Защищает верхнее завершение дымохода от атмосферных осадков."],
                "fireSafety": [],
                "sourceNotes": ["Паспорт семейства, раздел 2"],
            }
        },
        skus=[selected_sku, other_sku],
    )

    facts = product_seo_facts(product, selected_sku=selected_sku)

    assert facts["selected_sku"]["diameter_d_mm"] == 100
    assert facts["diameter_d_mm"] == [100, 150]
    assert facts["family_ranges"]["diameter_d_mm"] == {"min": 100, "max": 150, "is_fixed": False}
    assert facts["seo_knowledge"]["purpose"]
    assert "fireSafety" in facts["missing_confirmed_sections"]


def test_product_seo_prompt_forbids_unconfirmed_fire_safety_claims() -> None:
    prompt = build_product_seo_prompt({"seo_knowledge": {"fireSafety": [], "sourceNotes": []}})

    assert "Пожарную безопасность описывай только" in prompt
    assert "Не выдумывай" in prompt


def test_invalid_seo_knowledge_falls_back_to_safe_empty_structure() -> None:
    knowledge = normalize_seo_knowledge({"installationZones": "outdoor"})

    assert knowledge.installation_zones == []
    assert knowledge.configurator_cta.href == "/#calculator"


def test_generated_meta_replaces_selected_sku_literals_with_tokens() -> None:
    sku = SimpleNamespace(
        article="DT-SW50-29-15-D180-280",
        diameter_mm=180,
        outer_diameter_mm=280,
        wall_thickness_mm=None,
        insulation_mm=50,
        steel_grade="AISI 430",
        material="оцинковка",
    )

    result = parameterize_sku_meta(
        "Оголовок Ø180/280 мм, AISI 430 и оцинковка. Артикул DT-SW50-29-15-D180-280.",
        sku,
    )

    assert "180/280" not in result
    assert "{d}/{D}" in result
    assert "{steel}" in result
    assert "{material}" in result
    assert "{article}" in result


def test_dynamic_sku_section_is_not_saved_in_family_description() -> None:
    description = """Назначение
Семейный текст.

Характеристики выбранного SKU
Диаметр 180/280 мм.

Расчёт комплекта
Подберите комплект."""

    result = remove_dynamic_sku_section(description)

    assert "180/280" not in result
    assert "Назначение" in result
    assert "Расчёт комплекта" in result


def test_catalog_filter_values_are_normalized() -> None:
    assert parse_diameter_filter("100:200") == (100, 200)
    assert parse_diameter_filter("100:") == (100, None)
    assert material_group("Нержавеющая сталь") == "stainless"
    assert material_group("Оцинкованная сталь") == "galvanized"


def test_compatible_tubes_may_have_different_lengths_but_not_different_materials() -> None:
    source = SimpleNamespace(
        diameter_mm=120,
        outer_diameter_mm=220,
        insulation_mm=50,
        steel_grade="AISI 430",
        material="Нержавеющая сталь",
        contour="сэндвич",
        length_mm=240,
    )
    tube = SimpleNamespace(**{**source.__dict__, "length_mm": 1000})

    assert compatible_tube_matches(source, tube)

    galvanized_tube = SimpleNamespace(**{**tube.__dict__, "material": "Оцинкованная сталь"})
    assert not compatible_tube_matches(source, galvanized_tube)

    unknown_insulation = SimpleNamespace(**{**tube.__dict__, "insulation_mm": None})
    assert not compatible_tube_matches(source, unknown_insulation)
