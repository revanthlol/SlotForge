from __future__ import annotations

import atexit
import os

import httpx
import jwt
import pytest
from fastapi import Header, HTTPException
from sqlalchemy import text
from testcontainers.community.postgres import PostgresContainer

from tests.database_safety import assert_safe_test_database_url


def _start_disposable_database() -> tuple[PostgresContainer, str]:
    container = PostgresContainer(
        image="postgres:17-alpine",
        username="slotforge_test",
        password="slotforge_test",
        dbname="slotforge_test",
        driver="psycopg",
    )
    try:
        container.start()
    except Exception as exc:
        raise RuntimeError(
            "Backend tests require Docker and will not fall back to the configured application database"
        ) from exc

    database_url = container.get_connection_url()
    assert_safe_test_database_url(database_url)
    return container, database_url


# This must happen before importing any SlotForge application module. Settings
# and SQLAlchemy therefore never see backend/.env while pytest is running.
_postgres_container, _test_database_url = _start_disposable_database()
atexit.register(_postgres_container.stop)

os.environ.update(
    {
        "APP_ENV": "test",
        "DATABASE_URL": _test_database_url,
        "DATABASE_URL_POOLED": _test_database_url,
        "DEMO_SEED_ON_ALEMBIC_UPGRADE": "false",
        "SUPABASE_URL": "https://YOUR_PROJECT_REF.supabase.co",
        "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_your_publishable_key_here",
        "SUPABASE_SECRET_KEY": "sb_secret_your_secret_key_here",
        "SUPABASE_JWKS_URL": "https://YOUR_PROJECT_REF.supabase.co/jwt/v1/jwks",
    }
)

from app.core.auth import get_current_user  # noqa: E402
from app.core.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


with engine.begin() as connection:
    connection.execute(text("CREATE SCHEMA IF NOT EXISTS auth"))
    connection.execute(text("""
        CREATE TABLE IF NOT EXISTS auth.users (
            id UUID PRIMARY KEY,
            email TEXT UNIQUE
        )
    """))
    Base.metadata.create_all(bind=connection)


def mock_get_current_user(authorization: str = Header(...)) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token type, must be Bearer")

    token = authorization.replace("Bearer ", "")
    try:
        return jwt.decode(token, options={"verify_signature": False})
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Mock token decode failed: {exc}") from exc


@pytest.fixture(autouse=True, scope="session")
def verify_isolated_test_database():
    assert_safe_test_database_url(str(engine.url))
    assert os.environ["APP_ENV"] == "test"
    yield


@pytest.fixture(autouse=True, scope="session")
def setup_dependency_overrides():
    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True, scope="session")
def mock_external_requests():
    """Intercept Supabase Auth signup calls during pytest."""
    original_post = httpx.Client.post

    def mock_post(self, url, *args, **kwargs):
        if "/auth/v1/signup" in str(url):
            json_data = kwargs.get("json", {})
            email = json_data.get("email", "mocked@slotforge.com")
            return httpx.Response(
                status_code=200,
                json={
                    "id": "11111111-2222-3333-4444-555555555555",
                    "email": email,
                    "user_metadata": {
                        "full_name": json_data.get("options", {}).get("data", {}).get("full_name", "")
                    },
                },
                request=httpx.Request("POST", url),
            )
        return original_post(self, url, *args, **kwargs)

    with pytest.MonkeyPatch.context() as monkeypatch:
        monkeypatch.setattr(httpx.Client, "post", mock_post)
        yield
