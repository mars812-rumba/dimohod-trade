"""Owner-confirmed catalog normalization rules applied during price import."""

import re


TEE_ANGLE_PATTERN = re.compile(
    r"^тройник\s+с\s+к\s*/\s*о\s+(45|90)\s*(?:гр|°)?$",
    re.IGNORECASE,
)
FOUR_WAY_ANGLE_PATTERN = re.compile(
    r"^четверник\s+с\s+к\s*/\s*о\s+(90)\s*(?:гр|°)?$",
    re.IGNORECASE,
)
WITHDRAWABLE_DAMPER_PATTERN = re.compile(
    r"^шибер\s+(?:выдвиж(?:ной)?|выдв)"
    r"(?:\s+(?:0?[.,]?5\s*/\s*0?[.,]?8|0?[.,]?8\s*/\s*0?[.,]?8|0?[.,]?8))?$",
    re.IGNORECASE,
)
CLEANOUT_SKIRT_PRICE_ROW = "прочистка/юбка"


def product_family_slug_parts(contour: str, kind: str, item_name: str) -> list[str]:
    """Build family-level slug parts without repeating the product kind.

    Diameter is appended by the public web route. SKU-only characteristics do
    not belong to the indexable family slug.
    """
    normalized_item = " ".join(item_name.replace("ё", "е").split()).strip(" ,-")
    kind_label = " ".join(kind.replace("_", " ").replace("ё", "е").split())
    item_folded = normalized_item.casefold()
    kind_folded = kind_label.casefold()
    if item_folded == kind_folded:
        remainder = ""
    elif item_folded.startswith(f"{kind_folded} "):
        remainder = normalized_item[len(kind_label) :].strip(" ,-")
    else:
        remainder = normalized_item
    return [part for part in (contour, kind, remainder) if part]


def confirmed_tee_angle(item_name: str) -> int | None:
    normalized = " ".join(item_name.replace("ё", "е").split())
    match = TEE_ANGLE_PATTERN.match(normalized)
    return int(match.group(1)) if match else None


def confirmed_four_way_angle(item_name: str) -> int | None:
    normalized = " ".join(item_name.replace("ё", "е").split())
    match = FOUR_WAY_ANGLE_PATTERN.match(normalized)
    return int(match.group(1)) if match else None


def is_withdrawable_damper(item_name: str) -> bool:
    normalized = " ".join(item_name.replace("ё", "е").split())
    return WITHDRAWABLE_DAMPER_PATTERN.match(normalized) is not None


def expanded_price_item_names(item_name: str, contour: str | None) -> tuple[str, ...]:
    """Split the owner-confirmed shared price row into sellable products.

    ``Прочистка`` and ``Декоративная юбка`` are separate products. The source
    price combines their names because corresponding variants have the same
    individual price; it does not describe a kit or a single SKU.
    """
    normalized = " ".join(item_name.replace("ё", "е").split()).casefold()
    if contour != "сэндвич" and normalized == CLEANOUT_SKIRT_PRICE_ROW:
        return ("Прочистка", "Декоративная юбка")
    return (normalized_price_item_name(item_name, contour),)


def normalized_price_item_name(item_name: str, contour: str | None) -> str:
    normalized = " ".join(item_name.replace("ё", "е").split()).casefold()
    tee_angle = confirmed_tee_angle(normalized)
    if tee_angle is not None:
        return f"Тройник с К/О {tee_angle}гр"
    four_way_angle = confirmed_four_way_angle(normalized)
    if four_way_angle is not None:
        return f"Четверник с К/О {four_way_angle}гр"
    if is_withdrawable_damper(normalized):
        return "Шибер выдвижной"
    if contour == "сэндвич" and normalized in {"заглушка", "заглушка опорная"}:
        return "Заглушка опорная"
    return item_name.strip()


def exclude_price_item(item_name: str, contour: str | None) -> bool:
    normalized = " ".join(item_name.replace("ё", "е").split()).casefold()
    return contour != "сэндвич" and normalized == "заглушка"
