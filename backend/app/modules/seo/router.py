from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import settings
from app.modules.seo.schemas import (
    YandexMetrikaOverview,
    YandexMetrikaSearchPhrases,
    YandexQueryAnalytics,
    YandexSEOStatus,
    YandexWebmasterOverview,
)
from app.modules.seo.yandex import YandexAPIError, YandexMetrikaClient, YandexWebmasterClient

router = APIRouter()


def _webmaster_client() -> YandexWebmasterClient:
    token = settings.yandex_webmaster_token or settings.yandex_oauth_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Yandex Webmaster API is not configured",
        )
    return YandexWebmasterClient(token)


def _metrika_client() -> YandexMetrikaClient:
    token = settings.yandex_metrika_token or settings.yandex_oauth_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Yandex Metrika API is not configured",
        )
    return YandexMetrikaClient(token)


def _as_http_error(exc: YandexAPIError) -> HTTPException:
    upstream_status = exc.status_code
    public_status = upstream_status if upstream_status in {400, 401, 403, 404, 429} else 502
    return HTTPException(status_code=public_status, detail=f"{exc.service}: {exc.message}")


async def _webmaster_context() -> tuple[YandexWebmasterClient, int, dict]:
    client = _webmaster_client()
    try:
        user_id = await client.get_user_id()
        hosts = await client.get_hosts(user_id)
    except YandexAPIError as exc:
        raise _as_http_error(exc) from exc
    host = client.find_host(hosts, settings.yandex_webmaster_host_url)
    if host is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site {settings.yandex_webmaster_host_url} was not found in Yandex Webmaster",
        )
    return client, user_id, host


@router.get("/status", response_model=YandexSEOStatus)
async def yandex_seo_status() -> YandexSEOStatus:
    return YandexSEOStatus(
        webmaster_configured=bool(settings.yandex_webmaster_token or settings.yandex_oauth_token),
        metrika_configured=bool(settings.yandex_metrika_token or settings.yandex_oauth_token),
        metrika_counter_id=settings.yandex_metrika_counter_id,
        wordstat_configured=bool(settings.yandex_wordstat_token),
        wordstat_access_note="Wordstat API requires separate approval from Yandex Direct support.",
    )


@router.get("/webmaster/overview", response_model=YandexWebmasterOverview)
async def yandex_webmaster_overview() -> YandexWebmasterOverview:
    client, user_id, host = await _webmaster_context()
    try:
        diagnostics = await client.get_diagnostics(user_id, str(host["host_id"]))
    except YandexAPIError as exc:
        raise _as_http_error(exc) from exc
    return YandexWebmasterOverview(
        user_id=user_id,
        site_url=settings.yandex_webmaster_host_url,
        host=host,
        diagnostics=diagnostics,
    )


@router.get("/webmaster/queries", response_model=YandexQueryAnalytics)
async def yandex_webmaster_queries(
    indicator: Literal["QUERY", "URL"] = Query(default="QUERY"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> YandexQueryAnalytics:
    client, user_id, host = await _webmaster_context()
    try:
        data = await client.get_query_analytics(
            user_id,
            str(host["host_id"]),
            text_indicator=indicator,
            limit=limit,
            offset=offset,
        )
    except YandexAPIError as exc:
        raise _as_http_error(exc) from exc
    return YandexQueryAnalytics(site_url=settings.yandex_webmaster_host_url, indicator=indicator, data=data)


@router.get("/metrika/overview", response_model=YandexMetrikaOverview)
async def yandex_metrika_overview() -> YandexMetrikaOverview:
    try:
        counter = await _metrika_client().get_counter(settings.yandex_metrika_counter_id)
    except YandexAPIError as exc:
        raise _as_http_error(exc) from exc
    return YandexMetrikaOverview(counter=counter)


@router.get("/metrika/search-phrases", response_model=YandexMetrikaSearchPhrases)
async def yandex_metrika_search_phrases(
    date1: str = Query(default="14daysAgo", min_length=1, max_length=32),
    date2: str = Query(default="today", min_length=1, max_length=32),
    limit: int = Query(default=100, ge=1, le=10_000),
) -> YandexMetrikaSearchPhrases:
    try:
        data = await _metrika_client().get_search_phrases(
            settings.yandex_metrika_counter_id,
            date1=date1,
            date2=date2,
            limit=limit,
        )
    except YandexAPIError as exc:
        raise _as_http_error(exc) from exc
    return YandexMetrikaSearchPhrases(date1=date1, date2=date2, data=data)
