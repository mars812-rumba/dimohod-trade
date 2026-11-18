from decimal import Decimal
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import uuid

import pytest
import sqlalchemy as sa

spec = spec_from_file_location("owner_power_clamp_prices", Path(__file__).parents[1] / "alembic/versions/202611180002_owner_power_clamp_prices.py")
assert spec is not None and spec.loader is not None
migration = module_from_spec(spec)
spec.loader.exec_module(migration)

# Independently transcribed from the owner's row; no calculated rounding.
EXPECTED = [(100,705),(110,713),(120,720),(130,727),(140,736),(150,744),(160,779),
            (180,797),(200,882),(210,887),(220,899),(230,904),(250,1001),(280,1025),(300,1122)]


def original(**changes):
    return {"product_slug":migration.PRODUCT_SLUG,"article":"DT-GOLYE-05-14-D250",
            "diameter_mm":250,"outer_diameter_mm":None,"steel_grade":"AISI 430",
            "wall_thickness_mm":Decimal("0.80"),"material":"нержавеющая сталь",
            "is_active":True,"price_rub":Decimal("1000.62"),"attributes":{"media":["keep"],"source_sheet":"голые"},**changes}


def test_all_fifteen_prices_match_the_photograph_exactly():
    assert list(migration.PRICES.items())==[(d,Decimal(p)) for d,p in EXPECTED]
    for diameter,price in EXPECTED:
        assert migration.target_price(original(diameter_mm=diameter))==Decimal(price)


@pytest.mark.parametrize("changes",[
    {"product_slug":"odnostennyi-krepezh-homut-shirokii"},
    {"steel_grade":"AISI 304"},{"steel_grade":"AISI 316"},{"steel_grade":"AISI 321"},
    {"wall_thickness_mm":Decimal("0.5")},{"wall_thickness_mm":None},
    {"material":"оцинковка"},{"material":None},{"is_active":False},
    {"diameter_mm":115},{"diameter_mm":215},{"diameter_mm":350},{"diameter_mm":400},
    {"outer_diameter_mm":350},{"article":"RECOVERY-TEMP-POWER-CLAMP-D250"},
    {"attributes":{"recovery_placeholder":True}},
])
def test_other_executions_and_unspecified_diameters_are_unchanged(changes):
    assert migration.target_price(original(**changes)) is None
    assert migration.corrected_values(original(**changes)) is None


def test_backup_idempotence_and_safe_rollback_preserve_admin_edits():
    row=original()
    changed={**row,**migration.corrected_values(row)}
    assert row==original()
    assert changed["price_rub"]==Decimal("1001")
    assert changed["attributes"]["media"]==["keep"]
    assert migration.SOURCE in changed["attributes"][migration.BACKUP_KEY]["source"]
    assert migration.corrected_values(changed) is None
    assert {**changed,**migration.restored_values(changed)}==row
    edited={**changed,"price_rub":Decimal("1200"),"attributes":{**changed["attributes"],"admin_note":"keep"}}
    assert migration.corrected_values(edited) is None
    restored={**edited,**migration.restored_values(edited)}
    assert restored["price_rub"]==Decimal("1200")
    assert restored["attributes"]["admin_note"]=="keep"
    null_price=original(price_rub=None)
    changed_null={**null_price,**migration.corrected_values(null_price)}
    assert migration.restored_values(changed_null)["price_rub"] is None
    already=original(price_rub=Decimal("1001"))
    assert migration.corrected_values(already)["attributes"][migration.BACKUP_KEY]["before"]=="1001"


def test_real_upgrade_repeat_and_downgrade_are_scoped_and_reversible(monkeypatch,tmp_path):
    engine=sa.create_engine("sqlite://")
    metadata=sa.MetaData()
    products=sa.Table("products",metadata,sa.Column("id",sa.Uuid(),primary_key=True),sa.Column("slug",sa.String()))
    skus=sa.Table("skus",metadata,sa.Column("id",sa.Uuid(),primary_key=True),sa.Column("product_id",sa.Uuid()),
                  sa.Column("article",sa.String()),sa.Column("diameter_mm",sa.Integer()),
                  sa.Column("outer_diameter_mm",sa.Integer()),sa.Column("material",sa.String()),
                  sa.Column("steel_grade",sa.String()),sa.Column("wall_thickness_mm",sa.Numeric()),
                  sa.Column("is_active",sa.Boolean()),sa.Column("price_rub",sa.Numeric()),sa.Column("attributes",sa.JSON()))
    metadata.create_all(engine)
    saved_estimate=tmp_path/"estimate.json"
    saved_estimate.write_text('{"unit_price_rub":1000.62,"revision":1}')
    saved_bytes=saved_estimate.read_bytes()
    with engine.begin() as connection:
        pid,other_pid=uuid.uuid4(),uuid.uuid4()
        connection.execute(sa.insert(products),[{"id":pid,"slug":migration.PRODUCT_SLUG},{"id":other_pid,"slug":"another-family"}])
        def fixture_row(**changes):
            return {k:v for k,v in {**original(),"id":uuid.uuid4(),"product_id":pid,**changes}.items() if k!="product_slug"}
        targets=[fixture_row(diameter_mm=d,article=f"REAL-D{d}") for d,_ in EXPECTED]
        controls=[fixture_row(steel_grade="AISI 304"),fixture_row(wall_thickness_mm=Decimal("0.5")),
                  fixture_row(diameter_mm=115),fixture_row(diameter_mm=350),fixture_row(is_active=False),
                  fixture_row(product_id=other_pid),fixture_row(material="оцинковка"),
                  fixture_row(article="RECOVERY-TEMP-POWER-CLAMP-D250")]
        connection.execute(sa.insert(skus),targets+controls)
        snapshot=lambda:[dict(r) for r in connection.execute(sa.select(skus)).mappings()]
        before=snapshot()
        monkeypatch.setattr(migration.op,"get_bind",lambda:connection)
        migration.upgrade()
        after=snapshot()
        assert len(after)==len(before)
        assert after[15:]==before[15:]
        for index,(diameter,price) in enumerate(EXPECTED):
            assert after[index]["diameter_mm"]==diameter and after[index]["price_rub"]==Decimal(price)
            for field in before[index].keys()-{"price_rub","attributes"}:
                assert after[index][field]==before[index][field]
        migration.upgrade()
        assert snapshot()==after
        migration.downgrade()
        assert snapshot()==before
        assert saved_estimate.read_bytes()==saved_bytes
        connection.execute(sa.delete(skus).where(skus.c.id==targets[-1]["id"]))
        partial=snapshot()
        with pytest.raises(ValueError,match="Missing real AISI 430 / 0.8 power clamps:.*300"):
            migration.upgrade()
        assert snapshot()==partial
        connection.execute(sa.delete(skus))
        migration.upgrade()  # A fresh empty database does not require invented products.
