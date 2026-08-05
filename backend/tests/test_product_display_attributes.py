import pytest

from app.db.price_section_attributes import outer_pipe_attributes
from app.modules.products.display_attributes import public_sku_display_attributes


def test_catalog_projection_keeps_sanitized_steel_profile_for_badges() -> None:
    result = public_sku_display_attributes(
        {
            "source_sheet": "hidden",
            "diameter_mm": 100,
            "outer_steel_grade": "AISI 430",
            "outer_material": "нержавеющая сталь",
            "outer_wall_thickness_mm": "0.5",
            "steel_selection_profile": {
                "selection_tier": "premium",
                "fuel_types": ["wood", "coal", "gas"],
                "condensate_mode": "with",
                "operating_temperature_c": 600,
                "max_temperature_c": 800,
                "inner_use_status": "allowed",
                "source": "must-not-be-public",
            },
        }
    )

    assert result == {
        "outer_steel_grade": "AISI 430",
        "outer_material": "нержавеющая сталь",
        "outer_wall_thickness_mm": "0.5",
        "steel_selection_profile": {
            "selection_tier": "premium",
            "fuel_types": ["wood", "coal", "gas"],
            "condensate_mode": "with",
            "operating_temperature_c": 600,
            "max_temperature_c": 800,
            "inner_use_status": "allowed",
        },
    }


@pytest.mark.parametrize(
    ("description", "material", "steel_grade", "thickness"),
    (
        ("ОЦИНКОВКА", "оцинковка", None, None),
        ("Нержавеющая сталь AISI 430 (толщина 0,5мм)", "нержавеющая сталь", "AISI 430", "0.5"),
        ("Нержавеющая сталь AISI 304 (толщина 0,5мм)", "нержавеющая сталь", "AISI 304", "0.5"),
    ),
)
def test_legacy_price_section_recovers_outer_pipe_options(
    description: str,
    material: str,
    steel_grade: str | None,
    thickness: str | None,
) -> None:
    result = outer_pipe_attributes(
        {
            "source_section": (
                "Внутренняя труба — AISI 304 / "
                f"Наружный кожух — {description} / Изоляция — 50мм"
            )
        }
    )

    assert result == {
        "outer_material": material,
        "outer_steel_grade": steel_grade,
        "outer_wall_thickness_mm": thickness,
    }


def test_price_section_corrects_stale_outer_pipe_attributes() -> None:
    result = outer_pipe_attributes(
        {
            "source_section": (
                "Внутренняя труба — ОЦИНКОВКА / "
                "Наружный кожух — ОЦИНКОВКА / Изоляция — 50мм"
            ),
            "outer_material": "нержавеющая сталь",
            "outer_steel_grade": "AISI 430",
            "outer_wall_thickness_mm": "0.5",
        }
    )

    assert result == {
        "outer_material": "оцинковка",
        "outer_steel_grade": None,
        "outer_wall_thickness_mm": None,
    }
