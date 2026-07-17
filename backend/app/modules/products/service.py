from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.modules.products.models import Product


async def list_products(session: AsyncSession, *, limit: int = 48, offset: int = 0) -> tuple[list[Product], int]:
    kind_order = case(
        (Product.product_kind == "труба", 10),
        (Product.product_kind == "отвод", 20),
        (Product.product_kind == "тройник", 30),
        (Product.product_kind == "четверник", 40),
        (Product.product_kind == "шибер", 50),
        (Product.product_kind == "ревизия", 60),
        (Product.product_kind == "заглушка", 70),
        (Product.product_kind == "крепеж", 80),
        (Product.product_kind == "оголовок", 90),
        else_=999,
    )
    total = await session.scalar(select(func.count(Product.id)).where(Product.is_active.is_(True)))
    result = await session.execute(
        select(Product)
        .where(Product.is_active.is_(True))
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


async def get_product_by_slug(session: AsyncSession, slug: str) -> Product | None:
    result = await session.execute(
        select(Product)
        .where(Product.slug == slug, Product.is_active.is_(True))
        .options(joinedload(Product.category), selectinload(Product.skus))
    )
    return result.scalar_one_or_none()
