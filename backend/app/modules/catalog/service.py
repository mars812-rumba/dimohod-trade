from collections import defaultdict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.price_section_attributes import outer_pipe_attributes
from app.modules.catalog.models import Category
from app.modules.catalog.schemas import CatalogMediaItem, CategoryTreeNode
from app.modules.catalog.visibility import visible_category_ids
from app.modules.products.models import Product, SKU


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
    active_product_category_ids = set(
        (
            await session.scalars(
                select(Product.category_id)
                .join(SKU, SKU.product_id == Product.id)
                .where(Product.is_active.is_(True), SKU.is_active.is_(True))
                .distinct()
            )
        ).all()
    )
    visible_ids = visible_category_ids(categories, active_product_category_ids)
    categories = [category for category in categories if category.id in visible_ids]

    product_names: dict[UUID, set[str]] = defaultdict(set)
    product_rows = await session.execute(
        select(Product.category_id, Product.name)
        .join(SKU, SKU.product_id == Product.id)
        .where(
            Product.is_active.is_(True),
            Product.category_id.in_(visible_ids),
            SKU.is_active.is_(True),
        )
        .distinct()
    )
    for category_id, product_name in product_rows:
        cleaned_name = product_name.strip() if product_name else ""
        if cleaned_name:
            product_names[category_id].add(cleaned_name)

    standard_lengths: dict[UUID, set[int]] = defaultdict(set)
    steel_grades: dict[UUID, set[str]] = defaultdict(set)
    sku_rows = await session.execute(
        select(Product.category_id, SKU.length_mm, SKU.steel_grade, SKU.attributes)
        .join(SKU, SKU.product_id == Product.id)
        .where(
            Product.is_active.is_(True),
            Product.category_id.in_(visible_ids),
            SKU.is_active.is_(True),
        )
    )
    for category_id, length_mm, steel_grade, attributes in sku_rows:
        if length_mm is not None:
            standard_lengths[category_id].add(length_mm)
        for grade in (steel_grade, outer_pipe_attributes(attributes).get("outer_steel_grade")):
            if isinstance(grade, str) and grade.strip():
                steel_grades[category_id].add(grade.strip())

    nodes = {
        category.id: CategoryTreeNode(
            id=category.id,
            parent_id=category.parent_id,
            name=category.name,
            slug=category.slug,
            description=category.description,
            sort_order=category.sort_order,
            cover=category_cover(category.extra_attributes),
            product_names=sorted(product_names[category.id], key=str.casefold),
            standard_lengths_mm=sorted(standard_lengths[category.id]),
            steel_grades=sorted(steel_grades[category.id], key=str.casefold),
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
