"""Owner-confirmed selection profiles for the inner steel of chimney pipes."""

from copy import deepcopy
from typing import Any


PROFILE_ATTRIBUTE = "steel_selection_profile"
PROFILE_SOURCE = "owner_material_guidance_2026-08-05"

STEEL_SELECTION_PROFILES: dict[str, dict[str, Any]] = {
    "AISI 430": {
        "selection_tier": "economy",
        "fuel_types": ["wood", "gas"],
        "condensate_mode": "without",
        "operating_temperature_c": 400,
        "max_temperature_c": 600,
        "inner_use_status": "limited",
        "source": PROFILE_SOURCE,
    },
    "AISI 304": {
        "selection_tier": "standard",
        "fuel_types": ["wood", "gas"],
        "condensate_mode": "with",
        "operating_temperature_c": 400,
        "max_temperature_c": 600,
        "inner_use_status": "allowed",
        "source": PROFILE_SOURCE,
    },
    "AISI 321": {
        "selection_tier": "premium",
        "fuel_types": ["wood", "coal", "gas"],
        "condensate_mode": "with",
        "operating_temperature_c": 600,
        "max_temperature_c": 800,
        "inner_use_status": "allowed",
        "source": PROFILE_SOURCE,
    },
    "AISI 316": {
        "selection_tier": None,
        "fuel_types": ["gas", "diesel"],
        "condensate_mode": "with",
        "operating_temperature_c": 300,
        "max_temperature_c": 400,
        "inner_use_status": "allowed",
        "source": PROFILE_SOURCE,
    },
}

TIER_LABELS = {
    "economy": "Эконом",
    "standard": "Стандарт",
    "premium": "Премиум",
}
FUEL_LABELS = {
    "wood": "Дрова",
    "coal": "Уголь",
    "gas": "Газ",
    "diesel": "Дизель",
}


def normalized_steel_grade(value: str | None) -> str | None:
    if not value:
        return None
    compact = " ".join(str(value).upper().replace("-", " ").split())
    if compact.startswith("AISI") and compact[4:].strip().isdigit():
        return f"AISI {compact[4:].strip()}"
    return compact


def steel_selection_profile(steel_grade: str | None) -> dict[str, Any] | None:
    grade = normalized_steel_grade(steel_grade)
    profile = STEEL_SELECTION_PROFILES.get(grade or "")
    return deepcopy(profile) if profile is not None else None


def with_steel_selection_profile(
    attributes: dict[str, Any] | None,
    *,
    steel_grade: str | None,
    product_kind: str | None,
) -> dict[str, Any]:
    values = dict(attributes or {})
    if product_kind != "труба":
        return values
    profile = steel_selection_profile(steel_grade)
    if profile is not None:
        values[PROFILE_ATTRIBUTE] = profile
    return values


def steel_selection_label(steel_grade: str) -> str:
    profile = steel_selection_profile(steel_grade)
    if profile is None:
        return steel_grade
    tier = profile.get("selection_tier")
    if isinstance(tier, str) and tier in TIER_LABELS:
        return f"{steel_grade} · {TIER_LABELS[tier]}"
    fuels = [FUEL_LABELS[value] for value in profile.get("fuel_types", []) if value in FUEL_LABELS]
    return f"{steel_grade} · {' / '.join(fuels)}" if fuels else steel_grade
