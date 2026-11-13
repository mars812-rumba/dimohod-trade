from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import uuid

import sqlalchemy as sa


spec = spec_from_file_location(
    "product_faq_content",
    Path(__file__).parents[1] / "alembic/versions/202611130002_import_product_faq.py",
)
assert spec is not None and spec.loader is not None
migration = module_from_spec(spec)
spec.loader.exec_module(migration)


def test_reviewed_faq_has_exact_scope_and_public_shape() -> None:
    content = migration.load_content()
    families = content["product_families"]

    assert len(families) == 36
    assert sum(len(item["faq"]) for item in families) == 72
    assert len({tuple(item["catalog_path"]) for item in families}) == 36
    for family in families:
        items = migration.public_faq_items(family)
        assert len(items) == 2
        assert all(item["question"] and item["answer"] and item["evidence"] for item in items)
        assert all(item["is_visible"] is True for item in items)
        assert all("research" not in item for item in items)


def test_import_is_idempotent_and_rollback_preserves_admin_edits() -> None:
    original = {"media": [{"url": "/photo.jpg"}], "faq": [{"question": "Старый"}]}
    imported = [{"question": "Новый", "answer": "Ответ", "evidence": ["Источник"], "is_visible": True}]
    changed = migration.upgraded_attributes(original, imported)

    assert migration.upgraded_attributes(changed, imported) is None
    assert migration.restored_attributes(changed) == original

    changed = migration.upgraded_attributes(original, imported)
    changed["faq"][0]["answer"] = "Правка администратора"
    restored = migration.restored_attributes(changed)
    assert restored["faq"][0]["answer"] == "Правка администратора"
    assert restored["faq_configured"] is True
    assert restored["media"] == [{"url": "/photo.jpg"}]
    assert migration.BACKUP_KEY not in restored


def test_upgrade_and_downgrade_match_all_catalog_paths(monkeypatch) -> None:
    families = migration.load_content()["product_families"]
    engine = sa.create_engine("sqlite://")
    metadata = sa.MetaData()
    categories = sa.Table(
        "categories", metadata,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("parent_id", sa.Uuid()),
        sa.Column("name", sa.String()),
    )
    products = sa.Table(
        "products", metadata,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("category_id", sa.Uuid()),
        sa.Column("name", sa.String()),
        sa.Column("extra_attributes", sa.JSON()),
    )
    metadata.create_all(engine)

    with engine.begin() as connection:
        section_ids = {item["section"]: uuid.uuid4() for item in families}
        category_ids = {tuple(item["catalog_path"][:2]): uuid.uuid4() for item in families}
        connection.execute(sa.insert(categories), [
            *[{"id": identifier, "parent_id": None, "name": name}
              for name, identifier in section_ids.items()],
            *[{"id": identifier, "parent_id": section_ids[path[0]], "name": path[1]}
              for path, identifier in category_ids.items()],
        ])
        connection.execute(sa.insert(products), [
            {"id": uuid.uuid4(), "category_id": category_ids[tuple(item["catalog_path"][:2])],
             "name": item["name"], "extra_attributes": {"keep": True}}
            for item in families
        ])
        monkeypatch.setattr(migration.op, "get_bind", lambda: connection)

        migration.upgrade()
        rows = list(connection.execute(sa.select(products)).mappings())
        assert len(rows) == 36
        assert sum(len(row["extra_attributes"]["faq"]) for row in rows) == 72
        assert all(row["extra_attributes"]["faq_configured"] is True for row in rows)
        assert all(row["extra_attributes"]["keep"] is True for row in rows)

        migration.upgrade()
        assert rows == list(connection.execute(sa.select(products)).mappings())
        migration.downgrade()
        restored = list(connection.execute(sa.select(products)).mappings())
        assert all(row["extra_attributes"] == {"keep": True} for row in restored)
