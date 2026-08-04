from app.db.catalog_item_rules import exclude_price_item, normalized_price_item_name


def test_sandwich_plug_labels_are_one_support_cap_family() -> None:
    assert normalized_price_item_name("Заглушка", "сэндвич") == "Заглушка опорная"
    assert normalized_price_item_name("Заглушка опорная", "сэндвич") == "Заглушка опорная"


def test_single_wall_plug_is_excluded_but_sandwich_support_cap_is_kept() -> None:
    assert exclude_price_item("Заглушка", "одноконтурный")
    assert not exclude_price_item("Заглушка", "сэндвич")
    assert not exclude_price_item("Заглушка опорная", "сэндвич")
