"""Pure, deterministic authorization for the tightly bounded parts checklist."""

from typing import Final, Literal

from app.schemas import AnalysisResponse, Confirmation, LineType, RepairAssessmentResponse, RepairConfirmations, RepairDecision

MINIMUM_CONFIDENCE = 0.75
REPAIR_METHOD_ID: Final[Literal["two_slip_coupling_section_replacement"]] = "two_slip_coupling_section_replacement"
SAFETY_WARNINGS = [
    "Verify final compatibility, manufacturer requirements, and local requirements before any work.",
    "Do not restore water until the line is safe to test according to applicable requirements.",
]


def assess_repair(
    analysis: AnalysisResponse,
    confirmations: RepairConfirmations,
    minimum_confidence: float = MINIMUM_CONFIDENCE,
) -> RepairAssessmentResponse:
    """Authorize generic materials only when every safety gate is explicitly true."""
    professional: list[str] = []
    needs_information: list[str] = []
    if analysis.is_mock:
        needs_information.append("A live AI analysis is required; demo analysis results cannot qualify.")
    if not analysis.supported_case:
        needs_information.append("The live AI result did not identify a supported case.")
    if analysis.confidence < minimum_confidence:
        needs_information.append(
            f"The live AI confidence is below the required {minimum_confidence:.2f} threshold."
        )
    if confirmations.line_type is not LineType.OUTDOOR_IRRIGATION:
        professional.append("The line is not confirmed as an outdoor irrigation line.")
    _gate(confirmations.outdoor_irrigation, "outdoor irrigation line", professional, needs_information)
    _gate(confirmations.water_supply_shut_off, "water supply shut off and line made safe", professional, needs_information)
    _gate(confirmations.pvc_schedule_40_marking, "visible PVC Schedule 40 marking", professional, needs_information)
    if confirmations.nominal_size is None:
        needs_information.append("Select a visibly confirmed nominal size: 1/2 in, 3/4 in, or 1 in.")
    _gate(confirmations.clean_transverse_cut, "one clean transverse cut", professional, needs_information)
    _gate(confirmations.no_additional_damage, "absence of cracks, crushing, deformation, or missing fragments", professional, needs_information)
    _gate(confirmations.straight_section, "straight pipe section", professional, needs_information)
    _gate(confirmations.safely_away_from_components, "distance from valves, fittings, manifolds, foundation penetrations, and other utilities", professional, needs_information)
    _gate(confirmations.pipe_ends_accessible, "both pipe ends safely exposed and accessible", professional, needs_information)
    if professional:
        return _response(RepairDecision.PROFESSIONAL_REQUIRED, professional, confirmations)
    if needs_information:
        return _response(RepairDecision.NEEDS_MORE_INFORMATION, needs_information, confirmations)
    return RepairAssessmentResponse(decision=RepairDecision.ELIGIBLE, reasons=["All deterministic safety gates are explicitly confirmed for this limited MVP case."], safety_warnings=SAFETY_WARNINGS, confirmed_pipe_size=confirmations.nominal_size, repair_method_id=REPAIR_METHOD_ID, parts=["Same-size Schedule 40 PVC replacement pipe.", "Two same-size Schedule 40 PVC repair/slip couplings without internal stops.", "PVC primer where required.", "PVC solvent cement compatible with the pipe and fittings."], tools=["Measuring tool.", "PVC cutter.", "Deburring tool.", "Gloves.", "Eye protection."])


def _gate(answer: Confirmation, label: str, professional: list[str], needs_information: list[str]) -> None:
    if answer is Confirmation.NO:
        professional.append(f"The required confirmation failed: {label}.")
    elif answer is Confirmation.UNKNOWN:
        needs_information.append(f"Confirm or clarify: {label}.")


def _response(decision: RepairDecision, reasons: list[str], confirmations: RepairConfirmations) -> RepairAssessmentResponse:
    return RepairAssessmentResponse(decision=decision, reasons=reasons, safety_warnings=SAFETY_WARNINGS, confirmed_pipe_size=confirmations.nominal_size, repair_method_id=None, parts=[], tools=[])
