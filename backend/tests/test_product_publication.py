from types import SimpleNamespace

from app.modules.products.publication import (
    prepare_publication_policy,
    product_content_quality,
    public_sku_ready,
)


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


def test_active_sku_remains_public_when_scoped_photo_does_not_apply() -> None:
    family = product(
        media=[general_photo(diameter_keys=["150/250"], lengths_mm=[1000])]
    )

    assert public_sku_ready(family, sku(diameter=100, length=500)) is True


def test_sku_is_public_with_own_photo_and_family_description() -> None:
    variant = sku(attributes={"sku_media": [general_photo(scope="sku")]})

    assert public_sku_ready(product(media=[]), variant) is True


def test_active_sku_remains_public_without_photo() -> None:
    assert public_sku_ready(product(media=[]), sku()) is True


def test_active_sku_remains_public_without_effective_description() -> None:
    assert public_sku_ready(product(description=None, media=[general_photo()]), sku()) is True


def test_inactive_sku_is_not_public() -> None:
    variant = sku()
    variant.is_active = False

    assert public_sku_ready(product(media=[general_photo()]), variant) is False


def test_content_quality_reports_missing_fields_without_hiding_sku() -> None:
    family = product(description=None, media=[])
    family.skus = [sku(), sku(attributes={"sku_media": [general_photo(scope="sku")]})]

    quality = product_content_quality(family)

    assert quality.active_sku_count == 2
    assert quality.missing_photo_sku_count == 1
    assert quality.missing_description_sku_count == 2


def test_prepared_policy_matches_publication_contract_for_family_variants() -> None:
    family = product(
        media=[
            general_photo(diameter_keys=["100/200"], lengths_mm=[500, 1000]),
            general_photo(diameter_keys=["150/250"], lengths_mm=[1000]),
        ]
    )
    variants = [
        sku(diameter=100, length=500),
        sku(diameter=100, length=1000),
        sku(diameter=100, length=250),
        sku(diameter=150, length=1000),
        sku(diameter=150, length=500),
        sku(
            attributes={"sku_media": [general_photo(scope="sku")]},
            diameter=200,
            length=750,
        ),
    ]

    policy = prepare_publication_policy(family)

    assert [policy.sku_ready(variant) for variant in variants] == [
        public_sku_ready(family, variant) for variant in variants
    ]
    assert [policy.sku_ready(variant) for variant in variants] == [
        True,
        True,
        True,
        True,
        True,
        True,
    ]


def test_legacy_colon_diameter_scope_is_normalized() -> None:
    family = product(
        media=[general_photo(diameter_keys=["100:200"], lengths_mm=[500])]
    )
    family.skus = [sku(diameter=100, length=500)]

    quality = product_content_quality(family)

    assert quality.missing_photo_sku_count == 0
