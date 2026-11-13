from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import uuid

import sqlalchemy as sa


spec = spec_from_file_location(
    "catalog_seo_content",
    Path(__file__).parents[1] / "alembic/versions/202611130001_import_catalog_seo_content.py",
)
assert spec is not None and spec.loader is not None
migration = module_from_spec(spec)
spec.loader.exec_module(migration)


def test_reviewed_content_has_the_exact_catalog_scope() -> None:
    content = migration.load_content()

    assert len(content["categories"]) == 19
    assert len(content["product_families"]) == 36
    assert len({tuple(item["catalog_path"]) for item in content["categories"]}) == 19
    assert len({tuple(item["catalog_path"]) for item in content["product_families"]}) == 36
    assert all(len(item["catalog_path"]) == 2 for item in content["categories"])
    assert all(len(item["catalog_path"]) == 3 for item in content["product_families"])


def test_import_is_idempotent_and_rollback_preserves_later_edits() -> None:
    original_attributes = {"category_cover": {"url": "/cover.jpg"}, "seo_title": "Старый title"}
    values = migration.upgraded_values(
        "Старое описание",
        original_attributes,
        imported_description="Новое описание",
        imported_title="Новый title",
        imported_meta="Новый meta",
    )
    changed = {
        "description": values["description"],
        "extra_attributes": values["extra_attributes"],
    }

    assert migration.upgraded_values(
        changed["description"],
        changed["extra_attributes"],
        imported_description="Новое описание",
        imported_title="Новый title",
        imported_meta="Новый meta",
    ) is None
    assert migration.restored_values(changed["description"], changed["extra_attributes"]) == {
        "description": "Старое описание",
        "extra_attributes": original_attributes,
    }

    changed["description"] = "Правка администратора"
    changed["extra_attributes"]["seo_title"] = "Правка title"
    restored = migration.restored_values(changed["description"], changed["extra_attributes"])
    assert restored["description"] == "Правка администратора"
    assert restored["extra_attributes"]["seo_title"] == "Правка title"
    assert restored["extra_attributes"]["category_cover"] == {"url": "/cover.jpg"}
    assert migration.BACKUP_KEY not in restored["extra_attributes"]


def test_upgrade_and_downgrade_match_catalog_paths(monkeypatch) -> None:
    content = migration.load_content()
    engine = sa.create_engine("sqlite://")
    metadata = sa.MetaData()
    categories = sa.Table(
        "categories", metadata,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("parent_id", sa.Uuid()),
        sa.Column("name", sa.String()),
        sa.Column("description", sa.Text()),
        sa.Column("extra_attributes", sa.JSON()),
    )
    products = sa.Table(
        "products", metadata,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("category_id", sa.Uuid()),
        sa.Column("name", sa.String()),
        sa.Column("description", sa.Text()),
        sa.Column("extra_attributes", sa.JSON()),
    )
    metadata.create_all(engine)

    with engine.begin() as connection:
        section_ids = {item["section"]: uuid.uuid4() for item in content["categories"]}
        category_ids = {tuple(item["catalog_path"]): uuid.uuid4() for item in content["categories"]}
        connection.execute(sa.insert(categories), [
            *[
                {"id": identifier, "parent_id": None, "name": name,
                 "description": None, "extra_attributes": {}}
                for name, identifier in section_ids.items()
            ],
            *[
                {"id": category_ids[tuple(item["catalog_path"])],
                 "parent_id": section_ids[item["section"]], "name": item["name"],
                 "description": None, "extra_attributes": {}}
                for item in content["categories"]
            ],
        ])
        connection.execute(sa.insert(products), [
            {"id": uuid.uuid4(), "category_id": category_ids[tuple(item["catalog_path"][:2])],
             "name": item["name"], "description": None, "extra_attributes": {}}
            for item in content["product_families"]
        ])
        monkeypatch.setattr(migration.op, "get_bind", lambda: connection)

        migration.upgrade()
        imported_categories = list(connection.execute(
            sa.select(categories).where(categories.c.parent_id.is_not(None))
        ).mappings())
        imported_products = list(connection.execute(sa.select(products)).mappings())
        assert all(row["description"] for row in imported_categories)
        assert all(row["extra_attributes"]["seo_title"] for row in imported_categories)
        assert all(row["description"] for row in imported_products)
        assert all(row["extra_attributes"]["seo_description"] for row in imported_products)

        migration.downgrade()
        restored = [*connection.execute(sa.select(categories)).mappings(),
                    *connection.execute(sa.select(products)).mappings()]
        assert all(row["description"] is None for row in restored)
        assert all(row["extra_attributes"] == {} for row in restored)
