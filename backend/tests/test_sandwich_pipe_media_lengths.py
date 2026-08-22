import importlib.util
from pathlib import Path


MIGRATION_PATH = (
    Path(__file__).parents[1]
    / "alembic"
    / "versions"
    / "202608220001_sandwich_pipe_media_lengths.py"
)
SPEC = importlib.util.spec_from_file_location("sandwich_pipe_media_lengths", MIGRATION_PATH)
assert SPEC is not None and SPEC.loader is not None
MIGRATION = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MIGRATION)


def test_assigns_each_sandwich_pipe_photo_to_real_catalog_lengths() -> None:
    media = [
        {"url": "/media/catalog/sendvich-truba/photo-1.webp", "role": "general"},
        {"url": "/media/catalog/sendvich-truba/photo-2.webp", "role": "top"},
        {"url": "/media/catalog/sendvich-truba/photo-3.webp", "role": "connection"},
    ]

    updated = MIGRATION.sandwich_pipe_media(media)

    assert updated is not None
    assert [(item["role"], item["scope"], item["lengths_mm"]) for item in updated] == [
        ("general", "variant", [1000]),
        ("general", "variant", [150, 250, 350]),
        ("general", "variant", [500, 750]),
    ]


def test_does_not_partially_reassign_an_incomplete_gallery() -> None:
    media = [{"url": "/media/catalog/sendvich-truba/photo-1.webp", "role": "general"}]

    assert MIGRATION.sandwich_pipe_media(media) is None
