"""Public projection of SKU attributes for catalog cards."""


def public_sku_display_attributes(attributes: dict[str, object] | None) -> dict[str, object]:
    values = attributes or {}
    core_keys = {
        "diameter_mm",
        "outer_diameter_mm",
        "length_mm",
        "angle_deg",
        "material",
        "steel_grade",
        "wall_thickness_mm",
        "contour",
        "insulation_mm",
    }
    hidden_prefixes = ("source_", "raw_", "sku_")
    hidden_keys = {"diameter_min_mm", "diameter_max_mm"}
    public_attributes = {
        key: value
        for key, value in values.items()
        if key not in core_keys
        and key not in hidden_keys
        and not key.startswith(hidden_prefixes)
        and isinstance(value, (str, int, float, bool))
        and value not in (None, "")
    }
    raw_profile = values.get("steel_selection_profile")
    if isinstance(raw_profile, dict):
        allowed_profile_keys = {
            "selection_tier",
            "fuel_types",
            "condensate_mode",
            "operating_temperature_c",
            "max_temperature_c",
            "inner_use_status",
        }
        public_attributes["steel_selection_profile"] = {
            key: value
            for key, value in raw_profile.items()
            if key in allowed_profile_keys
        }
    return public_attributes
