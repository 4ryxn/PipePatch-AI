"""API response models."""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Describes the backend's basic readiness."""

    status: Literal["ok"]


class AnalysisResponse(BaseModel):
    """A deliberately non-diagnostic response used to exercise the local upload flow."""

    is_mock: Literal[True] = True
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
