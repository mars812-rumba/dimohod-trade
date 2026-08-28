import secrets

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.modules.admin.auth import (
    ADMIN_SESSION_COOKIE,
    ADMIN_SESSION_TTL_SECONDS,
    create_admin_session,
    valid_admin_session,
)

router = APIRouter()


class AdminLogin(BaseModel):
    password: str = Field(min_length=1, max_length=256)


def no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


@router.post("/login")
async def login_admin(payload: AdminLogin, response: Response) -> dict[str, bool]:
    configured = settings.bom_admin_token
    if not configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin access is not configured",
        )
    if not secrets.compare_digest(payload.password, configured):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный пароль",
        )
    response.set_cookie(
        key=ADMIN_SESSION_COOKIE,
        value=create_admin_session(),
        max_age=ADMIN_SESSION_TTL_SECONDS,
        httponly=True,
        secure=settings.admin_session_cookie_secure,
        samesite="lax",
        path="/",
    )
    no_store(response)
    return {"authenticated": True}


@router.get("/session")
async def read_admin_session(request: Request, response: Response) -> dict[str, bool]:
    no_store(response)
    return {
        "authenticated": valid_admin_session(request.cookies.get(ADMIN_SESSION_COOKIE))
    }


@router.post("/logout")
async def logout_admin(response: Response) -> dict[str, bool]:
    response.delete_cookie(
        ADMIN_SESSION_COOKIE,
        path="/",
        secure=settings.admin_session_cookie_secure,
        httponly=True,
        samesite="lax",
    )
    no_store(response)
    return {"authenticated": False}
