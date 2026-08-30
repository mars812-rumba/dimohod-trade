from types import SimpleNamespace

from app.modules.products.publication import public_sku_ready


def product(*, description: str | None = "Описание", media: list[dict] | None = None):
    return SimpleNamespace(
        is_active=True,
        short_description=None,
        description=description,
        extra_attributes={"media": media or []},
    )


def sku(*, attributes: dict | None = None, diameter: int = 100, length: int = 500):
    return SimpleNamespace(
        is_active=True,
        attributes=attributes or {},
        diameter_mm=diameter,
        outer_diameter_mm=diameter + 100,
        length_mm=length,
    )


def general_photo(**extra: object) -> dict[str, object]:
    return {"role": "general", "url": "/media/photo.webp", **extra}


def test_sku_is_public_with_family_photo_and_inherited_description() -> None:
    assert public_sku_ready(product(media=[general_photo()]), sku()) is True


def test_sku_is_hidden_when_scoped_photo_does_not_apply() -> None:
    family = product(
        media=[general_photo(diameter_keys=["150:250"], lengths_mm=[1000])]
    )

    assert public_sku_ready(family, sku(diameter=100, length=500)) is False


def test_sku_is_public_with_own_photo_and_family_description() -> None:
    variant = sku(attributes={"sku_media": [general_photo(scope="sku")]})

    assert public_sku_ready(product(media=[]), variant) is True


def test_sku_is_hidden_without_photo() -> None:
    assert public_sku_ready(product(media=[]), sku()) is False


def test_sku_is_hidden_without_effective_description() -> None:
    assert public_sku_ready(product(description=None, media=[general_photo()]), sku()) is False
