import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.analysis import ValidatedImage
from app.calibration import EXPECTED_MARKER_ID, MARKER_DICTIONARY
from app.measurements import measure_image
from app.schemas import GapRangeStatus, ImagePoint, MeasurementStatus, NominalPipeSize
from app.main import app

client = TestClient(app)


def image() -> ValidatedImage:
    canvas = np.full((700, 1200), 255, np.uint8)
    marker = cv2.aruco.generateImageMarker(cv2.aruco.getPredefinedDictionary(MARKER_DICTIONARY), EXPECTED_MARKER_ID, 250)
    canvas[50:300, 50:300] = marker
    success, encoded = cv2.imencode(".png", canvas)
    assert success
    return ValidatedImage(encoded.tobytes(), "image/png")


def measured(diameter: float, gap: float):
    return measure_image(image(), ImagePoint(x=320, y=400), ImagePoint(x=320 + diameter, y=400), ImagePoint(x=320, y=500), ImagePoint(x=320 + gap, y=500))


@pytest.mark.parametrize(("pixels", "size"), [(106.5, NominalPipeSize.HALF), (133.5, NominalPipeSize.THREE_QUARTER), (167, NominalPipeSize.ONE)])
def test_supported_size_suggestions(pixels: float, size: NominalPipeSize) -> None:
    result = measured(pixels, 250)
    assert result.status is MeasurementStatus.MEASURED
    assert result.suggested_nominal_size is size


def test_short_out_of_bounds_and_ambiguous_lines_are_safe() -> None:
    assert measured(10, 250).status is MeasurementStatus.NEEDS_RETAKE
    out = measure_image(image(), ImagePoint(x=-1, y=1), ImagePoint(x=100, y=1), ImagePoint(x=1, y=1), ImagePoint(x=200, y=1))
    assert out.status is MeasurementStatus.NEEDS_RETAKE
    assert measured(120, 250).suggested_nominal_size is None


@pytest.mark.parametrize(("gap", "status"), [(100, GapRangeStatus.BELOW_MVP_RANGE), (250, GapRangeStatus.WITHIN_MVP_RANGE), (500, GapRangeStatus.ABOVE_MVP_RANGE)])
def test_gap_range_status(gap: float, status: GapRangeStatus) -> None:
    assert measured(106.5, gap).gap_range_status is status


def test_measurement_endpoint_validates_required_coordinate_fields() -> None:
    response = client.post("/api/v1/measurements", files={"image": ("ignored.png", image().content, "image/png")})
    assert response.status_code == 422
