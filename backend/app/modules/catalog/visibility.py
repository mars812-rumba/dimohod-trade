from collections.abc import Iterable
from typing import Protocol


class CategoryNode(Protocol):
    id: object
    parent_id: object | None
    extra_attributes: dict[str, object] | None


def has_public_category_cover(category: CategoryNode) -> bool:
    attributes = category.extra_attributes or {}
    cover = attributes.get("category_cover")
    return (
        isinstance(cover, dict)
        and isinstance(cover.get("url"), str)
        and bool(cover["url"].strip())
    )


def visible_category_ids(
    categories: Iterable[CategoryNode],
    active_product_category_ids: set[object],
) -> set[object]:
    """Keep publication-ready categories and every ancestor needed for navigation."""
    category_list = list(categories)
    parent_by_id = {category.id: category.parent_id for category in category_list}
    category_by_id = {category.id: category for category in category_list}
    visible = {
        category_id
        for category_id in active_product_category_ids
        if category_id in parent_by_id
        and has_public_category_cover(category_by_id[category_id])
    }
    pending = list(visible)
    while pending:
        parent_id = parent_by_id.get(pending.pop())
        if parent_id is not None and parent_id in parent_by_id and parent_id not in visible:
            visible.add(parent_id)
            pending.append(parent_id)
    return visible
