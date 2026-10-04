from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

import sqlalchemy as sa

spec = spec_from_file_location(
    "wall_console_mounting",
    Path(__file__).parents[1] / "alembic/versions/202610040001_wall_console_mounting.py",
)
assert spec is not None and spec.loader is not None
migration = module_from_spec(spec)
spec.loader.exec_module(migration)


def original():
    return {
        "slug": "konsol-teleskopicheskaya",
        "short_description": "Напольная консоль. Варианты по диапазону размеров из прайса.",
        "application_tags": ["пол", "стена", "другой тег"],
        "extra_attributes": {"mounting_type": "напольная", "price_source_sheet": "Фланцы", "media": ["photo"]},
    }


def test_wall_mounting_preserves_other_attributes_and_is_idempotent():
    row = original()
    values = migration.corrected_values(row)
    assert values["short_description"].startswith("Настенная консоль.")
    assert values["application_tags"] == ["стена", "другой тег"]
    assert values["extra_attributes"]["mounting_type"] == "настенная"
    assert values["extra_attributes"]["media"] == ["photo"]
    assert values["extra_attributes"]["price_source_sheet"] == "Фланцы"
    assert row == original()
    assert migration.corrected_values({**row, **values}) is None
    assert {**row, **values, **migration.restored_values({**row, **values})} == row


def test_unrelated_products_are_not_corrected():
    assert migration.corrected_values({**original(), "slug": "some-other-console"}) is None


def test_downgrade_preserves_later_editor_changes():
    row = original()
    updated = {**row, **migration.corrected_values(row)}
    updated["short_description"] = "Позднее описание редактора"
    updated["extra_attributes"]["mounting_type"] = "Позднее значение"
    updated["extra_attributes"]["media"] = ["new photo"]
    restored = {**updated, **migration.restored_values(updated)}
    assert restored["short_description"] == "Позднее описание редактора"
    assert restored["extra_attributes"]["mounting_type"] == "Позднее значение"
    assert restored["extra_attributes"]["media"] == ["new photo"]
    assert migration.BACKUP_KEY not in restored["extra_attributes"]


def test_upgrade_and_downgrade_on_isolated_database(monkeypatch):
    engine = sa.create_engine("sqlite://")
    metadata = sa.MetaData()
    table = sa.Table(
        "products", metadata,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("slug", sa.String()),
        sa.Column("short_description", sa.Text()),
        sa.Column("application_tags", sa.JSON()),
        sa.Column("extra_attributes", sa.JSON()),
    )
    metadata.create_all(engine)
    import uuid
    with engine.begin() as connection:
        rows = [{"id": uuid.uuid4(), **original()}, {"id": uuid.uuid4(), **original(), "slug": "unrelated"}]
        connection.execute(sa.insert(table), rows)
        monkeypatch.setattr(migration.op, "get_bind", lambda: connection)
        migration.upgrade()
        corrected = connection.execute(sa.select(table).where(table.c.id == rows[0]["id"])).mappings().one()
        assert corrected["extra_attributes"]["mounting_type"] == "настенная"
        unrelated = connection.execute(sa.select(table).where(table.c.id == rows[1]["id"])).mappings().one()
        assert dict(unrelated) == rows[1]
        migration.downgrade()
        restored = connection.execute(sa.select(table).where(table.c.id == rows[0]["id"])).mappings().one()
        assert dict(restored) == rows[0]
