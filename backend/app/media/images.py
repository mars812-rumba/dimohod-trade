from __future__ import annotations

import hashlib
import os
import tempfile
import warnings
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError


MAIN_MAX_SIZE = (1200, 1200)
THUMBNAIL_MAX_SIZE = (480, 480)
MAIN_WEBP_QUALITY = 80
THUMBNAIL_WEBP_QUALITY = 72
MAX_IMAGE_PIXELS = 40_000_000

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


class CatalogImageError(ValueError):
    """Raised when uploaded content cannot be safely processed as a raster image."""


@dataclass(frozen=True)
class EncodedCatalogImage:
    main: bytes
    thumbnail: bytes
    width: int
    height: int
    content_sha256: str


@dataclass(frozen=True)
class StoredCatalogImage:
    path: Path
    thumbnail_path: Path
    width: int
    height: int
    content_sha256: str


def _webp_bytes(image: Image.Image, *, quality: int) -> bytes:
    output = BytesIO()
    image.save(output, format="WEBP", quality=quality, method=6, exact=True)
    return output.getvalue()


def encode_catalog_image(content: bytes) -> EncodedCatalogImage:
    if not content:
        raise CatalogImageError("Photo payload is empty")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as source:
                source.load()
                image = ImageOps.exif_transpose(source)
                if image.mode not in {"RGB", "RGBA"}:
                    image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
                main = image.copy()
    except (
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        UnidentifiedImageError,
        OSError,
        ValueError,
    ) as exc:
        raise CatalogImageError("Photo must be a valid JPEG, PNG, or WebP image") from exc

    main.thumbnail(MAIN_MAX_SIZE, Image.Resampling.LANCZOS)
    thumbnail = main.copy()
    thumbnail.thumbnail(THUMBNAIL_MAX_SIZE, Image.Resampling.LANCZOS)
    main_bytes = _webp_bytes(main, quality=MAIN_WEBP_QUALITY)
    thumbnail_bytes = _webp_bytes(thumbnail, quality=THUMBNAIL_WEBP_QUALITY)
    return EncodedCatalogImage(
        main=main_bytes,
        thumbnail=thumbnail_bytes,
        width=main.width,
        height=main.height,
        content_sha256=hashlib.sha256(main_bytes).hexdigest(),
    )


def catalog_image_paths(directory: Path, file_name: str) -> tuple[Path, Path]:
    stem = Path(file_name).stem
    return directory / f"{stem}.webp", directory / f"{stem}.thumb.webp"


def _atomic_write(path: Path, content: bytes) -> None:
    file_descriptor, temporary_name = tempfile.mkstemp(
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(file_descriptor, "wb") as output:
            output.write(content)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def store_catalog_image(content: bytes, directory: Path, file_name: str) -> StoredCatalogImage:
    return store_encoded_catalog_image(encode_catalog_image(content), directory, file_name)


def store_encoded_catalog_image(
    encoded: EncodedCatalogImage,
    directory: Path,
    file_name: str,
) -> StoredCatalogImage:
    directory.mkdir(parents=True, exist_ok=True)
    path, thumbnail_path = catalog_image_paths(directory, file_name)
    _atomic_write(path, encoded.main)
    _atomic_write(thumbnail_path, encoded.thumbnail)
    return StoredCatalogImage(
        path=path,
        thumbnail_path=thumbnail_path,
        width=encoded.width,
        height=encoded.height,
        content_sha256=encoded.content_sha256,
    )
