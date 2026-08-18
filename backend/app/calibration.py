"""Deterministic ArUco reference-scale detection for the Phase 4A MVP.

Thresholds below are conservative initial MVP values, not scientific guarantees.
They must be tuned against a representative field-image evaluation set before use
for physical measurements in a later phase.
"""

from typing import Any, Final

import cv2  # type: ignore[import-untyped]
import numpy as np

from app.analysis import ValidatedImage
from app.schemas import CalibrationResponse, CalibrationStatus

MARKER_DICTIONARY: Final = cv2.aruco.DICT_4X4_50
EXPECTED_MARKER_ID: Final = 23
MARKER_SIDE_MM: Final = 50
MIN_MARKER_SIDE_PIXELS: Final = 100.0
MIN_SHARPNESS_VARIANCE: Final = 120.0
MAX_SIDE_LENGTH_RATIO: Final = 1.30
IDEAL_MARKER_SIDE_PIXELS: Final = 260.0
IDEAL_SHARPNESS_VARIANCE: Final = 500.0
CAPTURE_TIPS: Final = [
    "Print at 100% / actual size and verify the marker's 50 mm side with a physical ruler.",
    "Place the complete marker flat beside the pipe in the same plane.",
    "Capture from directly above in even light; avoid blur, shadow, and glare.",
    "Keep both pipe ends and the complete marker visible.",
]
SCOPE_NOTE: Final = (
    "This establishes a reference scale only. It does not measure pipe diameter, cut gap, "
    "or nominal pipe size."
)


def detect_calibration(image: ValidatedImage) -> CalibrationResponse:
    """Detect exactly one expected marker from validated in-memory bytes only."""
    decoded = cv2.imdecode(np.frombuffer(image.content, dtype=np.uint8), cv2.IMREAD_COLOR)
    if decoded is None:
        return _retake("The image could not be decoded. Capture another JPG, PNG, or WebP photo.")

    grayscale = cv2.cvtColor(decoded, cv2.COLOR_BGR2GRAY)
    dictionary = cv2.aruco.getPredefinedDictionary(MARKER_DICTIONARY)
    detector = cv2.aruco.ArucoDetector(dictionary, cv2.aruco.DetectorParameters())
    corners, marker_ids, _rejected = detector.detectMarkers(grayscale)
    if marker_ids is None:
        return _retake("The required ArUco marker ID 23 was not found.")

    detected_ids = [int(marker_id) for marker_id in marker_ids.flatten().tolist()]
    expected_indices = [index for index, marker_id in enumerate(detected_ids) if marker_id == EXPECTED_MARKER_ID]
    if not expected_indices:
        return _retake("A different marker was found; use only the printed PipePatch marker ID 23.")
    if len(expected_indices) != 1:
        return _retake("More than one marker ID 23 was found. Keep one complete marker in the image.")
    if len(detected_ids) != 1:
        return _retake("A different marker was also found. Keep only marker ID 23 visible.")

    marker_corners = corners[expected_indices[0]].reshape(4, 2).astype(np.float32)
    side_lengths = _side_lengths(marker_corners)
    shortest_side = min(side_lengths)
    longest_side = max(side_lengths)
    average_side = sum(side_lengths) / len(side_lengths)
    if shortest_side <= 0 or average_side <= 0:
        return _retake("The detected marker scale was invalid. Keep the complete marker flat and visible.")
    if average_side < MIN_MARKER_SIDE_PIXELS:
        return _retake("The marker is too small in the image. Move closer while keeping it complete.")

    side_ratio = longest_side / shortest_side
    if side_ratio > MAX_SIDE_LENGTH_RATIO:
        return _retake("The marker is too angled for a reliable flat-plane reference scale. Capture from directly above.")

    sharpness = _marker_sharpness(grayscale, marker_corners)
    if sharpness < MIN_SHARPNESS_VARIANCE:
        return _retake("The marker is too blurry for a reliable reference scale. Hold still and improve lighting.")

    pixels_per_mm = average_side / MARKER_SIDE_MM
    if not np.isfinite(pixels_per_mm) or pixels_per_mm <= 0:
        return _retake("The calculated reference scale was invalid. Retake the photo from directly above.")

    quality_score = _quality_score(average_side, sharpness, side_ratio)
    return CalibrationResponse(
        status=CalibrationStatus.CALIBRATED,
        pixels_per_mm=round(float(pixels_per_mm), 4),
        quality_score=round(quality_score, 3),
        retake_reasons=[],
        capture_tips=list(CAPTURE_TIPS),
        scope_note=SCOPE_NOTE,
    )


def _side_lengths(corners: Any) -> list[float]:
    return [float(np.linalg.norm(corners[(index + 1) % 4] - corners[index])) for index in range(4)]


def _marker_sharpness(grayscale: Any, corners: Any) -> float:
    left, top = np.floor(corners.min(axis=0)).astype(int)
    right, bottom = np.ceil(corners.max(axis=0)).astype(int)
    crop = grayscale[max(0, top): min(grayscale.shape[0], bottom), max(0, left): min(grayscale.shape[1], right)]
    if crop.size == 0:
        return 0.0
    return float(cv2.Laplacian(crop, cv2.CV_64F).var())


def _quality_score(average_side: float, sharpness: float, side_ratio: float) -> float:
    size_score = min(1.0, average_side / IDEAL_MARKER_SIDE_PIXELS)
    sharpness_score = min(1.0, sharpness / IDEAL_SHARPNESS_VARIANCE)
    skew_score = max(0.0, 1 - ((side_ratio - 1) / (MAX_SIDE_LENGTH_RATIO - 1)))
    return max(0.0, min(1.0, (size_score + sharpness_score + skew_score) / 3))


def _retake(reason: str) -> CalibrationResponse:
    return CalibrationResponse(
        status=CalibrationStatus.NEEDS_RETAKE,
        pixels_per_mm=None,
        quality_score=0.0,
        retake_reasons=[reason],
        capture_tips=list(CAPTURE_TIPS),
        scope_note=SCOPE_NOTE,
    )
