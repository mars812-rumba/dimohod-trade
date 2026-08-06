import json
from pathlib import Path

import pytest

from app.db.catalog_item_rules import (
    confirmed_four_way_angle,
    confirmed_tee_angle,
    exclude_price_item,
    expanded_price_item_names,
    is_withdrawable_damper,
    normalized_price_item_name,
    product_family_slug_parts,
)


def test_public_family_slug_parts_do_not_repeat_product_kind() -> None:
    assert product_family_slug_parts("сэндвич", "труба", "Труба") == [
        "сэндвич",
        "труба",
    ]
    assert product_family_slug_parts("сэндвич", "отвод", "Отвод 90 гр") == [
        "сэндвич",
        "отвод",
        "90 гр",
    ]
    assert product_family_slug_parts("сэндвич", "оголовок", "Дефлектор-конус") == [
        "сэндвич",
        "оголовок",
        "Дефлектор-конус",
    ]


def test_sandwich_plug_labels_are_one_support_cap_family() -> None:
    assert normalized_price_item_name("Заглушка", "сэндвич") == "Заглушка опорная"
    assert normalized_price_item_name("Заглушка опорная", "сэндвич") == "Заглушка опорная"


def test_single_wall_plug_is_excluded_but_sandwich_support_cap_is_kept() -> None:
    assert exclude_price_item("Заглушка", "одноконтурный")
    assert not exclude_price_item("Заглушка", "сэндвич")
    assert not exclude_price_item("Заглушка опорная", "сэндвич")


def test_tee_angles_with_and_without_units_use_one_family_name() -> None:
    for source in (
        "Тройник с К/О 45",
        "Тройник с К/О 45гр",
        "Тройник с К/О 45°",
    ):
        assert confirmed_tee_angle(source) == 45
        assert normalized_price_item_name(source, "сэндвич") == "Тройник с К/О 45гр"

    assert normalized_price_item_name("Тройник с К/О  90гр", "одноконтурный") == (
        "Тройник с К/О 90гр"
    )


def test_four_way_90_degree_labels_use_one_family_name() -> None:
    for source in (
        "Четверник с К/О 90",
        "Четверник с К/О 90гр",
        "Четверник с к/о 90°",
    ):
        assert confirmed_four_way_angle(source) == 90
        assert normalized_price_item_name(source, "сэндвич") == "Четверник с К/О 90гр"


def test_withdrawable_damper_labels_use_one_family_name() -> None:
    for source in (
        "Шибер выдвижной",
        "Шибер выдвиж",
        "Шибер выдв 0,5/0,8",
        "Шибер выдв 0,8/0,8",
        "Шибер выдв 0,8",
        "Шибер выдвиж 05/08",
        "Шибер выдвиж 08/08",
    ):
        assert is_withdrawable_damper(source)
        assert normalized_price_item_name(source, "сэндвич") == "Шибер выдвижной"

    assert not is_withdrawable_damper("Шибер поворотный")
    assert normalized_price_item_name("Шибер поворотный", "сэндвич") == "Шибер поворотный"


def test_cleanout_and_decorative_skirt_are_separate_products_with_shared_prices() -> None:
    assert expanded_price_item_names("Прочистка/юбка", "одностенный") == (
        "Прочистка",
        "Декоративная юбка",
    )
    assert expanded_price_item_names("Прочистка/юбка", "сэндвич") == (
        "Прочистка/юбка",
    )


def test_cleanout_skirt_source_row_contains_75_confirmed_price_variants() -> None:
    price_path = Path(__file__).parents[2] / "prices" / "price_list.json"
    if not price_path.is_file():
        pytest.skip("source price list is not mounted in the backend test container")
    data = json.loads(price_path.read_text(encoding="utf-8"))
    rows = [
        item
        for block in data["голые"]
        for item in block.get("items", [])
        if item.get("name") == "Прочистка/юбка"
    ]

    assert len(rows) == 5
    assert sum(len(row["prices"]) for row in rows) == 75
    assert all(
        expanded_price_item_names(row["name"], "одностенный")
        == ("Прочистка", "Декоративная юбка")
        for row in rows
    )
