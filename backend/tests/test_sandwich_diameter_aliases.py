from decimal import Decimal

import pytest

from app.db.sandwich_diameter_aliases import PRICE_ALIAS_KEY, sandwich_115_215_alias


def source_sku() -> dict:
    return {
        "product_id": "product-id",
        "article": "DT-SW50-13-05-D120-220",
        "name": "Труба L=1000 мм, Ø120/220, AISI 304",
        "slug": "truba-l1000-d120-220-aisi304",
        "material": "нержавеющая сталь",
        "steel_grade": "AISI 304",
        "wall_thickness_mm": Decimal("0.50"),
        "diameter_mm": 120,
        "outer_diameter_mm": 220,
        "contour": "сэндвич",
        "insulation_mm": 50,
        "length_mm": 1000,
        "angle_deg": None,
        "price_rub": Decimal("3456.78"),
        "stock_status": "unknown",
        "attributes": {
            "diameter_mm": 120,
            "outer_diameter_mm": 220,
            "raw_diameter": "Ø 120/220",
        },
        "is_active": True,
    }


def test_115_215_alias_keeps_the_120_220_price_and_execution() -> None:
    source = source_sku()

    alias = sandwich_115_215_alias(source)

    assert alias["article"] == "DT-SW50-13-05-D115-215"
    assert alias["name"] == "Труба L=1000 мм, Ø115/215, AISI 304"
    assert alias["slug"] == "truba-l1000-d115-215-aisi304"
    assert alias["diameter_mm"] == 115
    assert alias["outer_diameter_mm"] == 215
    assert alias["price_rub"] == source["price_rub"]
    assert alias["material"] == source["material"]
    assert alias["steel_grade"] == source["steel_grade"]
    assert alias["length_mm"] == source["length_mm"]
    assert alias["attributes"]["raw_diameter"] == "Ø 115/215"
    assert alias["attributes"][PRICE_ALIAS_KEY]["source_article"] == source["article"]


def test_115_215_alias_rejects_a_different_source_diameter() -> None:
    source = source_sku()
    source["diameter_mm"] = 110

    with pytest.raises(ValueError, match="requires a 120/220 source SKU"):
        sandwich_115_215_alias(source)
