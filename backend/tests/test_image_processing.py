import hashlib
from io import BytesIO

import pytest
from PIL import Image

from app.media.images import (
    MAIN_MAX_SIZE,
    THUMBNAIL_MAX_SIZE,
    CatalogImageError,
    encode_catalog_image,
    store_catalog_image,
)


def png_bytes(size: tuple[int, int] = (1800, 900)) -> bytes:
    output = BytesIO()
    Image.new("RGBA", size, (180, 190, 195, 220)).save(output, format="PNG")
    return output.getvalue()


def image_size(content: bytes) -> tuple[int, int]:
    with Image.open(BytesIO(content)) as image:
        return image.size


def test_catalog_image_is_resized_and_encoded_as_webp() -> None:
    encoded = encode_catalog_image(png_bytes())

    assert encoded.main[:4] == b"RIFF"
    assert encoded.main[8:12] == b"WEBP"
    assert image_size(encoded.main) == (MAIN_MAX_SIZE[0], MAIN_MAX_SIZE[1] // 2)
    assert image_size(encoded.thumbnail) == (
        THUMBNAIL_MAX_SIZE[0],
        THUMBNAIL_MAX_SIZE[1] // 2,
    )
    assert encoded.content_sha256 == hashlib.sha256(encoded.main).hexdigest()


def test_catalog_image_preserves_small_dimensions() -> None:
    encoded = encode_catalog_image(png_bytes((320, 180)))

    assert image_size(encoded.main) == (320, 180)
    assert image_size(encoded.thumbnail) == (320, 180)


def test_store_catalog_image_writes_main_and_thumbnail(tmp_path) -> None:
    stored = store_catalog_image(png_bytes(), tmp_path, "product-photo.png")

    assert stored.path == tmp_path / "product-photo.webp"
    assert stored.thumbnail_path == tmp_path / "product-photo.thumb.webp"
    assert stored.path.is_file()
    assert stored.thumbnail_path.is_file()


def test_catalog_image_rejects_non_image_content() -> None:
    with pytest.raises(CatalogImageError):
        encode_catalog_image(b"not an image")
