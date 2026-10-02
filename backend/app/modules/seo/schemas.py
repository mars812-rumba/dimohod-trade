from typing import Any, Literal

from pydantic import BaseModel, Field


class YandexSEOStatus(BaseModel):
    webmaster_configured: bool
    metrika_configured: bool
    metrika_counter_id: int
    wordstat_configured: bool
    wordstat_access_note: str


class YandexWebmasterOverview(BaseModel):
    user_id: int
    site_url: str
    host: dict[str, Any]
    diagnostics: dict[str, Any]


class YandexQueryAnalytics(BaseModel):
    site_url: str
    indicator: Literal["QUERY", "URL"]
    data: dict[str, Any]


class YandexMetrikaOverview(BaseModel):
    counter: dict[str, Any]


class YandexMetrikaSearchPhrases(BaseModel):
    date1: str = Field(max_length=32)
    date2: str = Field(max_length=32)
    data: dict[str, Any]
