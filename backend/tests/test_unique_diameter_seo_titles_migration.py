from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

MIGRATION_PATH = (
    Path(__file__).parents[1]
    / "alembic"
    / "versions"
    / "202608240001_unique_diameter_seo_titles.py"
)
spec = spec_from_file_location("unique_diameter_seo_titles", MIGRATION_PATH)
assert spec is not None and spec.loader is not None
migration = module_from_spec(spec)
spec.loader.exec_module(migration)


def test_all_affected_title_templates_use_the_diameter_variable() -> None:
    assert len(migration.TITLE_TEMPLATES) == 10
    assert all(
        "{diameter}" in title for title in migration.TITLE_TEMPLATES.values()
    )


def test_title_migration_restores_existing_title_and_other_attributes() -> None:
    original = {"seo_title": "Старый title", "media": [{"url": "/photo.webp"}]}

    upgraded = migration.upgraded_attributes(
        original,
        migration.TITLE_TEMPLATES["odnostennyi-truba"],
    )
    assert upgraded is not None
    assert upgraded["seo_title"] == (
        "Труба одноконтурная {diameter} — купить | Дымоход Трейд"
    )

    restored = migration.restored_attributes(upgraded)
    assert restored == original


def test_title_migration_restores_a_missing_title_as_missing() -> None:
    upgraded = migration.upgraded_attributes(
        {"media": []},
        migration.TITLE_TEMPLATES["sendvich-otvod-90-gr"],
    )
    assert upgraded is not None

    restored = migration.restored_attributes(upgraded)
    assert restored == {"media": []}
