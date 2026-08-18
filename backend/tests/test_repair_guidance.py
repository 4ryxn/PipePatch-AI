from app.repair_guidance import create_guidance
from app.schemas import AnalysisResponse, Confirmation, GapRangeStatus, MeasurementResponse, MeasurementStatus, NominalPipeSize, RepairConfirmations, RepairDecision, RepairGuidanceRequest


def request(**changes: object) -> RepairGuidanceRequest:
    analysis = AnalysisResponse(is_mock=False, supported_case=True, material="PVC", pipe_schedule="Schedule 40", nominal_size=None, damage_type="cut", confidence=0.8, summary="", evidence=[], unknowns=[], safety_flags=[], next_action="")
    confirmations = RepairConfirmations(line_type="outdoor_irrigation", outdoor_irrigation=Confirmation.YES, water_supply_shut_off=Confirmation.YES, pvc_schedule_40_marking=Confirmation.YES, nominal_size=NominalPipeSize.HALF, clean_transverse_cut=Confirmation.YES, no_additional_damage=Confirmation.YES, straight_section=Confirmation.YES, safely_away_from_components=Confirmation.YES, pipe_ends_accessible=Confirmation.YES)
    measurement = MeasurementResponse(status=MeasurementStatus.MEASURED, estimated_outer_diameter_mm=21.3, estimated_gap_mm=50, quality_score=.9, pixels_per_mm=5, suggested_nominal_size=NominalPipeSize.HALF, gap_range_status=GapRangeStatus.WITHIN_MVP_RANGE, limitations=[], retake_reasons=[])
    data: dict[str, object] = {"analysis": analysis, "confirmations": confirmations, "measurement": measurement}
    data.update(changes)
    return RepairGuidanceRequest(**data)


def test_only_eligible_request_returns_deterministic_steps() -> None:
    result = create_guidance(request(), .75)
    assert result.decision is RepairDecision.ELIGIBLE
    assert len(result.steps) == 8
    assert "label" in result.steps[6]


def test_mock_mismatch_and_gap_refuse_guidance() -> None:
    assert create_guidance(request(analysis=request().analysis.model_copy(update={"is_mock": True})), .75).decision is RepairDecision.NEEDS_MORE_INFORMATION
    assert create_guidance(request(measurement=request().measurement.model_copy(update={"suggested_nominal_size": NominalPipeSize.ONE})), .75).decision is RepairDecision.NEEDS_MORE_INFORMATION
    for status in (GapRangeStatus.BELOW_MVP_RANGE, GapRangeStatus.ABOVE_MVP_RANGE, GapRangeStatus.UNKNOWN):
        assert create_guidance(request(measurement=request().measurement.model_copy(update={"gap_range_status": status})), .75).decision is RepairDecision.NEEDS_MORE_INFORMATION


def test_no_safety_gate_requires_professional() -> None:
    confirmations = request().confirmations.model_copy(update={"water_supply_shut_off": Confirmation.NO})
    assert create_guidance(request(confirmations=confirmations), .75).decision is RepairDecision.PROFESSIONAL_REQUIRED
