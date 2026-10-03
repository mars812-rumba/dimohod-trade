from __future__ import annotations

from typing import Any, Literal
from urllib.parse import quote, urlsplit, urlunsplit

import httpx

WEBMASTER_API_URL = "https://api.webmaster.yandex.net/v4"
METRIKA_API_URL = "https://api-metrika.yandex.net"
SEARCH_API_URL = "https://searchapi.api.cloud.yandex.net"


class YandexAPIError(RuntimeError):
    def __init__(self, service: str, status_code: int, message: str) -> None:
        super().__init__(message)
        self.service = service
        self.status_code = status_code
        self.message = message


def _normalized_site_url(value: str) -> str:
    parsed = urlsplit(value.strip())
    scheme = parsed.scheme.lower()
    hostname = (parsed.hostname or "").lower()
    port = parsed.port
    if not scheme or not hostname:
        return value.rstrip("/").lower()
    default_port = (scheme == "https" and port == 443) or (scheme == "http" and port == 80)
    netloc = hostname if port is None or default_port else f"{hostname}:{port}"
    return urlunsplit((scheme, netloc, "", "", "")).rstrip("/")


class _YandexClient:
    service = "Yandex"
    auth_scheme = "OAuth"

    def __init__(self, token: str, client: httpx.AsyncClient | None = None) -> None:
        if not token.strip():
            raise ValueError(f"{self.service} OAuth token is not configured")
        self._token = token
        self._client = client

    async def _request(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        headers = {"Authorization": f"{self.auth_scheme} {self._token}", "Accept": "application/json"}
        if json is not None:
            headers["Content-Type"] = "application/json; charset=UTF-8"

        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(timeout=httpx.Timeout(20.0))
        try:
            response = await client.request(method, url, headers=headers, params=params, json=json)
        except httpx.HTTPError as exc:
            raise YandexAPIError(self.service, 502, "Yandex API is temporarily unavailable") from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.is_error:
            try:
                payload = response.json()
            except ValueError:
                payload = {}
            code = payload.get("error_code") or payload.get("code")
            message = payload.get("error_message") or payload.get("message")
            safe_message = str(message or f"HTTP {response.status_code}")[:300]
            if code:
                safe_message = f"{code}: {safe_message}"
            raise YandexAPIError(self.service, response.status_code, safe_message)

        payload = response.json()
        if not isinstance(payload, dict):
            raise YandexAPIError(self.service, 502, "Yandex API returned an unexpected response")
        return payload


class YandexWebmasterClient(_YandexClient):
    service = "Yandex Webmaster"

    async def get_user_id(self) -> int:
        payload = await self._request("GET", f"{WEBMASTER_API_URL}/user")
        return int(payload["user_id"])

    async def get_hosts(self, user_id: int) -> list[dict[str, Any]]:
        payload = await self._request("GET", f"{WEBMASTER_API_URL}/user/{user_id}/hosts")
        hosts = payload.get("hosts", [])
        return hosts if isinstance(hosts, list) else []

    @staticmethod
    def find_host(hosts: list[dict[str, Any]], site_url: str) -> dict[str, Any] | None:
        expected = _normalized_site_url(site_url)
        for host in hosts:
            candidates = (host.get("ascii_host_url"), host.get("unicode_host_url"))
            if any(isinstance(item, str) and _normalized_site_url(item) == expected for item in candidates):
                return host
        return None

    async def get_diagnostics(self, user_id: int, host_id: str) -> dict[str, Any]:
        encoded_host_id = quote(host_id, safe="")
        return await self._request(
            "GET",
            f"{WEBMASTER_API_URL}/user/{user_id}/hosts/{encoded_host_id}/diagnostics",
        )

    async def get_query_analytics(
        self,
        user_id: int,
        host_id: str,
        *,
        text_indicator: Literal["QUERY", "URL"] = "QUERY",
        limit: int = 100,
        offset: int = 0,
    ) -> dict[str, Any]:
        encoded_host_id = quote(host_id, safe="")
        return await self._request(
            "POST",
            f"{WEBMASTER_API_URL}/user/{user_id}/hosts/{encoded_host_id}/query-analytics/list",
            json={
                "offset": offset,
                "limit": limit,
                "device_type_indicator": "ALL",
                "search_location": "WEB_LOCATION",
                "text_indicator": text_indicator,
            },
        )


class YandexMetrikaClient(_YandexClient):
    service = "Yandex Metrika"

    async def get_counter(self, counter_id: int) -> dict[str, Any]:
        return await self._request(
            "GET",
            f"{METRIKA_API_URL}/management/v1/counter/{counter_id}",
        )

    async def get_search_phrases(
        self,
        counter_id: int,
        *,
        date1: str = "14daysAgo",
        date2: str = "today",
        limit: int = 100,
    ) -> dict[str, Any]:
        return await self._request(
            "GET",
            f"{METRIKA_API_URL}/stat/v1/data",
            params={
                "ids": counter_id,
                "preset": "sources_search_phrases",
                "date1": date1,
                "date2": date2,
                "accuracy": "full",
                "limit": limit,
            },
        )


class YandexWordstatClient(_YandexClient):
    service = "Yandex Wordstat"
    auth_scheme = "Api-Key"

    def __init__(
        self,
        api_key: str,
        folder_id: str,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        super().__init__(api_key, client=client)
        if not folder_id.strip():
            raise ValueError("Yandex Search API folder ID is not configured")
        self._folder_id = folder_id.strip()

    async def get_top(
        self,
        phrase: str,
        *,
        num_phrases: int = 100,
        regions: list[str] | None = None,
        devices: list[str] | None = None,
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            f"{SEARCH_API_URL}/v2/wordstat/topRequests",
            json={
                "phrase": phrase,
                "numPhrases": num_phrases,
                "regions": regions or [],
                "devices": devices or ["DEVICE_ALL"],
                "folderId": self._folder_id,
            },
        )

    async def get_dynamics(
        self,
        phrase: str,
        *,
        period: str,
        from_date: str,
        to_date: str | None = None,
        regions: list[str] | None = None,
        devices: list[str] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "phrase": phrase,
            "period": period,
            "fromDate": from_date,
            "regions": regions or [],
            "devices": devices or ["DEVICE_ALL"],
            "folderId": self._folder_id,
        }
        if to_date:
            payload["toDate"] = to_date
        return await self._request(
            "POST",
            f"{SEARCH_API_URL}/v2/wordstat/dynamics",
            json=payload,
        )

    async def get_regions_distribution(
        self,
        phrase: str,
        *,
        region: str = "REGION_ALL",
        devices: list[str] | None = None,
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            f"{SEARCH_API_URL}/v2/wordstat/regions",
            json={
                "phrase": phrase,
                "region": region,
                "devices": devices or ["DEVICE_ALL"],
                "folderId": self._folder_id,
            },
        )

    async def get_regions_tree(self) -> dict[str, Any]:
        return await self._request(
            "POST",
            f"{SEARCH_API_URL}/v2/wordstat/getRegionsTree",
            json={"folderId": self._folder_id},
        )
