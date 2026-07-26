from __future__ import annotations

from urllib.parse import urlparse


LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1"}


def assert_safe_test_database_url(database_url: str) -> None:
    """Refuse to let pytest connect to a shared or remotely hosted database."""
    parsed = urlparse(database_url)
    host = (parsed.hostname or "").lower()
    database_name = parsed.path.lstrip("/").lower()

    if parsed.scheme not in {"postgresql", "postgresql+psycopg"}:
        raise RuntimeError("Backend tests require a disposable PostgreSQL database")
    if host not in LOOPBACK_HOSTS:
        raise RuntimeError("Backend tests may only connect to a loopback PostgreSQL host")
    if "test" not in database_name:
        raise RuntimeError("Backend test database name must contain 'test'")
