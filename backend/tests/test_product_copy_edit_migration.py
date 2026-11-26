from copy import deepcopy
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import uuid

import sqlalchemy as sa


spec = spec_from_file_location(
    "product_copy_edit",
    Path(__file__).parents[1] / "alembic/versions/202611260001_edit_product_copy.py",
)
assert spec is not None and spec.loader is not None
migration = module_from_spec(spec)
spec.loader.exec_module(migration)


def test_only_exact_previous_copy_is_changed_and_backup_is_reversible() -> None:
    for edit in migration.load_content().values():
        attributes = {"seo_title": "Купить изделие", "seo_description": "Описание для поиска",
                      "faq": [{"answer": "Ответ редактора"}], "media": {"photos": ["/photo.webp"]}}
        original = {"description": edit["before"], "extra_attributes": deepcopy(attributes)}
        values = migration.corrected_values(original, edit)
        assert values["description"] == edit["after"]
        assert original["extra_attributes"] == attributes
        assert migration.corrected_values(values, edit) is None
        assert migration.restored_values(values) == original

        custom = {**original, "description": "Поздняя правка администратора"}
        assert migration.corrected_values(custom, edit) is None
        assert migration.corrected_values({**original, "description": None}, edit) is None

        values["description"] = "Правка администратора после обновления"
        values["extra_attributes"]["seo_title"] = "Новый title"
        restored = migration.restored_values(values)
        assert "description" not in restored
        assert restored["extra_attributes"]["seo_title"] == "Новый title"
        assert migration.BACKUP_KEY not in restored["extra_attributes"]


def test_database_upgrade_targets_only_matching_families_and_preserves_sku_data(monkeypatch) -> None:
    engine = sa.create_engine("sqlite://")
    metadata = sa.MetaData()
    products = sa.Table(
        "products", metadata,
        sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("slug", sa.String()),
        sa.Column("description", sa.Text()), sa.Column("extra_attributes", sa.JSON()),
    )
    skus = sa.Table(
        "skus", metadata, sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("price_rub", sa.Numeric()), sa.Column("diameter_mm", sa.Integer()),
    )
    metadata.create_all(engine)
    edits = list(migration.load_content().values())
    rows = [dict(id=uuid.uuid4(), slug=edit["slug"], description=edit["before"],
                 extra_attributes={"seo_title": "Купить изделие"}) for edit in edits]
    rows.append(dict(id=uuid.uuid4(), slug="other-family", description="Другой товар", extra_attributes={}))
    # A manual edit made before release must win over the reviewed replacement.
    rows[1]["description"] = "Собственное описание владельца"
    with engine.begin() as connection:
        connection.execute(products.insert(), rows)
        connection.execute(skus.insert(), dict(id=uuid.uuid4(), price_rub=899, diameter_mm=215))
        original_skus = list(connection.execute(sa.select(skus)).mappings())
        monkeypatch.setattr(migration.op, "get_bind", lambda: connection)
        migration.upgrade()
        after = list(connection.execute(sa.select(products).order_by(products.c.slug)).mappings())
        by_slug = {row["slug"]: row for row in after}
        assert by_slug[edits[0]["slug"]]["description"] == edits[0]["after"]
        assert by_slug[edits[2]["slug"]]["description"] == edits[2]["after"]
        assert by_slug[edits[1]["slug"]]["description"] == rows[1]["description"]
        assert migration.BACKUP_KEY not in by_slug[edits[1]["slug"]]["extra_attributes"]
        assert by_slug["other-family"]["description"] == "Другой товар"
        migration.upgrade()
        assert list(connection.execute(sa.select(products).order_by(products.c.slug)).mappings()) == after
        migration.downgrade()
        restored = {row["slug"]: dict(row) for row in connection.execute(sa.select(products)).mappings()}
        assert restored == {row["slug"]: row for row in rows}
        assert list(connection.execute(sa.select(skus)).mappings()) == original_skus


def test_empty_catalog_can_be_migrated(monkeypatch) -> None:
    engine = sa.create_engine("sqlite://")
    metadata = sa.MetaData()
    sa.Table("products", metadata,
             sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("slug", sa.String()),
             sa.Column("description", sa.Text()), sa.Column("extra_attributes", sa.JSON()))
    metadata.create_all(engine)
    with engine.begin() as connection:
        monkeypatch.setattr(migration.op, "get_bind", lambda: connection)
        migration.upgrade()
        migration.downgrade()
