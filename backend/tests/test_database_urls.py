from app.database import normalize_database_url


def test_standard_neon_postgresql_url_uses_psycopg3_dialect() -> None:
    raw = "postgresql://user:password@ep-example-pooler.neon.tech/neondb?sslmode=require"
    assert normalize_database_url(raw) == "postgresql+psycopg://user:password@ep-example-pooler.neon.tech/neondb?sslmode=require"


def test_sqlite_and_explicit_sqlalchemy_urls_are_preserved() -> None:
    assert normalize_database_url("sqlite:///./pipepatch.db") == "sqlite:///./pipepatch.db"
    assert normalize_database_url("postgresql+psycopg://user@host/db") == "postgresql+psycopg://user@host/db"
