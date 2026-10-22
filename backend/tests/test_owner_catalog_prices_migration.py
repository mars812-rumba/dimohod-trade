from decimal import Decimal
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import uuid

import pytest
import sqlalchemy as sa

spec = spec_from_file_location(
    "owner_catalog_prices", Path(__file__).parents[1] / "alembic/versions/202610220001_owner_catalog_prices.py",
)
assert spec is not None and spec.loader is not None
migration = module_from_spec(spec)
spec.loader.exec_module(migration)


def original():
    return dict(product_slug=migration.PLATFORM_SLUG, diameter_mm=150, outer_diameter_mm=250,
                price_rub=Decimal("2467.19"), attributes={"outer_steel_grade": "AISI 430", "media": ["keep"]})


def test_owner_photo_prices_are_exact_and_grade_independent():
    expected = [3381, 3419, 3438, 3576, 3641, 3769, 3862, 4106, 4417, 4897, 4990, 5185]
    assert list(migration.PLATFORM_PRICES.values()) == list(map(Decimal, expected))
    for pair, price in migration.PLATFORM_PRICES.items():
        for grade in ("AISI 304", "AISI 316", "AISI 321", "AISI 430"):
            row = {**original(), "diameter_mm": pair[0], "outer_diameter_mm": pair[1], "steel_grade": grade}
            assert migration.corrected_values(row)["price_rub"] == price


def test_wool_and_existing_115_alias():
    assert migration.target_price({**original(), "product_slug": migration.WOOL_SLUG}) == Decimal("1300")
    assert migration.target_price({**original(), "diameter_mm": 115, "outer_diameter_mm": 215}) == Decimal("3438")


def test_idempotence_backup_and_safe_rollback():
    row = original()
    values = migration.corrected_values(row)
    changed = {**row, **values}
    assert row == original()
    assert changed["attributes"]["media"] == ["keep"]
    assert migration.corrected_values(changed) is None
    assert {**changed, **migration.restored_values(changed)} == row
    edited = {**changed, "price_rub": Decimal("9999"), "attributes": {**changed["attributes"], "later": True}}
    restored = {**edited, **migration.restored_values(edited)}
    assert restored["price_rub"] == Decimal("9999")
    assert restored["attributes"]["later"] is True
    assert migration.BACKUP_KEY not in restored["attributes"]
    null_price = {**row, "price_rub": None}
    changed_null = {**null_price, **migration.corrected_values(null_price)}
    assert migration.restored_values(changed_null)["price_rub"] is None


def test_unrelated_and_already_correct_prices_are_not_changed():
    assert migration.corrected_values({**original(), "product_slug": "some-other-product"}) is None
    assert migration.corrected_values({**original(), "price_rub": Decimal("3769")}) is None
    with pytest.raises(ValueError, match="No owner-confirmed"):
        migration.target_price({**original(), "diameter_mm": 999})


def test_upgrade_and_downgrade_on_temporary_database(monkeypatch):
    engine = sa.create_engine("sqlite://")
    metadata = sa.MetaData()
    products = sa.Table("products", metadata, sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("slug", sa.String()))
    skus = sa.Table("skus", metadata, sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("product_id", sa.Uuid()),
                    sa.Column("diameter_mm", sa.Integer()), sa.Column("outer_diameter_mm", sa.Integer()),
                    sa.Column("price_rub", sa.Numeric()), sa.Column("attributes", sa.JSON()), sa.Column("steel_grade", sa.String()))
    metadata.create_all(engine)
    with engine.begin() as connection:
        ids = {slug: uuid.uuid4() for slug in (migration.WOOL_SLUG, migration.PLATFORM_SLUG, "unrelated")}
        connection.execute(sa.insert(products), [{"id": id_, "slug": slug} for slug, id_ in ids.items()])
        pairs = [*migration.PLATFORM_PRICES, (115, 215)]
        rows = [dict(id=uuid.uuid4(), product_id=ids[migration.PLATFORM_SLUG], diameter_mm=d, outer_diameter_mm=D,
                     price_rub=Decimal("1234.56"), attributes={"keep": "unchanged"}, steel_grade=grade)
                for d, D in pairs for grade in ("AISI 304", "AISI 316", "AISI 321")]
        rows += [dict(id=uuid.uuid4(), product_id=ids[slug], diameter_mm=None, outer_diameter_mm=None,
                      price_rub=Decimal("900"), attributes={"keep": "unchanged"}, steel_grade=None)
                 for slug in (migration.WOOL_SLUG, "unrelated")]
        connection.execute(sa.insert(skus), rows)
        before = [dict(r) for r in connection.execute(sa.select(skus)).mappings()]
        monkeypatch.setattr(migration.op, "get_bind", lambda: connection)
        migration.upgrade()
        after = [dict(r) for r in connection.execute(sa.select(skus)).mappings()]
        for row in after:
            if row["product_id"] == ids["unrelated"]:
                assert row["price_rub"] == Decimal("900")
            elif row["product_id"] == ids[migration.WOOL_SLUG]:
                assert row["price_rub"] == Decimal("1300")
            else:
                assert row["price_rub"] == migration.target_price({**row, "product_slug": migration.PLATFORM_SLUG})
            assert row["attributes"]["keep"] == "unchanged"
        migration.upgrade()
        assert after == [dict(r) for r in connection.execute(sa.select(skus)).mappings()]
        migration.downgrade()
        assert before == [dict(r) for r in connection.execute(sa.select(skus)).mappings()]
        connection.execute(sa.insert(skus), {
            **rows[0], "id": uuid.uuid4(), "diameter_mm": 999, "outer_diameter_mm": 1099,
        })
        before_unknown = [dict(r) for r in connection.execute(sa.select(skus)).mappings()]
        with pytest.raises(ValueError, match="No owner-confirmed"):
            migration.upgrade()
        assert before_unknown == [dict(r) for r in connection.execute(sa.select(skus)).mappings()]
