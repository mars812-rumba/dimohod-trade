import json

import httpx
import pytest
from fastapi import HTTPException

from app.modules.admin import seo_generator
from app.modules.admin.service import SEO_JSON_SCHEMA

DRAFT = {key: "Проверяемый черновик" for key in SEO_JSON_SCHEMA["required"]}


@pytest.fixture
def client_factory(monkeypatch):
    original = httpx.AsyncClient
    monkeypatch.setattr(seo_generator.settings, "anthropic_api_key", "test-key-not-real")
    monkeypatch.setattr(seo_generator.settings, "openai_api_key", None)
    def install(handler):
        monkeypatch.setattr(seo_generator.httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    return install


@pytest.mark.asyncio
async def test_anthropic_request_uses_schema_and_works_without_openai(client_factory):
    def handler(request):
        assert str(request.url) == "https://api.anthropic.com/v1/messages"
        assert request.headers["x-api-key"] == "test-key-not-real"
        assert request.headers["anthropic-version"] == "2023-06-01"
        assert "authorization" not in request.headers
        payload = json.loads(request.content)
        assert payload["system"] == "confirmed facts only"
        assert payload["messages"] == [{"role": "user", "content": "facts"}]
        assert payload["output_config"]["format"]["schema"] == SEO_JSON_SCHEMA
        assert "store" not in payload
        return httpx.Response(200, json={"stop_reason": "end_turn", "content": [{"type": "text", "text": json.dumps(DRAFT)}]})
    client_factory(handler)
    assert await seo_generator.generate_seo_json("confirmed facts only", "facts", SEO_JSON_SCHEMA) == DRAFT


@pytest.mark.asyncio
@pytest.mark.parametrize("upstream,message,expected,fragment", [
    (400, "Your credit balance is too low", 503, "API-кредитов"),
    (401, "private upstream detail", 503, "ANTHROPIC_API_KEY"),
    (403, "private upstream detail", 503, "ANTHROPIC_API_KEY"),
    (404, "private upstream detail", 503, "ANTHROPIC_SEO_MODEL"),
    (429, "private upstream detail", 429, "лимит"),
    (529, "private upstream detail", 503, "перегружен"),
    (500, "private upstream detail", 502, "HTTP 500"),
])
async def test_provider_errors_are_useful_without_leaking_details(client_factory, upstream, message, expected, fragment):
    client_factory(lambda request: httpx.Response(upstream, json={"error": {"message": message}}))
    with pytest.raises(HTTPException) as result:
        await seo_generator.generate_seo_json("system", "facts", SEO_JSON_SCHEMA)
    assert result.value.status_code == expected
    assert fragment in result.value.detail
    assert "private upstream detail" not in result.value.detail


@pytest.mark.asyncio
@pytest.mark.parametrize("body", [
    {"stop_reason": "max_tokens", "content": [{"type": "text", "text": json.dumps(DRAFT)}]},
    {"stop_reason": "refusal", "content": []},
    {"stop_reason": "end_turn", "content": [{"type": "text", "text": "not json"}]},
    {"stop_reason": "end_turn", "content": [{"type": "text", "text": "{}"}]},
    {"stop_reason": "end_turn", "content": [{"type": "text", "text": json.dumps({**DRAFT, "seo_title": 42})}]},
])
async def test_invalid_or_incomplete_drafts_are_rejected(client_factory, body):
    client_factory(lambda request: httpx.Response(200, json=body))
    with pytest.raises(HTTPException) as result:
        await seo_generator.generate_seo_json("system", "facts", SEO_JSON_SCHEMA)
    assert result.value.status_code == 502


@pytest.mark.asyncio
async def test_missing_anthropic_key_does_not_call_api(monkeypatch):
    monkeypatch.setattr(seo_generator.settings, "anthropic_api_key", None)
    with pytest.raises(HTTPException) as result:
        await seo_generator.generate_seo_json("system", "facts", SEO_JSON_SCHEMA)
    assert result.value.status_code == 503


@pytest.mark.asyncio
async def test_timeout_is_distinguished_from_invalid_draft(client_factory):
    def timeout(request):
        raise httpx.ReadTimeout("private detail", request=request)
    client_factory(timeout)
    with pytest.raises(HTTPException) as result:
        await seo_generator.generate_seo_json("system", "facts", SEO_JSON_SCHEMA)
    assert result.value.status_code == 504
