"""Isolated SQLite coverage for optional accounts and text-only repair history."""

from pathlib import Path

from fastapi.testclient import TestClient

import app.main as main
from app.config import AuthSettings


def configure(monkeypatch, tmp_path: Path) -> TestClient:
    settings = AuthSettings(True, f"sqlite:///{tmp_path / 'auth.db'}", "x" * 48, "HS256", 30)
    monkeypatch.setattr(main, "get_auth_settings", lambda: settings)
    main._session_factory = None
    return TestClient(main.app)


def credentials(email: str = "person@example.com") -> dict[str, str]:
    return {"email": email, "password": "correct-horse-battery"}


def token(client: TestClient, email: str = "person@example.com") -> dict[str, str]:
    response = client.post("/api/v1/auth/register", json=credentials(email))
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def summary() -> dict[str, object]:
    return {
        "outcome": "supported",
        "confirmed_nominal_size": "1/2",
        "repair_method_id": "two_slip_coupling_section_replacement",
        "measured_gap_range_status": "within_mvp_range",
        "generic_parts_item_names": ["PVC pipe"],
        "safety_and_limitation_text": ["Verify labels"],
    }


def test_register_duplicate_login_me_and_generic_invalid_login(monkeypatch, tmp_path: Path) -> None:
    client = configure(monkeypatch, tmp_path)
    header = token(client)
    assert client.get("/api/v1/auth/me", headers=header).json()["email"] == "person@example.com"
    assert client.post("/api/v1/auth/register", json=credentials()).status_code == 409
    invalid = client.post("/api/v1/auth/login", json=credentials("missing@example.com"))
    assert invalid.status_code == 401 and "credentials" in invalid.json()["detail"]
    assert client.post("/api/v1/auth/login", json=credentials()).status_code == 200


def test_disabled_invalid_token_and_throttle(monkeypatch, tmp_path: Path) -> None:
    client = configure(monkeypatch, tmp_path)
    assert (
        client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid"}).status_code
        == 401
    )
    for _ in range(5):
        client.post("/api/v1/auth/login", json=credentials("none@example.com"))
    assert (
        client.post("/api/v1/auth/login", json=credentials("none@example.com")).status_code == 429
    )
    monkeypatch.setattr(
        main, "get_auth_settings", lambda: AuthSettings(False, "sqlite:///x", None, "HS256", 30)
    )
    assert client.get("/api/v1/auth/me").status_code == 503


def test_history_owner_isolation_delete_and_account_cascade(monkeypatch, tmp_path: Path) -> None:
    client = configure(monkeypatch, tmp_path)
    first = token(client)
    second = token(client, "other@example.com")
    created = client.post(
        "/api/v1/history", headers=first, json={"title": "Front line", "summary": summary()}
    ).json()
    assert client.get("/api/v1/history", headers=first).json()[0]["id"] == created["id"]
    assert client.get(f"/api/v1/history/{created['id']}", headers=second).status_code == 404
    assert client.delete(f"/api/v1/history/{created['id']}", headers=first).status_code == 204
    created = client.post(
        "/api/v1/history", headers=first, json={"title": "Front line", "summary": summary()}
    ).json()
    assert client.delete("/api/v1/auth/me", headers=first).status_code == 204
    assert client.get(f"/api/v1/history/{created['id']}", headers=first).status_code == 401


def test_history_whitelist_and_validation(monkeypatch, tmp_path: Path) -> None:
    client = configure(monkeypatch, tmp_path)
    header = token(client)
    payload = {"title": "", "summary": {**summary(), "photo_uri": "file:///never"}}
    assert client.post("/api/v1/history", headers=header, json=payload).status_code == 422
