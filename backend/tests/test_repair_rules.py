import pytest

from app.repair_rules import MINIMUM_CONFIDENCE, assess_repair
from app.schemas import AnalysisResponse, Confirmation, LineType, NominalPipeSize, RepairConfirmations, RepairDecision


def live_analysis(**changes: object) -> AnalysisResponse:
    data: dict[str, object] = {"is_mock": False, "supported_case": True, "material": "PVC", "pipe_schedule": "Schedule 40", "nominal_size": None, "damage_type": "clean cut", "confidence": MINIMUM_CONFIDENCE, "summary": "", "evidence": [], "unknowns": [], "safety_flags": [], "next_action": ""}
    data.update(changes)
    return AnalysisResponse(**data)


def confirmations(**changes: object) -> RepairConfirmations:
    data: dict[str, object] = {"line_type": LineType.OUTDOOR_IRRIGATION, "outdoor_irrigation": Confirmation.YES, "water_supply_shut_off": Confirmation.YES, "pvc_schedule_40_marking": Confirmation.YES, "nominal_size": NominalPipeSize.HALF, "clean_transverse_cut": Confirmation.YES, "no_additional_damage": Confirmation.YES, "straight_section": Confirmation.YES, "safely_away_from_components": Confirmation.YES, "pipe_ends_accessible": Confirmation.YES}
    data.update(changes)
    return RepairConfirmations(**data)


@pytest.mark.parametrize("size", list(NominalPipeSize))
def test_eligible_for_each_supported_size(size: NominalPipeSize) -> None:
    result = assess_repair(live_analysis(), confirmations(nominal_size=size))
    assert result.decision is RepairDecision.ELIGIBLE
    assert result.confirmed_pipe_size is size
    assert result.repair_method_id == "two_slip_coupling_section_replacement"
    assert len(result.parts) == 4
    assert len(result.tools) == 5


@pytest.mark.parametrize("confidence, decision", [(0.749, RepairDecision.NEEDS_MORE_INFORMATION), (0.75, RepairDecision.ELIGIBLE), (0.751, RepairDecision.ELIGIBLE)])
def test_confidence_boundary(confidence: float, decision: RepairDecision) -> None:
    result = assess_repair(live_analysis(confidence=confidence), confirmations())
    assert result.decision is decision


def test_uses_the_configured_confidence_threshold() -> None:
    result = assess_repair(live_analysis(confidence=0.80), confirmations(), minimum_confidence=0.81)
    assert result.decision is RepairDecision.NEEDS_MORE_INFORMATION


@pytest.mark.parametrize("field", ["outdoor_irrigation", "water_supply_shut_off", "pvc_schedule_40_marking", "clean_transverse_cut", "no_additional_damage", "straight_section", "safely_away_from_components", "pipe_ends_accessible"])
def test_every_confirmation_no_requires_professional(field: str) -> None:
    result = assess_repair(live_analysis(), confirmations(**{field: Confirmation.NO}))
    assert result.decision is RepairDecision.PROFESSIONAL_REQUIRED
    assert result.parts == []


@pytest.mark.parametrize("field", ["outdoor_irrigation", "water_supply_shut_off", "pvc_schedule_40_marking", "clean_transverse_cut", "no_additional_damage", "straight_section", "safely_away_from_components", "pipe_ends_accessible"])
def test_every_confirmation_unknown_needs_information(field: str) -> None:
    result = assess_repair(live_analysis(), confirmations(**{field: Confirmation.UNKNOWN}))
    assert result.decision is RepairDecision.NEEDS_MORE_INFORMATION
    assert result.parts == []


@pytest.mark.parametrize("line_type", [LineType.GAS, LineType.SEWER, LineType.ELECTRICAL_CONDUIT, LineType.POTABLE_HOUSEHOLD, LineType.UNKNOWN])
def test_prohibited_or_unknown_line_types_require_professional(line_type: LineType) -> None:
    assert assess_repair(live_analysis(), confirmations(line_type=line_type)).decision is RepairDecision.PROFESSIONAL_REQUIRED


def test_missing_size_mock_and_unsupported_analysis_need_information() -> None:
    assert assess_repair(live_analysis(), confirmations(nominal_size=None)).decision is RepairDecision.NEEDS_MORE_INFORMATION
    assert assess_repair(live_analysis(is_mock=True), confirmations()).decision is RepairDecision.NEEDS_MORE_INFORMATION
    assert assess_repair(live_analysis(supported_case=False), confirmations()).decision is RepairDecision.NEEDS_MORE_INFORMATION
