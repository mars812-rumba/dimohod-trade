from collections import defaultdict
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.price_section_attributes import outer_pipe_attributes
from app.modules.catalog.models import Category
from app.modules.catalog.schemas import CatalogMediaItem, CategoryTreeNode
from app.modules.catalog.visibility import visible_category_ids
from app.modules.products.models import SKU, Product
from app.modules.products.publication import (
    ProductPublicationPolicy,
    prepare_publication_policy,
)


def category_cover(extra_attributes: dict[str, object] | None) -> CatalogMediaItem | None:
    value = (extra_attributes or {}).get("category_cover")
    if not isinstance(value, dict) or not isinstance(value.get("url"), str):
        return None
    return CatalogMediaItem(
        url=value["url"],
        thumbnail_url=value.get("thumbnail_url")
        if isinstance(value.get("thumbnail_url"), str)
        else None,
        width=value.get("width") if isinstance(value.get("width"), int) else None,
        height=value.get("height") if isinstance(value.get("height"), int) else None,
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
    sku_result = await session.execute(
        select(SKU)
        .join(Product, SKU.product_id == Product.id)
        .where(Product.is_active.is_(True), SKU.is_active.is_(True))
        .options(selectinload(SKU.product))
    )
    publication_policies: dict[UUID, ProductPublicationPolicy] = {}
    ready_rows: list[tuple[Product, SKU]] = []
    for sku in sku_result.scalars():
        product = sku.product
        policy = publication_policies.get(product.id)
        if policy is None:
            policy = prepare_publication_policy(product)
            publication_policies[product.id] = policy
        if policy.sku_ready(sku):
            ready_rows.append((product, sku))
    active_product_category_ids = {product.category_id for product, _sku in ready_rows}
    visible_ids = visible_category_ids(categories, active_product_category_ids)
    categories = [category for category in categories if category.id in visible_ids]

    updated_at = {category.id: category.updated_at for category in categories}
    category_by_id = {category.id: category for category in categories}
    for product, sku in ready_rows:
        if product.category_id not in visible_ids:
            continue
        latest = max(product.updated_at, sku.updated_at)
        category_id: UUID | None = product.category_id
        while category_id is not None and category_id in category_by_id:
            updated_at[category_id] = max(updated_at[category_id], latest)
            category_id = category_by_id[category_id].parent_id

    product_names: dict[UUID, set[str]] = defaultdict(set)
    for product, _sku in ready_rows:
        category_id = product.category_id
        product_name = product.name
        if category_id not in visible_ids:
            continue
        cleaned_name = product_name.strip() if product_name else ""
        if cleaned_name:
            product_names[category_id].add(cleaned_name)

    standard_lengths: dict[UUID, set[int]] = defaultdict(set)
    steel_grades: dict[UUID, set[str]] = defaultdict(set)
    for product, sku in ready_rows:
        category_id = product.category_id
        if category_id not in visible_ids:
            continue
        length_mm = sku.length_mm
        steel_grade = sku.steel_grade
        attributes = sku.attributes
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
            updated_at=updated_at[category.id],
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
