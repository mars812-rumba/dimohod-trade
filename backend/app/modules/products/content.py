import re
from typing import Any


RETIRED_SINGLE_WALL_RULE_CODE = "single_wall_indoor_only"
SEO_KNOWLEDGE_LIST_KEYS = (
    "purpose",
    "installationZones",
    "compatibleWith",
    "incompatibleWith",
    "installationVariants",
    "selectionRules",
    "installationWarnings",
    "fireSafety",
    "requiredInputData",
)


def is_single_wall_contour(value: str | None) -> bool:
    if not value:
        return False
    normalized = value.strip().lower().replace("ё", "е").replace("-", "_")
    return any(token in normalized for token in ("одноконтур", "одностен", "single_wall"))


def is_retired_single_wall_placement_sentence(
    value: str,
    *,
    single_wall_context: bool = False,
) -> bool:
    normalized = value.lower().replace("ё", "е")
    mentions_single_wall = "одноконтур" in normalized or "одностен" in normalized
    mentions_outdoor_zone = any(
        token in normalized
        for token in ("улиц", "холодн", "чердак", "кровл", "наружн", "тепл", "стартов")
    )
    mentions_indoor_zone = any(
        token in normalized for token in ("помещ", "внутри", "тепл", "стартов")
    )
    is_restriction = any(
        token in normalized
        for token in ("только", "исключительно", "нельзя", "не долж", "запрещ", "допуска")
    )
    is_placement_claim = any(
        token in normalized
        for token in ("совмест", "подход", "предназнач", "использ", "примен", "установ", "размещ")
    )
    short_zone_value = mentions_indoor_zone and len(normalized.split()) <= 6
    sandwich_only_outdoors = (
        mentions_outdoor_zone and "сэндвич" in normalized and "только" in normalized
    )
    explicit_single_wall_rule = (
        mentions_single_wall
        and (mentions_outdoor_zone or mentions_indoor_zone)
        and (is_restriction or is_placement_claim)
    )
    contextual_indoor_rule = (
        single_wall_context
        and mentions_indoor_zone
        and (is_restriction or is_placement_claim or short_zone_value)
    )
    return explicit_single_wall_rule or contextual_indoor_rule or sandwich_only_outdoors


def remove_single_wall_placement_rule(
    value: str | None,
    *,
    single_wall_context: bool = False,
) -> str | None:
    """Remove the retired indoor-only/outdoor-ban copy without changing other facts."""
    if not value:
        return value

    chunks = re.split(r"(?<=[.!?])([ \t\r\n]+)", value)
    kept: list[str] = []
    for index in range(0, len(chunks), 2):
        sentence = chunks[index]
        separator = chunks[index + 1] if index + 1 < len(chunks) else ""
        if is_retired_single_wall_placement_sentence(
            sentence,
            single_wall_context=single_wall_context,
        ):
            continue
        kept.extend((sentence, separator))
    return re.sub(r"\n{3,}", "\n\n", "".join(kept)).strip()


def sanitize_seo_knowledge_dict(
    value: Any,
    *,
    single_wall_context: bool = False,
) -> Any:
    if not isinstance(value, dict):
        return value
    result = dict(value)
    for key in SEO_KNOWLEDGE_LIST_KEYS:
        raw_values = result.get(key)
        if not isinstance(raw_values, list):
            continue
        result[key] = [
            cleaned
            for raw_value in raw_values
            if isinstance(raw_value, str)
            if (
                cleaned := remove_single_wall_placement_rule(
                    raw_value,
                    single_wall_context=single_wall_context,
                )
            )
        ]
    return result


def sanitize_sku_seo_dict(
    value: Any,
    *,
    single_wall_context: bool = False,
) -> Any:
    if not isinstance(value, dict):
        return value
    result = dict(value)
    for key in ("short_description", "description", "seo_description"):
        if isinstance(result.get(key), str):
            result[key] = remove_single_wall_placement_rule(
                result[key],
                single_wall_context=single_wall_context,
            )
    return result
