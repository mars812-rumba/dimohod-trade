from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.modules.products.models import Product


async def list_products(
    session: AsyncSession,
    *,
    limit: int = 48,
    offset: int = 0,
    product_kind: str | None = None,
) -> tuple[list[Product], int]:
    kind_order = case(
        (Product.product_kind == "труба", 10),
        (Product.product_kind == "отвод", 20),
        (Product.product_kind == "тройник", 30),
        (Product.product_kind == "четверник", 40),
        (Product.product_kind == "шибер", 50),
        (Product.product_kind == "ревизия", 60),
        (Product.product_kind == "конденсатоотвод", 70),
        (Product.product_kind == "заглушка", 80),
        (Product.product_kind == "крепеж", 90),
        (Product.product_kind == "проходной_узел", 100),
        (Product.product_kind == "оголовок", 110),
        else_=999,
    )
    filters = [Product.is_active.is_(True)]
    if product_kind:
        filters.append(Product.product_kind == product_kind)

    total = await session.scalar(select(func.count(Product.id)).where(*filters))
    result = await session.execute(
        select(Product)
        .where(*filters)
        .options(joinedload(Product.category), selectinload(Product.skus))
        .order_by(
            kind_order,
            Product.diameter_mm.asc(),
            Product.name.asc(),
        )
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars()), int(total or 0)


async def list_product_kind_filters(session: AsyncSession) -> list[tuple[str, int]]:
    result = await session.execute(
        select(Product.product_kind, func.count(Product.id))
        .where(Product.is_active.is_(True), Product.product_kind.is_not(None))
        .group_by(Product.product_kind)
        .order_by(func.count(Product.id).desc(), Product.product_kind.asc())
    )
    return [(str(kind), int(count)) for kind, count in result.all() if kind]


async def get_product_by_slug(session: AsyncSession, slug: str) -> Product | None:
    result = await session.execute(
        select(Product)
        .where(Product.slug == slug, Product.is_active.is_(True))
        .options(joinedload(Product.category), selectinload(Product.skus))
    )
    return result.scalar_one_or_none()
