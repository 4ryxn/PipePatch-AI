"""FastAPI application entry point."""

from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile

from app.analysis import ValidatedImage, validate_upload
from app.config import get_analysis_settings
from app.repair_rules import assess_repair
from app.schemas import AnalysisResponse, HealthResponse, RepairAssessmentRequest, RepairAssessmentResponse
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
