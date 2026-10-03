from collections.abc import Mapping
from typing import Any

PRICE_ALIAS_KEY = "owner_confirmed_price_alias"


def sandwich_115_215_alias(source: Mapping[str, Any]) -> dict[str, Any]:
    """Build the owner-confirmed 115/215 variant from a 120/220 SKU."""
    if source.get("diameter_mm") != 120 or source.get("outer_diameter_mm") != 220:
        raise ValueError("The 115/215 price alias requires a 120/220 source SKU")

    article = str(source.get("article") or "")
    if "D120-220" not in article:
        raise ValueError("The source SKU article has no D120-220 diameter token")

    attributes = dict(source.get("attributes") or {})
    attributes.update(
        {
            "diameter_mm": 115,
            "outer_diameter_mm": 215,
            PRICE_ALIAS_KEY: {
                "source_article": article,
                "source_diameter_mm": 120,
                "source_outer_diameter_mm": 220,
                "rule": "115/215 = 120/220 по цене",
                "confirmed_at": "2026-10-03",
            },
        }
    )
    raw_diameter = attributes.get("raw_diameter")
    if isinstance(raw_diameter, str):
        attributes["raw_diameter"] = raw_diameter.replace("120/220", "115/215")

    name = str(source.get("name") or "").replace("120/220", "115/215")
    slug = source.get("slug")
    if isinstance(slug, str):
        slug = slug.replace("d120-220", "d115-215")

    return {
        "product_id": source["product_id"],
        "article": article.replace("D120-220", "D115-215"),
        "name": name,
        "slug": slug,
        "material": source.get("material"),
        "steel_grade": source.get("steel_grade"),
        "wall_thickness_mm": source.get("wall_thickness_mm"),
        "diameter_mm": 115,
        "outer_diameter_mm": 215,
        "contour": source.get("contour"),
        "insulation_mm": source.get("insulation_mm"),
        "length_mm": source.get("length_mm"),
        "angle_deg": source.get("angle_deg"),
        "price_rub": source.get("price_rub"),
        "stock_status": source.get("stock_status"),
        "attributes": attributes,
        "is_active": source.get("is_active", True),
    }
