from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import Response

from app.api.v1.router import api_router
from app.core.config import settings


class PublicMediaFiles(StaticFiles):
    """Serve catalog media without exposing private lead attachments."""

    async def get_response(self, path: str, scope: dict) -> Response:
        if path == "leads" or path.startswith("leads/"):
            return Response(status_code=404)
        return await super().get_response(path, scope)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api/v1")

    media_dir = Path(settings.media_storage_dir)
    media_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/media", PublicMediaFiles(directory=media_dir), name="media")
    return app


app = create_app()
