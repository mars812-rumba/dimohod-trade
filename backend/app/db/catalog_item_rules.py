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


def confirmed_tee_angle(item_name: str) -> int | None:
    normalized = " ".join(item_name.replace("ё", "е").split())
    match = TEE_ANGLE_PATTERN.match(normalized)
    return int(match.group(1)) if match else None


def confirmed_four_way_angle(item_name: str) -> int | None:
    normalized = " ".join(item_name.replace("ё", "е").split())
    match = FOUR_WAY_ANGLE_PATTERN.match(normalized)
    return int(match.group(1)) if match else None


def normalized_price_item_name(item_name: str, contour: str | None) -> str:
    normalized = " ".join(item_name.replace("ё", "е").split()).casefold()
    tee_angle = confirmed_tee_angle(normalized)
    if tee_angle is not None:
        return f"Тройник с К/О {tee_angle}гр"
    four_way_angle = confirmed_four_way_angle(normalized)
    if four_way_angle is not None:
        return f"Четверник с К/О {four_way_angle}гр"
    if contour == "сэндвич" and normalized in {"заглушка", "заглушка опорная"}:
        return "Заглушка опорная"
    return item_name.strip()


def exclude_price_item(item_name: str, contour: str | None) -> bool:
    normalized = " ".join(item_name.replace("ё", "е").split()).casefold()
    return contour != "сэндвич" and normalized == "заглушка"
