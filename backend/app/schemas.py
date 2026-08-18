"""API response models."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Describes the backend's basic readiness."""

    status: Literal["ok"]


class DamageCategory(str, Enum):
    CLEAN_TRANSVERSE_CUT = "clean_transverse_cut"
    CRACK_OR_SPLIT = "crack_or_split"
    PUNCTURE_OR_HOLE = "puncture_or_hole"
    ACTIVE_LEAK_OR_WET_SOIL = "active_leak_or_wet_soil"
    SEPARATED_OR_BROKEN_FITTING = "separated_or_broken_fitting"
    VALVE_OR_MANIFOLD_DAMAGE = "valve_or_manifold_damage"
    SPRINKLER_HEAD_DAMAGE = "sprinkler_head_damage"
    NO_VISIBLE_DAMAGE = "no_visible_damage"
    UNKNOWN_OR_UNSUPPORTED = "unknown_or_unsupported"


DAMAGE_CATEGORY_LABELS: dict[DamageCategory, str] = {
    category: category.value.replace("_", " ").title() for category in DamageCategory
}


class AnalysisFields(BaseModel):
    """Observation-only fields shared by mock and live analysis results."""

    supported_case: bool
    material: str | None
    pipe_schedule: str | None
    nominal_size: str | None
    damage_type: str | None
    damage_category: DamageCategory = DamageCategory.CLEAN_TRANSVERSE_CUT
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


class RepairGuidanceRequest(BaseModel):
    analysis: AnalysisResponse
    confirmations: RepairConfirmations
    measurement: MeasurementResponse


class RepairGuidanceResponse(BaseModel):
    decision: RepairDecision
    repair_method_id: Literal["two_slip_coupling_section_replacement"] | None
    reasons: list[str]
    preparation_checklist: list[str]
    materials_tools_checklist: list[str]
    steps: list[str]
    stop_conditions: list[str]
    post_repair_verification: list[str]
    limitations: list[str]
    source_links: list[str]


class CatalogItem(BaseModel):
    item_id: str
    name: str
    nominal_size: NominalPipeSize | None
    quantity: int
    unit: str
    estimated_unit_price_usd: float
    category: str
    required: bool
    rationale: str


class PartsEstimateRequest(RepairGuidanceRequest):
    entered_quote_amount: float | None = None


class PartsEstimateResponse(BaseModel):
    decision: RepairDecision
    items: list[CatalogItem]
    total_estimated_cost_usd: float | None
    currency: Literal["USD"] = "USD"
    catalog_version: str
    last_reviewed_date: str
    disclaimer: str
    compatibility_notes: list[str]
    alternatives: list[str]
    entered_quote_amount: float | None
    comparison_amount: float | None
    quote_comparison_status: Literal[
        "no_quote", "estimated_savings", "materials_cost_more", "break_even", "invalid_quote"
    ]
    explanation: str
    reasons: list[str]


class SupplierSearchRequest(PartsEstimateRequest):
    """A user-triggered general-area search; no exact address is required."""

    area: str = Field(min_length=2, max_length=120)
    radius_km: float = Field(default=5, ge=0.1, le=10)
    max_results: int = Field(default=10, ge=1, le=10)


class SupplierLead(BaseModel):
    name: str
    category: str
    public_address: str | None
    latitude: float
    longitude: float
    distance_km: float
    directions_url: str
    availability_status: Literal["unknown"] = "unknown"
    availability_message: str = "Availability: unknown — contact this supplier to confirm compatible parts and in-store stock."


class SupplierSearchResponse(BaseModel):
    decision: RepairDecision
    suppliers: list[SupplierLead]
    reasons: list[str]
    fallback_search_url: str
    fallback_message: str | None
    provider_enabled: bool
    attribution: str = "© OpenStreetMap contributors"
    data_disclaimer: str = "Public OpenStreetMap points are approximate. Verify location, hours, stock, and compatibility directly."


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class AccountResponse(BaseModel):
    id: str
    email: str
    created_at: str


class RepairHistorySummary(BaseModel):
    outcome: Literal["supported", "rejected"]
    confirmed_nominal_size: NominalPipeSize | None
    repair_method_id: Literal["two_slip_coupling_section_replacement"] | None
    measured_gap_range_status: GapRangeStatus
    generic_parts_item_names: list[str] = Field(max_length=20)
    safety_and_limitation_text: list[str] = Field(max_length=30)


class RepairHistoryCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    summary: RepairHistorySummary


class RepairHistoryResponse(BaseModel):
    id: str
    title: str
    created_at: str
    summary: RepairHistorySummary
