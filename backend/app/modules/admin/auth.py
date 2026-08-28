import base64
import hmac
import time
from hashlib import sha256

from app.core.config import settings

ADMIN_SESSION_COOKIE = "dimohod_admin_session"
ADMIN_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60


def configured_admin_secret() -> str | None:
    return settings.bom_admin_token


def create_admin_session(now: int | None = None) -> str:
    secret = configured_admin_secret()
    if not secret:
        raise RuntimeError("Admin access is not configured")
    expires_at = (now or int(time.time())) + ADMIN_SESSION_TTL_SECONDS
    payload = str(expires_at)
    signature = hmac.new(secret.encode(), f"admin:{payload}".encode(), sha256).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{payload}.{encoded_signature}"


def valid_admin_session(value: object, now: int | None = None) -> bool:
    secret = configured_admin_secret()
    if not secret or not isinstance(value, str) or not value:
        return False
    try:
        expires_text, supplied_signature = value.split(".", 1)
        expires_at = int(expires_text)
    except (TypeError, ValueError):
        return False
    if expires_at <= (now or int(time.time())):
        return False
    expected = hmac.new(secret.encode(), f"admin:{expires_text}".encode(), sha256).digest()
    encoded_expected = base64.urlsafe_b64encode(expected).decode().rstrip("=")
    return hmac.compare_digest(encoded_expected, supplied_signature)
