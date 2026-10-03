from decimal import Decimal

import pytest

from app.db.sandwich_diameter_aliases import (
    PRICE_ALIAS_KEY,
    outer_fitting_215_alias,
    sandwich_115_215_alias,
    single_wall_115_alias,
)


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


def one_wall_source_sku(*, diameter_mm: int = 120) -> dict:
    return {
        "product_id": "product-id",
        "article": f"DT-GOLYE-09-00-D{diameter_mm}",
        "name": f"Труба L=1000 мм, Ø{diameter_mm}, AISI 304, 0.8 мм",
        "slug": f"d{diameter_mm}-l1000-aisi304-t080",
        "material": "нержавеющая сталь",
        "steel_grade": "AISI 304",
        "wall_thickness_mm": Decimal("0.80"),
        "diameter_mm": diameter_mm,
        "outer_diameter_mm": None,
        "contour": "одностенный",
        "insulation_mm": None,
        "length_mm": 1000,
        "angle_deg": None,
        "price_rub": Decimal("1992.38"),
        "stock_status": "unknown",
        "attributes": {
            "diameter_mm": diameter_mm,
            "outer_diameter_mm": None,
            "raw_diameter": f"Ø {diameter_mm}",
        },
        "is_active": True,
    }


def test_single_wall_115_alias_keeps_120_price_and_execution() -> None:
    source = one_wall_source_sku()

    alias = single_wall_115_alias(source)

    assert alias["article"] == "DT-GOLYE-09-00-D115"
    assert alias["name"] == "Труба L=1000 мм, Ø115, AISI 304, 0.8 мм"
    assert alias["slug"] == "d115-l1000-aisi304-t080"
    assert alias["diameter_mm"] == 115
    assert alias["outer_diameter_mm"] is None
    assert alias["price_rub"] == source["price_rub"]
    assert alias["attributes"]["raw_diameter"] == "Ø 115"
    assert alias["attributes"][PRICE_ALIAS_KEY]["source_article"] == source["article"]


def test_outer_fitting_215_alias_keeps_220_price() -> None:
    source = one_wall_source_sku(diameter_mm=220)
    source.update(
        article="DT-GOLYE-03-14-SKIRT-D220",
        name="Декоративная юбка, Ø220, AISI 430, 0.5 мм",
        slug="d220-aisi430-t050",
        steel_grade="AISI 430",
        wall_thickness_mm=Decimal("0.50"),
        price_rub=Decimal("943.69"),
    )

    alias = outer_fitting_215_alias(source)

    assert alias["article"] == "DT-GOLYE-03-14-SKIRT-D215"
    assert alias["name"] == "Декоративная юбка, Ø215, AISI 430, 0.5 мм"
    assert alias["slug"] == "d215-aisi430-t050"
    assert alias["diameter_mm"] == 215
    assert alias["price_rub"] == source["price_rub"]
