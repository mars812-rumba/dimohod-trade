from app.db.catalog_item_rules import (
    confirmed_four_way_angle,
    confirmed_tee_angle,
    exclude_price_item,
    normalized_price_item_name,
)


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
