"""API response models."""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Describes the backend's basic readiness."""

    status: Literal["ok"]


class AnalysisFields(BaseModel):
    """Observation-only fields shared by mock and live analysis results."""

    supported_case: bool
    material: str | None
    pipe_schedule: str | None
    nominal_size: str | None
    damage_type: str | None
    confidence: float
    summary: str
    evidence: list[str]
    unknowns: list[str]
    safety_flags: list[str]
    next_action: str


class AnalysisResponse(AnalysisFields):
    """Mobile-facing analysis response. It never includes repair guidance."""

    is_mock: bool


class GeminiAnalysisResponse(AnalysisFields):
    """The strict Structured Outputs schema accepted from the Gemini client."""
