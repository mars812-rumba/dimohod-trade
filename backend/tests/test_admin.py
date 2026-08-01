import base64

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.modules.catalog.service import category_cover
from app.modules.admin.service import (
    extract_openai_output_text,
    canonical_photo_name,
    decode_photo_payload,
    normalize_media_item,
    normalize_media_list,
    resolve_product_media,
    safe_asset_name,
    safe_storage_key,
)
from app.modules.products.router import primary_product_image


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
