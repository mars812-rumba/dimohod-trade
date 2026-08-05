import re
from typing import Any, Mapping


def outer_pipe_attributes(attributes: Mapping[str, Any] | None) -> dict[str, Any]:
    """Return explicit outer-pipe fields, recovering legacy price-section data."""
    values = dict(attributes or {})
    source_section = str(values.get("source_section") or "")
    match = re.search(
        r"Наружн(?:ый|ая|ое)\s+(?:кожух|труб[аы]?)\s*[—-]\s*([^/]+)",
        source_section,
        re.IGNORECASE,
    )
    if not match:
        return {
            "outer_material": values.get("outer_material"),
            "outer_steel_grade": values.get("outer_steel_grade"),
            "outer_wall_thickness_mm": values.get("outer_wall_thickness_mm"),
        }

    description = " ".join(match.group(1).split())
    grade_match = re.search(r"AISI\s*([0-9]{3}[A-Z]?)", description, re.IGNORECASE)
    thickness_match = re.search(
        r"толщина\s*([0-9]+(?:[,.][0-9]+)?)\s*мм?",
        description,
        re.IGNORECASE,
    )
    if grade_match or "НЕРЖ" in description.upper():
        material = "нержавеющая сталь"
    elif "ОЦИНК" in description.upper():
        material = "оцинковка"
    else:
        material = None

    recovered = {
        "outer_material": material,
        "outer_steel_grade": (
            f"AISI {grade_match.group(1).upper()}" if grade_match else None
        ),
        "outer_wall_thickness_mm": (
            thickness_match.group(1).replace(",", ".") if thickness_match else None
        ),
    }
    # The price-section title is the source of truth for imported SKUs.  It
    # must correct stale structured values left by an older import instead of
    # being ignored merely because those values are non-empty.
    if recovered["outer_material"]:
        return recovered
    return {
        "outer_material": values.get("outer_material"),
        "outer_steel_grade": values.get("outer_steel_grade"),
        "outer_wall_thickness_mm": values.get("outer_wall_thickness_mm"),
    }
