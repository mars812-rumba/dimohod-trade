"""Make product titles unique for public diameter pages.

Revision ID: 202608240001
Revises: 202608220001
Create Date: 2026-08-24
"""

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa

from alembic import op

revision: str = "202608240001"
down_revision: str | None = "202608220001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BACKUP_KEY = "_diameter_seo_title_previous"
TITLE_TEMPLATES = {
    "odnostennyi-krepezh-homut-shirokii": (
        "Хомут широкий {diameter} — купить | Дымоход Трейд"
    ),
    "odnostennyi-otvod-45-gr": (
        "Отвод одноконтурный 45° {diameter} — купить | Дымоход Трейд"
    ),
    "odnostennyi-shiber-povorotnyi": (
        "Шибер одноконтурный {diameter} — купить | Дымоход Трейд"
    ),
    "odnostennyi-troi-nik-s-k-o-90gr": (
        "Тройник одноконтурный 90° {diameter} — купить | Дымоход Трейд"
    ),
    "odnostennyi-truba": (
        "Труба одноконтурная {diameter} — купить | Дымоход Трейд"
    ),
    "sendvich-ogolovok-deflektor-konus": (
        "Сэндвич-дефлектор-конус {diameter} — купить | Дымоход Трейд"
    ),
    "sendvich-opornaya-ploschadka": (
        "Опорная площадка сэндвич {diameter} — купить | Дымоход Трейд"
    ),
    "sendvich-otvod-90-gr": (
        "Сэндвич-отвод 90° {diameter} — купить | Дымоход Трейд"
    ),
    "sendvich-troi-nik-s-k-o-90gr": (
        "Сэндвич-тройник 90° {diameter} — купить | Дымоход Трейд"
    ),
    "sendvich-zaglushka-opornaya": (
        "Сэндвич-заглушка опорная {diameter} — купить | Дымоход Трейд"
    ),
}

products = sa.table(
    "products",
    sa.column("id", sa.Uuid()),
    sa.column("slug", sa.String()),
    sa.column("extra_attributes", sa.JSON()),
)


def upgraded_attributes(raw_attributes: Any, title_template: str) -> dict[str, Any] | None:
    attributes = dict(raw_attributes or {})
    if BACKUP_KEY in attributes or attributes.get("seo_title") == title_template:
        return None
    attributes[BACKUP_KEY] = {
        "had_seo_title": "seo_title" in attributes,
        "seo_title": attributes.get("seo_title"),
    }
    attributes["seo_title"] = title_template
    return attributes


def restored_attributes(raw_attributes: Any) -> dict[str, Any] | None:
    attributes = dict(raw_attributes or {})
    backup = attributes.pop(BACKUP_KEY, None)
    if not isinstance(backup, dict):
        return None
    if backup.get("had_seo_title"):
        attributes["seo_title"] = backup.get("seo_title")
    else:
        attributes.pop("seo_title", None)
    return attributes


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.select(products.c.id, products.c.slug, products.c.extra_attributes).where(
            products.c.slug.in_(tuple(TITLE_TEMPLATES))
        )
    ).mappings()
    for row in rows:
        attributes = upgraded_attributes(
            row["extra_attributes"],
            TITLE_TEMPLATES[row["slug"]],
        )
        if attributes is None:
            continue
        bind.execute(
            sa.update(products)
            .where(products.c.id == row["id"])
            .values(extra_attributes=attributes)
        )


def downgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.select(products.c.id, products.c.extra_attributes).where(
            products.c.slug.in_(tuple(TITLE_TEMPLATES))
        )
    ).mappings()
    for row in rows:
        attributes = restored_attributes(row["extra_attributes"])
        if attributes is None:
            continue
        bind.execute(
            sa.update(products)
            .where(products.c.id == row["id"])
            .values(extra_attributes=attributes)
        )
