from fastapi.testclient import TestClient

from app.analysis import MAX_UPLOAD_BYTES
from app.main import app

client = TestClient(app)


def upload(content: bytes, content_type: str = "image/jpeg") -> object:
    return client.post("/api/v1/analyze", files={"image": ("ignored-image", content, content_type)})


def test_analyze_returns_a_clearly_marked_mock_response() -> None:
    response = upload(b"\xff\xd8\xffmock-image")

    assert response.status_code == 200
    body = response.json()
    assert body["is_mock"] is True
    assert body["supported_case"] is False
    assert body["nominal_size"] is None
    assert "Demo" in body["summary"]


def test_analyze_rejects_a_missing_or_empty_image() -> None:
    assert client.post("/api/v1/analyze").status_code == 422
    assert upload(b"").status_code == 422


def test_analyze_rejects_unsupported_and_mismatched_formats() -> None:
    assert upload(b"not-an-image", "image/jpeg").status_code == 415
    assert upload(b"\x89PNG\r\n\x1a\nmock-image", "image/jpeg").status_code == 415
    assert upload(b"\xff\xd8\xffmock-image", "image/heic").status_code == 415


def test_analyze_enforces_the_size_limit_while_reading() -> None:
    response = upload(b"\xff\xd8\xff" + (b"a" * MAX_UPLOAD_BYTES))

    assert response.status_code == 413
