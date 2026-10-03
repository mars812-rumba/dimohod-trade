from collections.abc import Mapping
from typing import Any

PRICE_ALIAS_KEY = "owner_confirmed_price_alias"


def _single_diameter_alias(
    source: Mapping[str, Any],
    *,
    source_diameter_mm: int,
    target_diameter_mm: int,
    rule: str,
) -> dict[str, Any]:
    if source.get("diameter_mm") != source_diameter_mm or source.get("outer_diameter_mm") is not None:
        raise ValueError(
            f"The {target_diameter_mm} mm price alias requires a "
            f"{source_diameter_mm} mm single-diameter source SKU"
        )

    source_token = f"D{source_diameter_mm}"
    target_token = f"D{target_diameter_mm}"
    article = str(source.get("article") or "")
    if source_token not in article:
        raise ValueError(f"The source SKU article has no {source_token} diameter token")

    attributes = dict(source.get("attributes") or {})
    attributes.update(
        {
            "diameter_mm": target_diameter_mm,
            "outer_diameter_mm": None,
            PRICE_ALIAS_KEY: {
                "source_article": article,
                "source_diameter_mm": source_diameter_mm,
                "source_outer_diameter_mm": None,
                "rule": rule,
                "confirmed_at": "2026-10-03",
            },
        }
    )
    raw_diameter = attributes.get("raw_diameter")
    if isinstance(raw_diameter, str):
        attributes["raw_diameter"] = raw_diameter.replace(
            str(source_diameter_mm), str(target_diameter_mm)
        )

    name = str(source.get("name") or "").replace(
        f"Ø{source_diameter_mm}", f"Ø{target_diameter_mm}"
    )
    slug = source.get("slug")
    if isinstance(slug, str):
        slug = slug.replace(f"d{source_diameter_mm}", f"d{target_diameter_mm}")

    return {
        "product_id": source["product_id"],
        "article": article.replace(source_token, target_token),
        "name": name,
        "slug": slug,
        "material": source.get("material"),
        "steel_grade": source.get("steel_grade"),
        "wall_thickness_mm": source.get("wall_thickness_mm"),
        "diameter_mm": target_diameter_mm,
        "outer_diameter_mm": None,
        "contour": source.get("contour"),
        "insulation_mm": source.get("insulation_mm"),
        "length_mm": source.get("length_mm"),
        "angle_deg": source.get("angle_deg"),
        "price_rub": source.get("price_rub"),
        "stock_status": source.get("stock_status"),
        "attributes": attributes,
        "is_active": source.get("is_active", True),
    }


def single_wall_115_alias(source: Mapping[str, Any]) -> dict[str, Any]:
    """Build an owner-confirmed Ø115 one-wall variant at the Ø120 price."""
    if source.get("contour") != "одностенный":
        raise ValueError("The 115 mm price alias requires a one-wall source SKU")
    return _single_diameter_alias(
        source,
        source_diameter_mm=120,
        target_diameter_mm=115,
        rule="115 = 120 по цене",
    )


def outer_fitting_215_alias(source: Mapping[str, Any]) -> dict[str, Any]:
    """Build an owner-confirmed Ø215 outer fitting at the Ø220 price."""
    return _single_diameter_alias(
        source,
        source_diameter_mm=220,
        target_diameter_mm=215,
        rule="215 = 220 по цене",
    )


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
