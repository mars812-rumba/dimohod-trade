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
    yandex_oauth_token: str | None = None
    yandex_webmaster_token: str | None = None
    yandex_webmaster_host_url: str = "https://dimohod-trade.pro"
    yandex_metrika_token: str | None = None
    yandex_metrika_counter_id: int = 112091795
    yandex_wordstat_token: str | None = None
    lead_recipient_email: str = "office@dimohod-trade.pro"
    lead_from_email: str = "office@dimohod-trade.pro"
    lead_manager_base_url: str = "https://dimohod-trade.pro/admin/estimates"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    bom_admin_token: str | None = None
    admin_session_cookie_secure: bool = True

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
