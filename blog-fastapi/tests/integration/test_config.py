from sqlalchemy.engine import make_url

from tests.integration.config import build_test_database_url


def test_test_database_url_can_be_overridden_as_one_connection_string(monkeypatch):
    monkeypatch.setenv(
        "TEST_DATABASE_URL",
        "postgresql+asyncpg://test_user:p%40ss%2Fword@db:15432/springboot_vue_test",
    )

    url = make_url(build_test_database_url())

    assert url.host == "db"
    assert url.port == 15432
    assert url.username == "test_user"
    assert url.password == "p@ss/word"
    assert url.database == "springboot_vue_test"


def test_test_database_credentials_can_be_injected_without_changing_default_address(monkeypatch):
    monkeypatch.delenv("TEST_DATABASE_URL", raising=False)
    monkeypatch.setenv("TEST_DB_USERNAME", "test_user")
    monkeypatch.setenv("TEST_DB_PASSWORD", "p@ss/word")

    url = make_url(build_test_database_url())

    assert url.host == "localhost"
    assert url.port == 5432
    assert url.database == "springboot_vue_test"
    assert url.username == "test_user"
    assert url.password == "p@ss/word"
