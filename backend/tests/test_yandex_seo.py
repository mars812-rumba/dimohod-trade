import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.seo.yandex import YandexMetrikaClient, YandexWebmasterClient


@pytest.mark.asyncio
async def test_webmaster_client_reads_hosts_diagnostics_and_queries_without_leaking_token() -> None:
    seen_requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_requests.append(request)
        if request.url.path == "/v4/user":
            return httpx.Response(200, json={"user_id": 42})
        if request.url.path == "/v4/user/42/hosts":
            return httpx.Response(
                200,
                json={
                    "hosts": [
                        {
                            "host_id": "https:dimohod-trade.pro:443",
                            "ascii_host_url": "https://dimohod-trade.pro/",
                            "verified": True,
                        }
                    ]
                },
            )
        if request.url.path.endswith("/diagnostics"):
            return httpx.Response(200, json={"problems": []})
        if request.url.path.endswith("/query-analytics/list"):
            return httpx.Response(200, json={"count": 1, "text_indicator_to_statistics": []})
        return httpx.Response(404)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = YandexWebmasterClient("private-token", client=http_client)
        user_id = await client.get_user_id()
        hosts = await client.get_hosts(user_id)
        host = client.find_host(hosts, "https://dimohod-trade.pro")
        assert host is not None
        diagnostics = await client.get_diagnostics(user_id, host["host_id"])
        queries = await client.get_query_analytics(user_id, host["host_id"], limit=25)

    assert diagnostics == {"problems": []}
    assert queries["count"] == 1
    assert all(request.headers["Authorization"] == "OAuth private-token" for request in seen_requests)
    assert all("private-token" not in str(request.url) for request in seen_requests)
    query_request = next(request for request in seen_requests if request.url.path.endswith("query-analytics/list"))
    assert b'"limit":25' in query_request.content
    assert b'"text_indicator":"QUERY"' in query_request.content


@pytest.mark.asyncio
async def test_metrika_client_uses_official_search_phrases_preset() -> None:
    seen_request: httpx.Request | None = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal seen_request
        seen_request = request
        return httpx.Response(200, json={"data": [], "totals": [0]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        result = await YandexMetrikaClient("metrika-token", client=http_client).get_search_phrases(
            112091795,
            date1="30daysAgo",
            limit=50,
        )

    assert result == {"data": [], "totals": [0]}
    assert seen_request is not None
    assert seen_request.headers["Authorization"] == "OAuth metrika-token"
    assert seen_request.url.params["ids"] == "112091795"
    assert seen_request.url.params["preset"] == "sources_search_phrases"
    assert seen_request.url.params["date1"] == "30daysAgo"


def test_yandex_status_is_admin_only_and_never_returns_tokens(monkeypatch) -> None:
    monkeypatch.setattr("app.modules.boms.dependencies.settings.bom_admin_token", "admin-secret")
    monkeypatch.setattr("app.modules.seo.router.settings.yandex_webmaster_token", "webmaster-secret")
    monkeypatch.setattr("app.modules.seo.router.settings.yandex_metrika_token", "metrika-secret")
    monkeypatch.setattr("app.modules.seo.router.settings.yandex_wordstat_token", None)
    client = TestClient(app)

    assert client.get("/api/v1/admin/seo/yandex/status").status_code == 401
    response = client.get(
        "/api/v1/admin/seo/yandex/status",
        headers={"X-BOM-Admin-Token": "admin-secret"},
    )

    assert response.status_code == 200
    assert response.json()["webmaster_configured"] is True
    assert response.json()["metrika_configured"] is True
    assert "secret" not in response.text
