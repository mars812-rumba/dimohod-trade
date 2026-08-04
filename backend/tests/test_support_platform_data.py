from decimal import Decimal

from app.db.support_platform_data import SUPPORT_PLATFORM_SKUS


def test_support_platform_table_has_three_material_rows_and_twelve_diameters() -> None:
    assert len(SUPPORT_PLATFORM_SKUS) == 36
    assert {sku.steel_grade for sku in SUPPORT_PLATFORM_SKUS} == {
        "AISI 304",
        "AISI 321",
        "AISI 316",
    }
    assert {(sku.diameter_mm, sku.outer_diameter_mm) for sku in SUPPORT_PLATFORM_SKUS} == {
        (100, 200),
        (110, 210),
        (120, 220),
        (130, 230),
        (140, 240),
        (150, 250),
        (160, 260),
        (180, 280),
        (200, 300),
        (250, 350),
        (280, 380),
        (300, 400),
    }


def test_support_platform_prices_match_verified_json_rows() -> None:
    by_article = {sku.article: sku for sku in SUPPORT_PLATFORM_SKUS}

    assert by_article["DT-SUPPORT-PLATFORM-304-430-D100-200"].price_rub == Decimal("2214.3")
    assert by_article["DT-SUPPORT-PLATFORM-321-430-D160-260"].price_rub == Decimal("3540.46")
    assert by_article["DT-SUPPORT-PLATFORM-316-430-D300-400"].price_rub == Decimal("5703.94")


def test_support_platform_keeps_confirmed_inner_and_outer_steel() -> None:
    sku = SUPPORT_PLATFORM_SKUS[0]

    assert sku.wall_thickness_mm == Decimal("0.5")
    assert sku.outer_steel_grade == "AISI 430"
    assert sku.outer_wall_thickness_mm == Decimal("0.8")
    assert sku.insulation_mm == 50
