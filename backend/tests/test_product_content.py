import pytest

from app.modules.products.content import (
    is_single_wall_contour,
    remove_single_wall_placement_rule,
    sanitize_seo_knowledge_dict,
    sanitize_sku_seo_dict,
)


@pytest.mark.parametrize("contour", ["одностенный", "одноконтурный", "single-wall"])
def test_single_wall_contours_are_recognized(contour: str) -> None:
    assert is_single_wall_contour(contour)


@pytest.mark.parametrize(
    "value",
    [
        "Совместимо только с установкой внутри помещения.",
        "Предназначено для использования внутри тёплого помещения.",
        "Только внутри помещения",
    ],
)
def test_indoor_only_copy_is_removed_for_single_wall_product(value: str) -> None:
    assert remove_single_wall_placement_rule(value, single_wall_context=True) == ""


def test_other_product_facts_are_preserved() -> None:
    value = "Соединяет соседние элементы выбранного диаметра."

    assert remove_single_wall_placement_rule(value, single_wall_context=True) == value


def test_all_public_seo_locations_are_sanitized() -> None:
    knowledge = sanitize_seo_knowledge_dict(
        {
            "purpose": ["Соединяет участки."],
            "installationZones": ["Только внутри помещения"],
            "installationWarnings": ["Одноконтурный элемент нельзя ставить на улице."],
        },
        single_wall_context=True,
    )
    sku_seo = sanitize_sku_seo_dict(
        {
            "short_description": "Подходит только для тёплого помещения.",
            "description": "Соединяет участки.",
        },
        single_wall_context=True,
    )

    assert knowledge["installationZones"] == []
    assert knowledge["installationWarnings"] == []
    assert knowledge["purpose"] == ["Соединяет участки."]
    assert sku_seo["short_description"] == ""
    assert sku_seo["description"] == "Соединяет участки."
