import secrets

from fastapi import Cookie, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.core.config import settings
from app.modules.admin.auth import ADMIN_SESSION_COOKIE, valid_admin_session

bom_admin_header = APIKeyHeader(name="X-BOM-Admin-Token", auto_error=False)


async def require_bom_admin(
    token: str | None = Security(bom_admin_header),
    admin_session: str | None = Cookie(default=None, alias=ADMIN_SESSION_COOKIE),
) -> None:
    configured = settings.bom_admin_token
    if not configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="BOM admin access is not configured",
        )
    if valid_admin_session(admin_session):
        return
    if token is None or not secrets.compare_digest(token, configured):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid BOM admin token",
        )
