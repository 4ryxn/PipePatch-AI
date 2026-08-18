"""Pure assisted measurement calculations using server-side marker calibration."""

import math
from typing import Final

import cv2  # type: ignore[import-untyped]
import numpy as np

from app.analysis import ValidatedImage
from app.calibration import detect_calibration
from app.schemas import GapRangeStatus, ImagePoint, MeasurementResponse, MeasurementStatus, NominalPipeSize

MIN_LINE_PIXELS: Final = 30.0
SIZE_TOLERANCE_MM: Final = 2.0
HALF_INCH_OD_MM: Final = 21.3
THREE_QUARTER_OD_MM: Final = 26.7
ONE_INCH_OD_MM: Final = 33.4
MVP_MIN_GAP_MM: Final = 40.6
MVP_MAX_GAP_MM: Final = 91.4
LIMITATIONS: Final = [
    "Estimate only: based on user-drawn visible edges, marker quality, and a flat-plane assumption.",
    "This does not prove PVC material, Schedule 40 status, exact nominal size, or repair eligibility.",
]


def measure_image(image: ValidatedImage, diameter_start: ImagePoint, diameter_end: ImagePoint, gap_start: ImagePoint, gap_end: ImagePoint) -> MeasurementResponse:
    calibration = detect_calibration(image)
    if calibration.pixels_per_mm is None:
        return _retake(calibration.retake_reasons, calibration.quality_score)
    decoded = cv2.imdecode(np.frombuffer(image.content, dtype=np.uint8), cv2.IMREAD_COLOR)
    if decoded is None:
        return _retake(["The image could not be decoded."], 0.0)
    height, width = decoded.shape[:2]
    points = [diameter_start, diameter_end, gap_start, gap_end]
    if not all(_valid_point(point, width, height) for point in points):
        return _retake(["Measurement points must be finite and inside the original image."], calibration.quality_score)
    diameter_pixels = _distance(diameter_start, diameter_end)
    gap_pixels = _distance(gap_start, gap_end)
    if diameter_pixels < MIN_LINE_PIXELS or gap_pixels < MIN_LINE_PIXELS:
        return _retake(["Draw each measurement line longer and tap distinct visible endpoints."], calibration.quality_score)
    diameter_mm = diameter_pixels / calibration.pixels_per_mm
    gap_mm = gap_pixels / calibration.pixels_per_mm
    if not math.isfinite(diameter_mm) or not math.isfinite(gap_mm) or diameter_mm <= 0 or gap_mm <= 0:
        return _retake(["The calculated measurement was invalid."], calibration.quality_score)
    suggestion, ambiguity = _suggest_size(diameter_mm)
    line_score = min(1.0, min(diameter_pixels, gap_pixels) / 140.0)
    quality = round(calibration.quality_score * 0.7 + line_score * 0.3 - (0.12 if ambiguity else 0.0), 3)
    return MeasurementResponse(status=MeasurementStatus.MEASURED, estimated_outer_diameter_mm=round(diameter_mm, 1), estimated_gap_mm=round(gap_mm, 1), quality_score=max(0.0, quality), pixels_per_mm=calibration.pixels_per_mm, suggested_nominal_size=suggestion, gap_range_status=_gap_status(gap_mm), limitations=list(LIMITATIONS), retake_reasons=[])


def _valid_point(point: ImagePoint, width: int, height: int) -> bool:
    return math.isfinite(point.x) and math.isfinite(point.y) and 0 <= point.x < width and 0 <= point.y < height


def _distance(start: ImagePoint, end: ImagePoint) -> float:
    return math.hypot(end.x - start.x, end.y - start.y)


def _suggest_size(diameter_mm: float) -> tuple[NominalPipeSize | None, bool]:
    candidates = [(NominalPipeSize.HALF, HALF_INCH_OD_MM), (NominalPipeSize.THREE_QUARTER, THREE_QUARTER_OD_MM), (NominalPipeSize.ONE, ONE_INCH_OD_MM)]
    ranked = sorted((abs(diameter_mm - target), size) for size, target in candidates)
    if ranked[0][0] > SIZE_TOLERANCE_MM or (len(ranked) > 1 and ranked[1][0] - ranked[0][0] < 0.5):
        return None, True
    return ranked[0][1], False


def _gap_status(gap_mm: float) -> GapRangeStatus:
    if gap_mm < MVP_MIN_GAP_MM:
        return GapRangeStatus.BELOW_MVP_RANGE
    if gap_mm > MVP_MAX_GAP_MM:
        return GapRangeStatus.ABOVE_MVP_RANGE
    return GapRangeStatus.WITHIN_MVP_RANGE


def _retake(reasons: list[str], quality: float) -> MeasurementResponse:
    return MeasurementResponse(status=MeasurementStatus.NEEDS_RETAKE, estimated_outer_diameter_mm=None, estimated_gap_mm=None, quality_score=quality, pixels_per_mm=None, suggested_nominal_size=None, gap_range_status=GapRangeStatus.UNKNOWN, limitations=list(LIMITATIONS), retake_reasons=reasons)
