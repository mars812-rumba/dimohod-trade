"""Correct console mounting from the owner's 2026-10-04 clarification.

Revision ID: 202610040001
Revises: 202610030002
"""
from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from alembic import op

revision: str = "202610040001"
down_revision: str | None = "202610030002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SLUGS = ("konsol-teleskopicheskaya", "konsol-universalnaya")
BACKUP_KEY = "_wall_console_mounting_20261004_previous"
SOURCE = "Владелец, 04.10.2026: обе консоли настенные; напольных в каталоге нет."
products = sa.table(
    "products",
    sa.column("id", sa.Uuid()),
    sa.column("slug", sa.String()),
    sa.column("short_description", sa.Text()),
    sa.column("application_tags", sa.JSON()),
    sa.column("extra_attributes", sa.JSON()),
)


def corrected_values(row: dict[str, Any]) -> dict[str, Any] | None:
    if row["slug"] not in SLUGS:
        return None
    attrs = dict(row.get("extra_attributes") or {})
    if BACKUP_KEY in attrs:
        return None
    changes: dict[str, Any] = {}
    previous: dict[str, Any] = {"fields": {}, "attributes": {}}
    short = row.get("short_description")
    if isinstance(short, str) and "Напольная консоль." in short:
        changes["short_description"] = short.replace("Напольная консоль.", "Настенная консоль.")
    tags = row.get("application_tags")
    if isinstance(tags, list) and "пол" in tags:
        changes["application_tags"] = list(dict.fromkeys("стена" if tag == "пол" else tag for tag in tags))
    for key, value in changes.items():
        previous["fields"][key] = {"before": row.get(key), "after": value}
    for key, value in {"mounting_type": "настенная", "owner_confirmed_mounting_source": SOURCE}.items():
        if attrs.get(key) != value:
            previous["attributes"][key] = {"present": key in attrs, "before": attrs.get(key), "after": value}
            attrs[key] = value
    if not previous["fields"] and not previous["attributes"]:
        return None
    attrs[BACKUP_KEY] = previous
    changes["extra_attributes"] = attrs
    return changes


def restored_values(row: dict[str, Any]) -> dict[str, Any] | None:
    attrs = dict(row.get("extra_attributes") or {})
    previous = attrs.pop(BACKUP_KEY, None)
    if not isinstance(previous, dict):
        return None
    changes: dict[str, Any] = {}
    # Do not overwrite editorial changes made after this migration.
    for key, state in previous["fields"].items():
        if row.get(key) == state["after"]:
            changes[key] = state["before"]
    for key, state in previous["attributes"].items():
        if attrs.get(key) == state["after"]:
            if state["present"]:
                attrs[key] = state["before"]
            else:
                attrs.pop(key, None)
    changes["extra_attributes"] = attrs
    return changes


def upgrade() -> None:
    bind = op.get_bind()
    for row in bind.execute(sa.select(products).where(products.c.slug.in_(SLUGS))).mappings():
        values = corrected_values(dict(row))
        if values:
            bind.execute(sa.update(products).where(products.c.id == row["id"]).values(**values))


def downgrade() -> None:
    bind = op.get_bind()
    for row in bind.execute(sa.select(products).where(products.c.slug.in_(SLUGS))).mappings():
        values = restored_values(dict(row))
        if values:
            bind.execute(sa.update(products).where(products.c.id == row["id"]).values(**values))
