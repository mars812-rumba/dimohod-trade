from decimal import Decimal
from types import SimpleNamespace

from app.modules.products.router import sku_matches_filters


def _matches(sku, *, base_size: str | None, execution: str | None = None) -> bool:
    return sku_matches_filters(
        sku,
        diameter_mm=None,
        outer_diameter_mm=None,
        steel_grade="AISI 430",
        material="stainless",
        outer_steel_grade=None,
        outer_material=None,
        length_mm=None,
        wall_thickness_mm=None,
        outer_wall_thickness_mm=None,
        angle_deg=None,
        insulation_mm=None,
        contour=None,
        base_size=base_size,
        execution=execution,
    )


def test_base_size_selects_the_exact_flange_sku() -> None:
    sku = SimpleNamespace(
        is_active=True,
        diameter_mm=None,
        outer_diameter_mm=None,
        steel_grade="AISI 430",
        material="нержавеющая сталь",
        length_mm=None,
        wall_thickness_mm=Decimal("0.50"),
        angle_deg=None,
        insulation_mm=None,
        contour=None,
        attributes={"base_size": "600×600 мм"},
    )

    assert _matches(sku, base_size="600×600 мм") is True
    assert _matches(sku, base_size="500×500 мм") is False


def test_roof_flange_requires_both_exact_size_and_execution() -> None:
    sku = SimpleNamespace(
        is_active=True, diameter_mm=None, outer_diameter_mm=None,
        steel_grade="AISI 430", material="нержавеющая сталь", length_mm=None,
        wall_thickness_mm=Decimal("0.50"), angle_deg=None, insulation_mm=None, contour=None,
        attributes={"base_size": "600×750 мм", "execution": "Под углом"},
    )
    assert _matches(sku, base_size="600×750 мм", execution="Под углом")
    assert not _matches(sku, base_size="600×600 мм", execution="Под углом")
    assert not _matches(sku, base_size="600×750 мм", execution="Прямой")
    sku.attributes["execution"] = "Прямой"
    assert not _matches(sku, base_size="600×750 мм", execution="Под углом")
    assert _matches(sku, base_size="600×750 мм")  # Existing callers remain unchanged.


async def test_list_products_passes_execution_to_the_sku_sql_filter() -> None:
    from sqlalchemy.dialects import postgresql
    from app.modules.products.service import list_products

    statements = []

    class Session:
        async def execute(self, statement):
            statements.append(statement)
            return SimpleNamespace(scalars=lambda: [])

    assert await list_products(Session(), base_size="600×750 мм", execution="Под углом") == ([], 0)
    values = list(statements[0].compile(dialect=postgresql.dialect()).params.values())
    assert "execution" in values
    assert "Под углом" in values
    assert "600×750 мм" in values


def test_execution_query_is_forwarded_and_separates_cache_entries(monkeypatch) -> None:
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.db.session import get_db
    from app.modules.products.router import router

    captured, cache_keys = [], []

    async def no_cache(key):
        cache_keys.append(key)
        return None

    async def save_cache(*args):
        pass

    async def products(session, **filters):
        captured.append(filters)
        return [], 0

    async def session():
        yield object()

    monkeypatch.setattr("app.modules.products.router.get_catalog_cache", no_cache)
    monkeypatch.setattr("app.modules.products.router.set_catalog_cache", save_cache)
    monkeypatch.setattr("app.modules.products.router.list_products", products)
    app = FastAPI()
    app.include_router(router, prefix="/products")
    app.dependency_overrides[get_db] = session
    with TestClient(app) as client:
        for execution in ("Под углом", "Прямой"):
            response = client.get("/products", params={"execution": execution, "base_size": "600×750 мм"})
            assert response.status_code == 200
            assert captured[-1]["execution"] == execution
            assert captured[-1]["base_size"] == "600×750 мм"
    assert cache_keys[0] != cache_keys[1]

