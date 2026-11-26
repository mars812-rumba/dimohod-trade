"""Apply reviewed product description edits without overwriting owner changes.

Revision ID: 202611260001
Revises: 202611180002
"""
from collections.abc import Sequence
import json
from pathlib import Path
from typing import Any

import sqlalchemy as sa
from alembic import op

revision: str = "202611260001"
down_revision: str | None = "202611180002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BACKUP_KEY = "_copy_edit_20261126_previous"
CONTENT_FILE = "dimohod-copy-edit-20261126.json"
products = sa.table(
    "products", sa.column("id", sa.Uuid()), sa.column("slug", sa.String()),
    sa.column("description", sa.Text()), sa.column("extra_attributes", sa.JSON()),
)


def load_content() -> dict[str, dict[str, str]]:
    path = Path(__file__).resolve().parents[2] / "catalog_content" / CONTENT_FILE
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {item["slug"]: item for item in payload["product_descriptions"]}


def corrected_values(row: dict[str, Any], edit: dict[str, str]) -> dict[str, Any] | None:
    attributes = dict(row.get("extra_attributes") or {})
    if BACKUP_KEY in attributes or row.get("description") != edit["before"]:
        return None
    attributes[BACKUP_KEY] = {"before": edit["before"], "after": edit["after"]}
    return {"description": edit["after"], "extra_attributes": attributes}


def restored_values(row: dict[str, Any]) -> dict[str, Any] | None:
    attributes = dict(row.get("extra_attributes") or {})
    backup = attributes.pop(BACKUP_KEY, None)
    if not isinstance(backup, dict):
        return None
    values: dict[str, Any] = {"extra_attributes": attributes}
    if row.get("description") == backup.get("after"):
        values["description"] = backup["before"]
    return values


def upgrade() -> None:
    edits = load_content()
    bind = op.get_bind()
    rows = bind.execute(sa.select(products).where(products.c.slug.in_(edits)).with_for_update()).mappings()
    for row in rows:
        values = corrected_values(dict(row), edits[row["slug"]])
        if values is not None:
            bind.execute(products.update().where(products.c.id == row["id"]).values(**values))


def downgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.select(products).where(products.c.slug.in_(load_content())).with_for_update()).mappings()
    for row in rows:
        values = restored_values(dict(row))
        if values is not None:
            bind.execute(products.update().where(products.c.id == row["id"]).values(**values))
