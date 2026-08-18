"""API response models."""

from enum import Enum
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


class Confirmation(str, Enum):
    YES = "yes"
    NO = "no"
    UNKNOWN = "unknown"


class NominalPipeSize(str, Enum):
    HALF = "1/2"
    THREE_QUARTER = "3/4"
    ONE = "1"


class LineType(str, Enum):
    OUTDOOR_IRRIGATION = "outdoor_irrigation"
    GAS = "gas"
    SEWER = "sewer"
    ELECTRICAL_CONDUIT = "electrical_conduit"
    POTABLE_HOUSEHOLD = "potable_household"
    UNKNOWN = "unknown"


class RepairDecision(str, Enum):
    ELIGIBLE = "eligible"
    NEEDS_MORE_INFORMATION = "needs_more_information"
    PROFESSIONAL_REQUIRED = "professional_required"


class RepairConfirmations(BaseModel):
    """Explicit user confirmations consumed only by deterministic rules."""

    line_type: LineType
    outdoor_irrigation: Confirmation
    water_supply_shut_off: Confirmation
    pvc_schedule_40_marking: Confirmation
    nominal_size: NominalPipeSize | None
    clean_transverse_cut: Confirmation
    no_additional_damage: Confirmation
    straight_section: Confirmation
    safely_away_from_components: Confirmation
    pipe_ends_accessible: Confirmation


class RepairAssessmentRequest(BaseModel):
    analysis: AnalysisResponse
    confirmations: RepairConfirmations


class RepairAssessmentResponse(BaseModel):
    decision: RepairDecision
    reasons: list[str]
    safety_warnings: list[str]
    confirmed_pipe_size: NominalPipeSize | None
    repair_method_id: Literal["two_slip_coupling_section_replacement"] | None
    parts: list[str]
    tools: list[str]


class CalibrationStatus(str, Enum):
    CALIBRATED = "calibrated"
    NEEDS_RETAKE = "needs_retake"


class CalibrationResponse(BaseModel):
    """A reference-scale result; it deliberately has no pipe measurements."""

    status: CalibrationStatus
    pixels_per_mm: float | None
    marker_id: Literal[23] = 23
    known_marker_side_mm: Literal[50] = 50
    quality_score: float
    retake_reasons: list[str]
    capture_tips: list[str]
    scope_note: str


class MeasurementStatus(str, Enum):
    MEASURED = "measured"
    NEEDS_RETAKE = "needs_retake"


class GapRangeStatus(str, Enum):
    WITHIN_MVP_RANGE = "within_mvp_range"
    BELOW_MVP_RANGE = "below_mvp_range"
    ABOVE_MVP_RANGE = "above_mvp_range"
    UNKNOWN = "unknown"


class ImagePoint(BaseModel):
    x: float
    y: float


class MeasurementResponse(BaseModel):
    status: MeasurementStatus
    estimated_outer_diameter_mm: float | None
    estimated_gap_mm: float | None
    quality_score: float
    pixels_per_mm: float | None
    marker_id: Literal[23] = 23
    known_marker_side_mm: Literal[50] = 50
    suggested_nominal_size: NominalPipeSize | None
    gap_range_status: GapRangeStatus
    limitations: list[str]
    retake_reasons: list[str]
