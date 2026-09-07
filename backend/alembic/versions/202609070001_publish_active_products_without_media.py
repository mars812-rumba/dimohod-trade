"""Publish active products independently of editorial completeness.

Revision ID: 202609070001
Revises: 202608250001
Create Date: 2026-09-07
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "202609070001"
down_revision: str | None = "202608250001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


PRODUCT_SLUG = "odnostennyy-reviziya-prochistka"
SHORT_DESCRIPTION = (
    "Прочистка — одностенный элемент каталога. Доступные исполнения различаются "
    "диаметром, материалом, маркой и толщиной стали; точные параметры и цена "
    "показаны после выбора варианта."
)
DESCRIPTION = """## Что учитывать при подборе

Выберите вариант по диаметру, материалу, марке и толщине стали. Карточка показывает только характеристики, подтверждённые для выбранного SKU.

## Расчёт комплекта

Подберите совместимые элементы и рассчитайте полный комплект дымохода в конфигураторе."""


def upgrade() -> None:
    products = sa.table(
        "products",
        sa.column("slug", sa.String()),
        sa.column("short_description", sa.String()),
        sa.column("description", sa.Text()),
    )
    op.execute(
        products.update()
        .where(products.c.slug == PRODUCT_SLUG)
        .where(products.c.short_description.is_(None))
        .values(short_description=SHORT_DESCRIPTION)
    )
    op.execute(
        products.update()
        .where(products.c.slug == PRODUCT_SLUG)
        .where(products.c.description.is_(None))
        .values(description=DESCRIPTION)
    )


def downgrade() -> None:
    products = sa.table(
        "products",
        sa.column("slug", sa.String()),
        sa.column("short_description", sa.String()),
        sa.column("description", sa.Text()),
    )
    op.execute(
        products.update()
        .where(products.c.slug == PRODUCT_SLUG)
        .where(products.c.short_description == SHORT_DESCRIPTION)
        .values(short_description=None)
    )
    op.execute(
        products.update()
        .where(products.c.slug == PRODUCT_SLUG)
        .where(products.c.description == DESCRIPTION)
        .values(description=None)
    )
