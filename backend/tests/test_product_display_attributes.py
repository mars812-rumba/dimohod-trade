from app.modules.products.display_attributes import public_sku_display_attributes


def test_catalog_projection_keeps_sanitized_steel_profile_for_badges() -> None:
    result = public_sku_display_attributes(
        {
            "source_sheet": "hidden",
            "diameter_mm": 100,
            "outer_steel_grade": "AISI 430",
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
        "steel_selection_profile": {
            "selection_tier": "premium",
            "fuel_types": ["wood", "coal", "gas"],
            "condensate_mode": "with",
            "operating_temperature_c": 600,
            "max_temperature_c": 800,
            "inner_use_status": "allowed",
        },
    }
