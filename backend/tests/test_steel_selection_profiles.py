from app.db.steel_selection_profiles import (
    PROFILE_ATTRIBUTE,
    steel_selection_label,
    steel_selection_profile,
    with_steel_selection_profile,
)


def test_confirmed_inner_steel_temperatures_and_purposes() -> None:
    assert steel_selection_profile("AISI 430") == {
        "selection_tier": "economy",
        "fuel_types": ["wood", "gas"],
        "condensate_mode": "without",
        "operating_temperature_c": 400,
        "max_temperature_c": 600,
        "inner_use_status": "limited",
        "source": "owner_material_guidance_2026-08-05",
    }
    assert steel_selection_profile("AISI 304")["max_temperature_c"] == 600
    assert steel_selection_profile("AISI 321")["operating_temperature_c"] == 600
    assert steel_selection_profile("AISI 321")["max_temperature_c"] == 800
    assert steel_selection_profile("AISI 316")["fuel_types"] == ["gas", "diesel"]


def test_thickness_does_not_change_the_profile() -> None:
    assert steel_selection_profile("AISI 304") == steel_selection_profile("aisi-304")


def test_profile_is_applied_to_pipes_and_all_sandwich_skus() -> None:
    pipe_attributes = with_steel_selection_profile(
        {"wall_thickness_mm": "0.8"},
        steel_grade="AISI 430",
        product_kind="труба",
        contour="одноконтурный",
    )
    sandwich_damper_attributes = with_steel_selection_profile(
        {},
        steel_grade="AISI 304",
        product_kind="шибер",
        contour="сэндвич",
    )
    fastener_attributes = with_steel_selection_profile(
        {},
        steel_grade="AISI 430",
        product_kind="крепеж",
        contour="одноконтурный",
    )
    assert pipe_attributes[PROFILE_ATTRIBUTE]["inner_use_status"] == "limited"
    assert sandwich_damper_attributes[PROFILE_ATTRIBUTE]["selection_tier"] == "standard"
    assert PROFILE_ATTRIBUTE not in fastener_attributes


def test_filter_labels_add_tier_or_confirmed_purpose() -> None:
    assert steel_selection_label("AISI 304") == "AISI 304 · Стандарт"
    assert steel_selection_label("AISI 316") == "AISI 316 · Газ / Дизель"
