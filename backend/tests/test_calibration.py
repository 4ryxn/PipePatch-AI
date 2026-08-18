import cv2
import numpy as np
from fastapi.testclient import TestClient

from app.analysis import ValidatedImage
from app.calibration import EXPECTED_MARKER_ID, MARKER_DICTIONARY, detect_calibration
from app.main import app
from app.schemas import CalibrationStatus

client = TestClient(app)


def marker_image(marker_ids: list[int], size: int = 220, blur: bool = False) -> bytes:
    canvas = np.full((600, 600), 255, dtype=np.uint8)
    dictionary = cv2.aruco.getPredefinedDictionary(MARKER_DICTIONARY)
    positions = [(80, 80), (320, 80)]
    for marker_id, (left, top) in zip(marker_ids, positions):
        marker = cv2.aruco.generateImageMarker(dictionary, marker_id, size)
        canvas[top:top + size, left:left + size] = marker
    if blur:
        canvas = cv2.GaussianBlur(canvas, (31, 31), 0)
    success, encoded = cv2.imencode(".png", canvas)
    assert success
    return encoded.tobytes()


def calibrated_input(content: bytes) -> ValidatedImage:
    return ValidatedImage(content, "image/png")


def test_valid_expected_marker_returns_scale_only() -> None:
    result = detect_calibration(calibrated_input(marker_image([EXPECTED_MARKER_ID])))
    assert result.status is CalibrationStatus.CALIBRATED
    assert result.pixels_per_mm is not None
    assert result.marker_id == EXPECTED_MARKER_ID
    assert result.known_marker_side_mm == 50
    assert "does not measure pipe diameter" in result.scope_note
    assert not hasattr(result, "image")


def test_missing_or_wrong_marker_needs_retake() -> None:
    missing = detect_calibration(calibrated_input(marker_image([])))
    wrong = detect_calibration(calibrated_input(marker_image([22])))
    assert missing.status is CalibrationStatus.NEEDS_RETAKE
    assert wrong.status is CalibrationStatus.NEEDS_RETAKE
    assert wrong.pixels_per_mm is None


def test_duplicate_or_mixed_markers_need_retake() -> None:
    duplicate = detect_calibration(calibrated_input(marker_image([EXPECTED_MARKER_ID, EXPECTED_MARKER_ID])))
    mixed = detect_calibration(calibrated_input(marker_image([EXPECTED_MARKER_ID, 22])))
    assert duplicate.status is CalibrationStatus.NEEDS_RETAKE
    assert mixed.status is CalibrationStatus.NEEDS_RETAKE


def test_small_or_blurry_marker_needs_retake() -> None:
    small = detect_calibration(calibrated_input(marker_image([EXPECTED_MARKER_ID], size=70)))
    blurry = detect_calibration(calibrated_input(marker_image([EXPECTED_MARKER_ID], blur=True)))
    assert small.status is CalibrationStatus.NEEDS_RETAKE
    assert blurry.status is CalibrationStatus.NEEDS_RETAKE


def test_calibration_endpoint_reuses_upload_validation() -> None:
    valid = client.post(
        "/api/v1/calibration",
        files={"image": ("ignored.png", marker_image([EXPECTED_MARKER_ID]), "image/png")},
    )
    unsupported = client.post(
        "/api/v1/calibration",
        files={"image": ("ignored.txt", b"not-an-image", "text/plain")},
    )
    assert valid.status_code == 200
    assert valid.json()["status"] == "calibrated"
    assert unsupported.status_code == 415
