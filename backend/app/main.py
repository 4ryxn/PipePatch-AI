"""FastAPI application entry point."""

from fastapi import FastAPI

from app.schemas import HealthResponse

app = FastAPI(title="PipePatch AI API", version="0.1.0")


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    """Return a minimal readiness response without external dependencies."""
    return HealthResponse(status="ok")
