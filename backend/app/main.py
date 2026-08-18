"""FastAPI application entry point."""

from typing import Annotated

from fastapi import FastAPI, File, UploadFile

from app.analysis import validate_upload
from app.schemas import AnalysisResponse, HealthResponse

app = FastAPI(title="PipePatch AI API", version="0.1.0")


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    """Return a minimal readiness response without external dependencies."""
    return HealthResponse(status="ok")


@app.post("/api/v1/analyze", response_model=AnalysisResponse, tags=["analysis"])
async def analyze(image: Annotated[UploadFile, File(description="One pipe photo")]) -> AnalysisResponse:
    """Validate one image in memory and return fixed demo observations only."""
    await validate_upload(image)
    return AnalysisResponse(
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
