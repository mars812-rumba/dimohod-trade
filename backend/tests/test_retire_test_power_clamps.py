from decimal import Decimal
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import uuid

import sqlalchemy as sa

spec = spec_from_file_location("retire_power_clamps", Path(__file__).parents[1] / "alembic/versions/202611180001_retire_test_power_clamps.py")
migration = module_from_spec(spec)
spec.loader.exec_module(migration)


def test_scoped_reversible_migration_on_isolated_database(monkeypatch):
    engine = sa.create_engine("sqlite://")
    metadata = sa.MetaData()
    products = sa.Table("products", metadata, sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("slug", sa.String()))
    skus = sa.Table("skus", metadata, sa.Column("id", sa.Uuid(), primary_key=True), sa.Column("product_id", sa.Uuid()),
                    sa.Column("article", sa.String()), sa.Column("is_active", sa.Boolean()),
                    sa.Column("price_rub", sa.Numeric()), sa.Column("attributes", sa.JSON()))
    metadata.create_all(engine)
    with engine.begin() as connection:
        product_id, other_id = uuid.uuid4(), uuid.uuid4()
        connection.execute(sa.insert(products), [{"id": product_id, "slug":"odnostennyi-krepezh-homut-silovoi"},
                                                 {"id":other_id,"slug":"other"}])
        rows = [dict(id=uuid.uuid4(),product_id=product_id,article=article,is_active=True,
                     price_rub=Decimal("100"),attributes={"recovery_placeholder":True,"keep":"yes"}) for article in migration.ARTICLES]
        rows += [{**rows[0],"id":uuid.uuid4(),"article":"DT-GOLYE-05-14-D250","price_rub":Decimal("1000.62")},
                 {**rows[0],"id":uuid.uuid4(),"product_id":other_id}]
        connection.execute(sa.insert(skus),rows)
        snapshot = lambda: [dict(r) for r in connection.execute(sa.select(skus)).mappings()]
        before = snapshot()
        monkeypatch.setattr(migration.op,"get_bind",lambda:connection)
        migration.upgrade()
        after = snapshot()
        assert [r["is_active"] for r in after] == [False,False,False,True,True]
        assert [r["price_rub"] for r in after] == [r["price_rub"] for r in before]
        assert all(r["attributes"]["keep"]=="yes" for r in after)
        migration.upgrade()
        assert snapshot()==after
        migration.downgrade()
        assert snapshot()==before


def test_confirmed_or_already_inactive_rows_are_preserved():
    row=dict(article=migration.ARTICLES[0],price_rub=Decimal("100"),is_active=True,attributes={"recovery_placeholder":True})
    assert migration.retired_values({**row,"price_rub":Decimal("1001")}) is None
    assert migration.retired_values({**row,"attributes":{}}) is None
    assert migration.retired_values({**row,"is_active":False}) is None
    retired={**row,**migration.retired_values(row)}
    assert migration.retired_values(retired) is None
    restored=migration.restored_values({**retired,"price_rub":Decimal("1001")})
    assert "is_active" not in restored
