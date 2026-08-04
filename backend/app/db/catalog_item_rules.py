"""Owner-confirmed catalog normalization rules applied during price import."""


def normalized_price_item_name(item_name: str, contour: str | None) -> str:
    normalized = " ".join(item_name.replace("ё", "е").split()).casefold()
    if contour == "сэндвич" and normalized in {"заглушка", "заглушка опорная"}:
        return "Заглушка опорная"
    return item_name.strip()


def exclude_price_item(item_name: str, contour: str | None) -> bool:
    normalized = " ".join(item_name.replace("ё", "е").split()).casefold()
    return contour != "сэндвич" and normalized == "заглушка"
