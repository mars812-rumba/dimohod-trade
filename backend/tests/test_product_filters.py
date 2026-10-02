from decimal import Decimal
from types import SimpleNamespace

from app.modules.products.router import sku_matches_filters


def _matches(sku, *, base_size: str | None) -> bool:
    return sku_matches_filters(
        sku,
        diameter_mm=None,
        outer_diameter_mm=None,
        steel_grade="AISI 430",
        material="stainless",
        outer_steel_grade=None,
        outer_material=None,
        length_mm=None,
        wall_thickness_mm=None,
        outer_wall_thickness_mm=None,
        angle_deg=None,
        insulation_mm=None,
        contour=None,
        base_size=base_size,
    )


def test_base_size_selects_the_exact_flange_sku() -> None:
    sku = SimpleNamespace(
        is_active=True,
        diameter_mm=None,
        outer_diameter_mm=None,
        steel_grade="AISI 430",
        material="нержавеющая сталь",
        length_mm=None,
        wall_thickness_mm=Decimal("0.50"),
        angle_deg=None,
        insulation_mm=None,
        contour=None,
        attributes={"base_size": "600×600 мм"},
    )

    assert _matches(sku, base_size="600×600 мм") is True
    assert _matches(sku, base_size="500×500 мм") is False

