"""FastAPI application entry point."""

from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from app.analysis import ValidatedImage, validate_upload
from app.calibration import detect_calibration
from app.measurements import measure_image
from app.config import get_analysis_settings
from app.repair_rules import assess_repair
from app.schemas import AnalysisResponse, CalibrationResponse, HealthResponse, ImagePoint, MeasurementResponse, RepairAssessmentRequest, RepairAssessmentResponse
from app.gemini import GeminiServiceError, analyze_with_gemini

app = FastAPI(title="PipePatch AI API", version="0.1.0")


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    """Return a minimal readiness response without external dependencies."""
    return HealthResponse(status="ok")


@app.post("/api/v1/analyze", response_model=AnalysisResponse, tags=["analysis"])
async def analyze(image: Annotated[UploadFile, File(description="One pipe photo")]) -> AnalysisResponse:
    """Validate one image and run the configured non-persistent analysis mode."""
    validated_image = await validate_upload(image)
    try:
        settings = get_analysis_settings()
    except ValueError as error:
        raise HTTPException(status_code=503, detail="Analysis mode is not configured correctly.") from error
    if settings.mode == "gemini":
        try:
            return await analyze_with_gemini(validated_image, settings)
        except GeminiServiceError as error:
            raise HTTPException(status_code=error.status_code, detail=error.message) from error
    return mock_analysis(validated_image)


@app.post("/api/v1/calibration", response_model=CalibrationResponse, tags=["calibration"])
async def calibration(image: Annotated[UploadFile, File(description="One calibration photo")]) -> CalibrationResponse:
    """Return an ephemeral marker scale result without calling Gemini."""
    return detect_calibration(await validate_upload(image))


@app.post("/api/v1/measurements", response_model=MeasurementResponse, tags=["calibration"])
async def measurements(
    image: Annotated[UploadFile, File(description="One calibration photo")],
    diameter_start_x: Annotated[float, Form()], diameter_start_y: Annotated[float, Form()],
    diameter_end_x: Annotated[float, Form()], diameter_end_y: Annotated[float, Form()],
    gap_start_x: Annotated[float, Form()], gap_start_y: Annotated[float, Form()],
    gap_end_x: Annotated[float, Form()], gap_end_y: Annotated[float, Form()],
) -> MeasurementResponse:
    """Measure only user-selected segments after server-side marker re-detection."""
    return measure_image(await validate_upload(image), ImagePoint(x=diameter_start_x, y=diameter_start_y), ImagePoint(x=diameter_end_x, y=diameter_end_y), ImagePoint(x=gap_start_x, y=gap_start_y), ImagePoint(x=gap_end_x, y=gap_end_y))


def mock_analysis(_image: ValidatedImage) -> AnalysisResponse:
    """Return fixed offline observations without reading or retaining image details."""
    return AnalysisResponse(
        is_mock=True,
        supported_case=False,
        material="PVC (demo observation)",
        pipe_schedule="Schedule 40 (demo observation)",
        nominal_size=None,
        damage_type="clean transverse cut (demo observation)",
        confidence=0.0,
        summary="Demo response only. This upload has not received real image analysis.",
        evidence=["The backend accepted one supported image format."],
        unknowns=["Pipe size has not been measured.", "No calibration marker was evaluated."],
        safety_flags=["Do not use this demo result to perform a repair."],
        next_action="Use this screen only to verify the local upload flow.",
    )


@app.post("/api/v1/repair-assessment", response_model=RepairAssessmentResponse, tags=["assessment"])
def repair_assessment(request: RepairAssessmentRequest) -> RepairAssessmentResponse:
    """Apply deterministic safety gates without a provider or network call."""
    try:
        settings = get_analysis_settings()
    except ValueError as error:
        raise HTTPException(status_code=503, detail="Assessment is not configured correctly.") from error
    return assess_repair(request.analysis, request.confirmations, settings.repair_minimum_confidence)
