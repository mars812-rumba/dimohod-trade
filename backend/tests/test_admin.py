import base64

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.modules.admin.service import decode_photo_payload, normalize_media_list, safe_asset_name


def test_admin_routes_are_registered() -> None:
    client = TestClient(app)

    response = client.get("/api/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/admin/categories" in paths
    assert "/api/v1/admin/skus" in paths
    assert "/api/v1/admin/products/{product_id}/skus" in paths
    assert "/api/v1/admin/products/{product_id}/photos" in paths


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


def test_safe_asset_name_keeps_allowed_extension_and_removes_path() -> None:
    assert safe_asset_name("../IMG 100.PNG") == "img-100.png"
    assert safe_asset_name("фото товара.exe") == "photo.jpg"


def test_decode_photo_payload_accepts_data_url() -> None:
    raw = b"image-bytes"
    encoded = base64.b64encode(raw).decode()

    assert decode_photo_payload(f"data:image/png;base64,{encoded}") == raw


def test_decode_photo_payload_rejects_invalid_base64() -> None:
    with pytest.raises(HTTPException) as exc:
        decode_photo_payload("not-base64")

    assert exc.value.status_code == 400
