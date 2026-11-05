"""Generate an editable SEO draft with Anthropic; never persist catalog data."""
import json
from typing import Any

import httpx
from fastapi import HTTPException

from app.core.config import settings

ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages"


def upstream_error(response: httpx.Response) -> HTTPException:
    # Never forward raw provider errors: they may contain credentials or input.
    try:
        error = response.json().get("error", {})
        message = str(error.get("message", "")).lower()
    except (ValueError, AttributeError):
        message = ""
    if "credit balance" in message:
        return HTTPException(503, "На счёте Anthropic недостаточно API-кредитов. Пополните баланс Anthropic.")
    if response.status_code in {401, 403}:
        return HTTPException(503, "Anthropic отклонил авторизацию. Проверьте ANTHROPIC_API_KEY на сервере.")
    if response.status_code == 404:
        return HTTPException(503, "Модель Anthropic недоступна. Проверьте ANTHROPIC_SEO_MODEL на сервере.")
    if response.status_code == 429:
        return HTTPException(429, "Достигнут лимит запросов Anthropic. Повторите генерацию позже.")
    if response.status_code in {503, 529}:
        return HTTPException(503, "Anthropic временно перегружен. Повторите генерацию позже.")
    return HTTPException(502, f"Anthropic не сгенерировал SEO (HTTP {response.status_code}).")


async def generate_seo_json(system_prompt: str, prompt: str, schema: dict[str, Any]) -> dict[str, Any]:
    if not settings.anthropic_api_key:
        raise HTTPException(503, "ANTHROPIC_API_KEY не настроен для backend.")
    payload = {
        "model": settings.anthropic_seo_model,
        "max_tokens": 3600,
        "system": system_prompt,
        "messages": [{"role": "user", "content": prompt}],
        "output_config": {"format": {"type": "json_schema", "schema": schema}},
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                ANTHROPIC_MESSAGES_URL,
                headers={"x-api-key": settings.anthropic_api_key, "anthropic-version": "2023-06-01"},
                json=payload,
            )
    except httpx.TimeoutException as exc:
        raise HTTPException(504, "Anthropic не успел сформировать черновик. Повторите генерацию.") from exc
    except httpx.RequestError as exc:
        raise HTTPException(502, "Не удалось подключиться к Anthropic.") from exc
    if response.is_error:
        raise upstream_error(response)
    try:
        body = response.json()
        if body.get("stop_reason") != "end_turn":
            raise ValueError("Incomplete or refused generation")
        text = "".join(block["text"] for block in body.get("content", []) if block.get("type") == "text")
        result = json.loads(text)
        if not isinstance(result, dict):
            raise ValueError("Expected a JSON object")
        # Enforce the contract locally as well as at the provider boundary.
        if set(result) != set(schema["required"]) or any(not isinstance(value, str) for value in result.values()):
            raise ValueError("Unexpected SEO fields")
        return result
    except (ValueError, TypeError, KeyError, AttributeError) as exc:
        raise HTTPException(502, "Anthropic вернул неполный или некорректный SEO-черновик. Повторите генерацию.") from exc
