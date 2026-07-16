import asyncio
from decimal import Decimal

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.modules.catalog.models import Category
from app.modules.products.models import Product, SKU


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        existing = await session.scalar(select(Category).where(Category.slug == "dymohody-dlya-bani"))
        if existing is not None:
            return

        bath = Category(
            name="Дымоходы для бани",
            slug="dymohody-dlya-bani",
            description="Комплекты и элементы дымохода для печей в парных.",
            sort_order=10,
        )
        sandwich = Category(
            name="Сэндвич-трубы",
            slug="sendvich-truby",
            description="Утепленные модульные трубы для прохода по холодным зонам.",
            sort_order=20,
        )
        single_wall = Category(
            name="Одноконтурные трубы",
            slug="odnokonturnye-truby",
            description="Стартовые участки и внутренние элементы дымохода.",
            sort_order=30,
        )
        session.add_all([bath, sandwich, single_wall])
        await session.flush()

        product = Product(
            category_id=sandwich.id,
            name="Сэндвич-труба 115/200, нержавеющая сталь 0.8 мм",
            slug="sendvich-truba-115-200-nerzhaveyushchaya-stal-08",
            short_description="Базовый модуль для банных печей с диаметром 115 мм.",
            description=(
                "Утепленная труба для прохода дымохода через холодные зоны, "
                "чердак и кровлю. Подходит как основа для demo-карточки MVP."
            ),
            brand="Dimohod Trade",
            material="AISI 430",
            wall_thickness_mm=Decimal("0.80"),
            diameter_mm=115,
            application_tags=["banya", "pech", "sendvich"],
            compatibility_notes=(
                "Для стартового участка от печи обычно нужен одноконтурный элемент. "
                "Финальную комплектацию проверит калькулятор."
            ),
        )
        session.add(product)
        await session.flush()

        session.add_all(
            [
                SKU(
                    product_id=product.id,
                    article="DT-SW-115-200-500",
                    name="Сэндвич-труба 115/200, 0.5 м",
                    price_rub=Decimal("2790.00"),
                    stock_status="in_stock",
                    attributes={"length_mm": 500},
                ),
                SKU(
                    product_id=product.id,
                    article="DT-SW-115-200-1000",
                    name="Сэндвич-труба 115/200, 1 м",
                    price_rub=Decimal("4590.00"),
                    stock_status="in_stock",
                    attributes={"length_mm": 1000},
                ),
            ]
        )
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
