import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


def _clean_base_path(value: str) -> str:
    value = (value or "").strip()
    if not value or value == "/":
        return ""
    if not value.startswith("/"):
        value = f"/{value}"
    return value.rstrip("/")


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME") or "Zen E-Commerce"
    base_path: str = _clean_base_path(os.getenv("BASE_PATH", ""))
    database_url: str = os.getenv("DATABASE_URL", "")
    db_host: str = os.getenv("DB_HOST", "db")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_name: str = os.getenv("DB_NAME", "ecommerce_db")
    db_user: str = os.getenv("DB_USER", "ecom_user")
    db_password: str = os.getenv("DB_PASSWORD", "")
    session_secret: str = os.getenv("SESSION_SECRET", os.getenv("SECRET_KEY", "change-me"))
    admin_email: str = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "change-me")
    payment_provider: str = os.getenv("PAYMENT_PROVIDER", "mock")

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()
