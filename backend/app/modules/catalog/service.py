from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.models import Category
from app.modules.catalog.schemas import CatalogMediaItem, CategoryTreeNode


def category_cover(extra_attributes: dict[str, object] | None) -> CatalogMediaItem | None:
    value = (extra_attributes or {}).get("category_cover")
    if not isinstance(value, dict) or not isinstance(value.get("url"), str):
        return None
    return CatalogMediaItem(
        url=value["url"],
        alt=value.get("alt") if isinstance(value.get("alt"), str) else None,
        role=value.get("role") if isinstance(value.get("role"), str) else None,
    )


async def get_catalog_tree(session: AsyncSession) -> list[CategoryTreeNode]:
    result = await session.execute(
        select(Category)
        .where(Category.is_active.is_(True))
        .order_by(Category.sort_order.asc(), Category.name.asc())
    )
    categories = list(result.scalars())

    nodes = {
        category.id: CategoryTreeNode(
            id=category.id,
            parent_id=category.parent_id,
            name=category.name,
            slug=category.slug,
            description=category.description,
            sort_order=category.sort_order,
            cover=category_cover(category.extra_attributes),
        )
        for category in categories
    }

    roots: list[CategoryTreeNode] = []
    for category in categories:
        node = nodes[category.id]
        if category.parent_id and category.parent_id in nodes:
            nodes[category.parent_id].children.append(node)
        else:
            roots.append(node)

    return roots
