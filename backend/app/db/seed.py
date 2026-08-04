import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.modules.catalog.models import Category


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

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
