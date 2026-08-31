from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse
from xml.etree import ElementTree as ET

from app.modules.products.yandex_feed import build_yandex_feed


def category():
    return SimpleNamespace(name="Сэндвич-трубы", slug="sendvich-truby", is_active=True)


def product(*, active: bool = True, description: str | None = "Описание семейства"):
    family = SimpleNamespace(
        name="Сэндвич-труба",
        slug="sendvich-truba",
        brand="Дымоход Трейд",
        short_description=description,
        description=None,
        is_active=active,
        extra_attributes={
            "media": [
                {
                    "role": "general",
                    "url": "/media/catalog/sendvich.webp",
                    "diameter_keys": ["115:215"],
                    "lengths_mm": [1000],
                }
            ]
        },
        category=category(),
        skus=[],
    )
    return family


def sku(*, price: str | None = "1234.50", active: bool = True):
    return SimpleNamespace(
        article="DT-S-115-215-1000",
        name="Сэндвич-труба 115/215, 1000 мм",
        price_rub=Decimal(price) if price is not None else None,
        diameter_mm=115,
        outer_diameter_mm=215,
        length_mm=1000,
        is_active=active,
        attributes={},
    )


def parse_feed(family):
    return ET.fromstring(
        build_yandex_feed(
            [family],
            base_url="https://dimohod-trade.pro",
            generated_at=datetime(2026, 8, 31, 12, 30, tzinfo=UTC),
        )
    )


def test_feed_contains_public_priced_sku_with_absolute_urls() -> None:
    family = product()
    variant = sku()
    family.skus = [variant]

    root = parse_feed(family)
    offer = root.find("./shop/offers/offer")

    assert root.attrib["date"] == "2026-08-31 12:30"
    assert offer is not None
    assert offer.attrib["id"] == variant.article
    assert offer.findtext("price") == "1234.50"
    assert offer.findtext("picture") == "https://dimohod-trade.pro/media/catalog/sendvich.webp"
    parsed_url = urlparse(offer.findtext("url") or "")
    assert parsed_url.path == "/product/sendvich-truba-d115-215"
    assert parse_qs(parsed_url.query) == {"sku": [variant.article], "length": ["1000"]}
    assert offer.findtext("categoryId") == root.find("./shop/categories/category").attrib["id"]


def test_feed_excludes_sku_without_positive_price() -> None:
    family = product()
    family.skus = [sku(price=None), sku(price="0")]

    root = parse_feed(family)

    assert root.findall("./shop/offers/offer") == []


def test_feed_excludes_sku_without_applicable_photo_or_description() -> None:
    wrong_photo = product()
    wrong_photo.skus = [sku()]
    wrong_photo.extra_attributes["media"][0]["diameter_keys"] = ["150/250"]
    no_description = product(description=None)
    no_description.skus = [sku()]

    root = ET.fromstring(
        build_yandex_feed(
            [wrong_photo, no_description],
            base_url="https://dimohod-trade.pro",
        )
    )

    assert root.findall("./shop/offers/offer") == []


def test_feed_prefers_confirmed_sku_copy_and_photo() -> None:
    family = product()
    variant = sku()
    variant.attributes = {
        "sku_seo": {
            "h1": "Сэндвич-труба выбранного исполнения",
            "short_description": "Подтверждённое описание SKU.",
        },
        "sku_media": [
            {"role": "general", "url": "/media/catalog/exact.webp", "scope": "sku"}
        ],
    }
    family.skus = [variant]

    offer = parse_feed(family).find("./shop/offers/offer")

    assert offer is not None
    assert offer.findtext("name") == "Сэндвич-труба выбранного исполнения"
    assert offer.findtext("description") == "Подтверждённое описание SKU."
    assert offer.findtext("picture") == "https://dimohod-trade.pro/media/catalog/exact.webp"
