from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID = {"analysis": {"is_mock": False, "supported_case": True, "material": "PVC", "pipe_schedule": "Schedule 40", "nominal_size": None, "damage_type": "clean cut", "confidence": 0.75, "summary": "", "evidence": [], "unknowns": [], "safety_flags": [], "next_action": ""}, "confirmations": {"line_type": "outdoor_irrigation", "outdoor_irrigation": "yes", "water_supply_shut_off": "yes", "pvc_schedule_40_marking": "yes", "nominal_size": "3/4", "clean_transverse_cut": "yes", "no_additional_damage": "yes", "straight_section": "yes", "safely_away_from_components": "yes", "pipe_ends_accessible": "yes"}}


def test_repair_assessment_returns_only_generic_checklist_for_eligible_case() -> None:
    response = client.post("/api/v1/repair-assessment", json=VALID)
    assert response.status_code == 200
    assert response.json()["decision"] == "eligible"
    assert response.json()["repair_method_id"] == "two_slip_coupling_section_replacement"


def test_repair_assessment_rejects_invalid_structured_values() -> None:
    invalid = {**VALID, "confirmations": {**VALID["confirmations"], "nominal_size": "2"}}
    assert client.post("/api/v1/repair-assessment", json=invalid).status_code == 422
