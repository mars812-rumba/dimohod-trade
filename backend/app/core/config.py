from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Dimohod Trade API"
    app_version: str = "0.1.0"
    database_url: str = "postgresql+asyncpg://chimney:chimney@localhost:5432/chimney"
    redis_url: str = "redis://localhost:6379/0"
    backend_cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    media_storage_dir: str = "../storage"
    openai_api_key: str | None = None
    openai_seo_model: str = "gpt-5.6-luna"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
