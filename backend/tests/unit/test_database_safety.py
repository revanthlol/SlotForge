import pytest

from tests.database_safety import assert_safe_test_database_url


@pytest.mark.parametrize(
    "database_url",
    [
        "postgresql+psycopg://postgres:secret@db.project.supabase.co:5432/postgres",
        "postgresql+psycopg://postgres:secret@10.0.0.12:5432/slotforge_test",
        "postgresql+psycopg://postgres:secret@127.0.0.1:5432/slotforge",
        "sqlite:///:memory:",
    ],
)
def test_rejects_database_urls_that_are_not_disposable_and_local(database_url: str):
    with pytest.raises(RuntimeError):
        assert_safe_test_database_url(database_url)


def test_accepts_a_loopback_postgresql_test_database():
    assert_safe_test_database_url(
        "postgresql+psycopg://slotforge_test:secret@127.0.0.1:5432/slotforge_test"
    )
