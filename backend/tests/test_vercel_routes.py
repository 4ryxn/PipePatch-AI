"""Regression coverage for the public ASGI paths served by the Vercel entrypoint."""

from fastapi.testclient import TestClient

from api.index import app

client = TestClient(app)


def test_vercel_entrypoint_preserves_health_and_readiness_paths() -> None:
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/readiness").json() == {"status": "ok"}


def test_vercel_entrypoint_preserves_api_v1_path() -> None:
    """A missing multipart image produces validation, proving the API route was matched."""
    assert client.post("/api/v1/analyze").status_code == 422
