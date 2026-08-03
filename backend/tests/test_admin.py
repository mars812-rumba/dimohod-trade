import base64
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.modules.catalog.service import category_cover
from app.modules.admin.service import (
    build_product_seo_prompt,
    canonical_photo_name,
    canonical_sku_photo_name,
    decode_photo_payload,
    extract_openai_output_text,
    inherit_legacy_product_content,
    normalize_media_item,
    normalize_media_list,
    normalize_sku_media,
    resolve_product_media,
    normalize_seo_knowledge,
    parameterize_sku_meta,
    product_seo_facts,
    remove_dynamic_sku_section,
    safe_asset_name,
    safe_storage_key,
)
from app.modules.products.router import (
    parse_diameter_filter,
    primary_product_image,
    primary_visual_sku_image,
    public_sku_media_attributes,
    select_active_sku,
    sku_matches_filters,
)
from app.modules.products.service import (
    compatible_fastener_matches,
    compatible_tube_matches,
    get_product_sku_by_key,
    material_group,
    normalized_compatible_product_ids,
)


def test_admin_routes_are_registered() -> None:
    client = TestClient(app)

    response = client.get("/api/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/admin/categories" in paths
    assert "/api/v1/admin/products" in paths
    assert "/api/v1/admin/skus" in paths
    assert "/api/v1/admin/products/{product_id}/skus" in paths
    assert "patch" in paths["/api/v1/admin/products/{product_id}"]
    assert "/api/v1/admin/products/{product_id}/seo/generate" in paths
    assert "/api/v1/admin/products/{product_id}/photos" in paths
    assert "/api/v1/admin/products/{product_id}/photos/upload" in paths
    assert "/api/v1/admin/categories/{category_id}/cover" in paths
    assert "/api/v1/admin/skus/{sku_id}/photo" in paths
    assert "/api/v1/products/{slug}/compatible" in paths


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


def test_public_sku_attributes_expose_gallery_and_seo_only() -> None:
    media = [{"url": "/media/catalog/skus/item/sku-photo-2.jpg", "role": "top"}]
    seo = {"h1": "Труба L500 d115", "seo_title": "Труба L500 d115 — купить"}

    assert public_sku_media_attributes(
        {"sku_photo": {"url": "/legacy.jpg"}, "sku_media": media, "sku_seo": seo, "internal": "hidden"}
    ) == {"sku_photo": {"url": "/legacy.jpg"}, "sku_media": media, "sku_seo": seo}
    assert public_sku_media_attributes({}) == {}


def test_safe_asset_name_keeps_allowed_extension_and_removes_path() -> None:
    assert safe_asset_name("../IMG 100.PNG") == "img-100.png"
    assert safe_asset_name("фото товара.exe") == "photo.jpg"


def test_form_factor_photo_names_are_canonical() -> None:
    assert canonical_photo_name("IMG 100.PNG", "general") == "photo-1.png"
    assert canonical_photo_name("top.webp", "top") == "photo-2.webp"
    assert canonical_photo_name("detail.jpg", "connection") == "photo-3.jpg"
    assert safe_storage_key("Deflector Standard") == "deflector-standard"


def test_sku_photo_names_are_canonical_for_all_gallery_roles() -> None:
    assert canonical_sku_photo_name("front.PNG", "general") == ("sku-photo-1.png", "general")
    assert canonical_sku_photo_name("top.webp", "top") == ("sku-photo-2.webp", "top")
    assert canonical_sku_photo_name("ports.jpg", "connection") == ("sku-photo-3.jpg", "connection")
    assert canonical_sku_photo_name("legacy.jpg", "sku") == ("sku-photo-1.jpg", "general")


def test_sku_media_uses_legacy_photo_as_general_fallback() -> None:
    media = normalize_sku_media(
        {
            "sku_photo": {"url": "/media/catalog/skus/legacy/sku-photo.jpg", "role": "sku"},
            "sku_media": [
                {"url": "/media/catalog/skus/item/sku-photo-3.jpg", "role": "connection"},
                {"url": "/media/catalog/skus/item/sku-photo-2.jpg", "role": "top"},
            ],
        }
    )

    assert [item.role for item in media] == ["general", "top", "connection"]
    assert media[0].url.endswith("sku-photo.jpg")


def test_sku_media_prefers_role_based_general_over_legacy_photo() -> None:
    media = normalize_sku_media(
        {
            "sku_photo": {"url": "/media/catalog/skus/legacy/sku-photo.jpg"},
            "sku_media": [
                {"url": "/media/catalog/skus/item/sku-photo-1.jpg", "role": "general"},
            ],
        }
    )

    assert len(media) == 1
    assert media[0].url.endswith("sku-photo-1.jpg")


def test_product_media_overrides_legacy_category_media() -> None:
    product_media = {"media": [{"url": "/media/catalog/categories/deflector/photo-1.jpg"}]}
    category_media = {"media": [{"url": "/media/legacy/category.jpg"}]}

    assert resolve_product_media(product_media, category_media)[0].url.endswith("photo-1.jpg")
    assert resolve_product_media({"media": []}, category_media) == []
    assert resolve_product_media({}, category_media)[0].url.endswith("category.jpg")


def test_legacy_editor_content_is_inherited_once_without_overwriting_canonical_values() -> None:
    product_id = UUID("11111111-1111-1111-1111-111111111111")
    canonical = SimpleNamespace(
        id=product_id,
        description=None,
        extra_attributes={"seo_title": "Сохранённый title активного семейства"},
    )
    legacy = SimpleNamespace(
        description="Сохранённое описание",
        extra_attributes={
            "merged_into_product_id": str(product_id),
            "seo_title": "Старый title не должен перезаписать новый",
            "seo_description": "Сохранённый meta description",
            "seo_knowledge": {"purpose": ["Подтверждённое назначение"]},
            "media": [{"url": "/media/catalog/categories/family/photo-1.jpg"}],
        },
    )

    assert inherit_legacy_product_content(canonical, [legacy])
    assert canonical.extra_attributes["seo_title"] == "Сохранённый title активного семейства"
    assert canonical.extra_attributes["seo_description"] == "Сохранённый meta description"
    assert canonical.extra_attributes["seo_knowledge"]["purpose"] == ["Подтверждённое назначение"]
    assert canonical.extra_attributes["media"][0]["url"].endswith("photo-1.jpg")
    assert canonical.description == "Сохранённое описание"
    assert canonical.extra_attributes["legacy_admin_content_migrated"] is True
    assert not inherit_legacy_product_content(canonical, [legacy])


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


def test_catalog_card_uses_photo_from_visually_equivalent_sku() -> None:
    shared_fields = {
        "is_active": True,
        "material": "Нержавеющая сталь",
        "length_mm": 1000,
        "diameter_mm": 100,
        "outer_diameter_mm": None,
    }
    representative = SimpleNamespace(
        **shared_fields,
        id="sku-07",
        attributes={},
    )
    photographed = SimpleNamespace(
        **shared_fields,
        id="sku-01",
        attributes={
            "sku_media": [
                {
                    "url": "/media/catalog/skus/sku-01/sku-photo-1.jpg?v=2",
                    "alt": "Новая фотография трубы",
                    "role": "general",
                }
            ]
        },
    )

    image = primary_visual_sku_image(representative, [representative, photographed])

    assert image is not None
    assert image.url.endswith("sku-photo-1.jpg?v=2")
    assert image.alt == "Новая фотография трубы"


def test_catalog_sku_filters_apply_all_available_parameters_with_and_logic() -> None:
    sku = SimpleNamespace(
        is_active=True,
        diameter_mm=115,
        outer_diameter_mm=None,
        steel_grade="AISI 304",
        material="Нержавеющая сталь",
        length_mm=500,
        wall_thickness_mm=Decimal("0.50"),
        angle_deg=45,
        insulation_mm=None,
        contour="одностенный",
    )
    filters = {
        "diameter_mm": 115,
        "outer_diameter_mm": None,
        "steel_grade": "AISI 304",
        "material": "stainless",
        "length_mm": 500,
        "wall_thickness_mm": Decimal("0.50"),
        "angle_deg": 45,
        "insulation_mm": None,
        "contour": "одностенный",
    }

    assert sku_matches_filters(sku, **filters)
    assert not sku_matches_filters(sku, **{**filters, "length_mm": 1000})
    assert not sku_matches_filters(sku, **{**filters, "angle_deg": 90})


def test_product_page_selects_only_requested_active_sku() -> None:
    first = SimpleNamespace(id="sku-1", slug="first", article="DT-1", is_active=True)
    second = SimpleNamespace(id="sku-2", slug="second", article="DT-2", is_active=True)
    inactive = SimpleNamespace(id="sku-3", slug="inactive", article="DT-3", is_active=False)
    product = SimpleNamespace(skus=[first, second, inactive])

    assert select_active_sku(product, "second") is second
    assert select_active_sku(product, "DT-2") is second
    assert select_active_sku(product, "sku-2") is second
    assert select_active_sku(product, "inactive", strict=True) is None
    assert select_active_sku(product, "missing", strict=True) is None
    assert select_active_sku(product, "missing") is first


def test_seo_prompt_requires_natural_language_and_skips_empty_sections() -> None:
    prompt = build_product_seo_prompt({"family_name": "Тест", "missing_confirmed_sections": []})

    assert "как опытный специалист магазина" in prompt
    assert "не используй «данное изделие»" in prompt
    assert "пропускай раздел без подтверждённых фактов" in prompt
    assert "не более одного раза" in prompt


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


def test_fastener_uses_source_outer_diameter_for_sandwich() -> None:
    source = SimpleNamespace(
        diameter_mm=250,
        outer_diameter_mm=350,
        insulation_mm=50,
        steel_grade="AISI 321",
        material="Нержавеющая сталь",
        contour="сэндвич",
    )
    fastener = SimpleNamespace(
        diameter_mm=350,
        outer_diameter_mm=None,
        steel_grade="AISI 321",
        material="Нержавейка",
        contour="сэндвич",
    )

    assert compatible_fastener_matches(source, fastener)
    assert not compatible_fastener_matches(
        source,
        SimpleNamespace(**{**fastener.__dict__, "diameter_mm": 250, "contour": "одностенный"}),
    )
    assert not compatible_fastener_matches(
        source,
        SimpleNamespace(**{**fastener.__dict__, "diameter_mm": 300, "contour": "одностенный"}),
    )
    assert not compatible_fastener_matches(
        source,
        SimpleNamespace(**{**fastener.__dict__, "material": "Оцинкованная сталь"}),
    )


def test_explicit_compatible_product_ids_are_normalized_without_duplicates() -> None:
    first = UUID("11111111-1111-1111-1111-111111111111")
    second = UUID("22222222-2222-2222-2222-222222222222")

    assert normalized_compatible_product_ids({}) is None
    assert normalized_compatible_product_ids({"compatible_product_ids": []}) == []
    assert normalized_compatible_product_ids(
        {
            "compatible_product_ids": [str(first), "invalid", str(first), second],
        }
    ) == [first, second]


@pytest.mark.asyncio
async def test_product_sku_lookup_uses_one_direct_query() -> None:
    expected = (SimpleNamespace(slug="sandwich-pipe"), SimpleNamespace(article="DT-1"))
    query_result = SimpleNamespace(one_or_none=lambda: expected)
    session = SimpleNamespace(execute=AsyncMock(return_value=query_result))

    result = await get_product_sku_by_key(
        session,
        product_slug="sandwich-pipe",
        sku_key="DT-1",
    )

    assert result == expected
    session.execute.assert_awaited_once()
