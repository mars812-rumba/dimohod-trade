from types import SimpleNamespace

from app.modules.products.router import nearest_length_pool, sku_matches_preferred_filters


def ranged_sku(minimum: int, maximum: int):
    return SimpleNamespace(
        is_active=True,
        diameter_mm=None,
        outer_diameter_mm=None,
        steel_grade=None,
        material="оцинковка",
        length_mm=None,
        wall_thickness_mm=None,
        angle_deg=None,
        insulation_mm=None,
        contour=None,
        attributes={
            "diameter_min_mm": minimum,
            "diameter_max_mm": maximum,
        },
    )


def test_preferred_outer_diameter_selects_matching_upk_range() -> None:
    assert sku_matches_preferred_filters(
        ranged_sku(250, 275),
        diameter_mm=None,
        outer_diameter_mm=250,
        steel_grade=None,
        material=None,
        outer_steel_grade=None,
        outer_material=None,
    )


def test_preferred_outer_diameter_rejects_wrong_upk_range() -> None:
    assert not sku_matches_preferred_filters(
        ranged_sku(100, 125),
        diameter_mm=None,
        outer_diameter_mm=250,
        steel_grade=None,
        material=None,
        outer_steel_grade=None,
        outer_material=None,
    )


def test_nearest_length_pool_returns_real_closest_sku() -> None:
    skus = [
        SimpleNamespace(length_mm=1000),
        SimpleNamespace(length_mm=250),
        SimpleNamespace(length_mm=500),
    ]

    assert [sku.length_mm for sku in nearest_length_pool(skus, 300)] == [250]


def test_nearest_length_pool_keeps_equal_distance_variants_for_normal_tie_breaking() -> None:
    skus = [SimpleNamespace(length_mm=250), SimpleNamespace(length_mm=350)]

    assert [sku.length_mm for sku in nearest_length_pool(skus, 300)] == [250, 350]
