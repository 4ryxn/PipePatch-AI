"""Version-controlled, deterministic high-level guidance for one approved MVP case."""

from app.repair_rules import REPAIR_METHOD_ID, assess_repair
from app.schemas import (
    GapRangeStatus,
    MeasurementStatus,
    RepairDecision,
    RepairGuidanceRequest,
    RepairGuidanceResponse,
)

SOURCES = [
    "https://www.oatey.com/resources/project-guides/solvent-welding",
    "https://www.charlottepipe.com/articles/solvent-welding-how-to-join-plastic-pipe-and-fittings-like-a-pro",
    "https://www.rainbird.com/homeowners/sprinkler-system-installation-guide",
]
LIMITATIONS = [
    "Local code, the selected product label, and fitting instructions take priority.",
    "Solvent cement is a chemical weld, not ordinary glue. This plan never supplies a universal set or cure time.",
    "This guidance is limited to the confirmed outdoor irrigation Schedule-40 PVC case.",
]
STOP = [
    "Water cannot be isolated or pressure cannot be relieved.",
    "The line may be potable water, sewer, gas, electrical conduit, or another unknown utility.",
    "There is standing water, an unsafe trench, or a buried utility risk.",
    "Pipe is cracked, crushed, deformed, leaking after test, unmarked, incompatible, or beside a valve/fitting.",
    "There is not enough straight exposed pipe, or dry fitting requires force or bending.",
    "Any measurement, material, access, or safety condition is uncertain.",
]


def create_guidance(
    request: RepairGuidanceRequest, minimum_confidence: float
) -> RepairGuidanceResponse:
    assessment = assess_repair(request.analysis, request.confirmations, minimum_confidence)
    if assessment.decision is RepairDecision.PROFESSIONAL_REQUIRED:
        return _refusal(RepairDecision.PROFESSIONAL_REQUIRED, assessment.reasons)
    reasons = list(assessment.reasons) if assessment.decision is not RepairDecision.ELIGIBLE else []
    measurement = request.measurement
    if measurement.status is not MeasurementStatus.MEASURED:
        reasons.append("A completed assisted measurement is required.")
    if measurement.gap_range_status is not GapRangeStatus.WITHIN_MVP_RANGE:
        reasons.append("The measured cut gap is not within the limited MVP range.")
    if measurement.suggested_nominal_size is None:
        reasons.append("The visible-diameter size suggestion is missing or ambiguous.")
    elif measurement.suggested_nominal_size != request.confirmations.nominal_size:
        reasons.append(
            "The visible-diameter suggestion does not match the user-confirmed nominal size."
        )
    if reasons:
        return _refusal(RepairDecision.NEEDS_MORE_INFORMATION, reasons)
    return RepairGuidanceResponse(
        decision=RepairDecision.ELIGIBLE,
        repair_method_id=REPAIR_METHOD_ID,
        reasons=[
            "All deterministic safety, measurement, and size-consistency gates passed for the limited MVP case."
        ],
        preparation_checklist=[
            "Confirm irrigation water is shut off, pressure is relieved, and flow has stopped.",
            "Provide ventilation, gloves, eye protection, and keep primer/cement away from ignition sources.",
            "Hand-excavate enough straight pipe; do not power-dig near lines.",
            "Confirm the replacement can dry-fit without forcing or bending the pipe.",
        ],
        materials_tools_checklist=[
            "Same-size Schedule-40 PVC replacement piece.",
            "Two same-size Schedule-40 repair/slip couplings without internal stops.",
            "PVC-compatible primer where required and compatible PVC solvent cement.",
            "Measuring tool, PVC cutter, deburring tool, gloves, and eye protection.",
        ],
        steps=[
            "Shut off irrigation water, relieve pressure, and confirm flow has stopped.",
            "Hand-excavate and expose enough straight pipe; do not use power digging near lines.",
            "Stop if the line purpose, material, access, or damage differs from the supported case.",
            "Verify ends are sound, square, clean, dry, and deburred; remove additional damage only if adequate straight pipe remains.",
            "Dry-fit the replacement section and couplings; do not force components or bend buried pipe.",
            "Apply compatible primer/cement and assemble strictly according to the selected product label and fitting instructions.",
            "Keep joints undisturbed for the product label's required set and cure period; never use a fixed app cure time.",
            "After full labelled cure, restore water gradually and inspect for leaks before backfilling.",
        ],
        stop_conditions=STOP,
        post_repair_verification=[
            "Confirm the full labelled cure time has elapsed before pressure testing.",
            "Restore water gradually and inspect every new joint for leaks.",
            "Stop and call a professional if any leak, movement, uncertainty, or unsafe condition appears.",
        ],
        limitations=LIMITATIONS,
        source_links=SOURCES,
    )


def _refusal(decision: RepairDecision, reasons: list[str]) -> RepairGuidanceResponse:
    return RepairGuidanceResponse(
        decision=decision,
        repair_method_id=None,
        reasons=reasons,
        preparation_checklist=[],
        materials_tools_checklist=[],
        steps=[],
        stop_conditions=STOP,
        post_repair_verification=[],
        limitations=LIMITATIONS,
        source_links=SOURCES,
    )
