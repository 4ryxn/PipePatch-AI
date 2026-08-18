import asyncio
import csv

import pytest

from app.dataset import validate_manifest
from app.evaluation import evaluate
from app.parts_catalog import parts_estimate
from app.repair_guidance import create_guidance
from app.repair_rules import assess_repair
from app.schemas import DamageCategory, PartsEstimateRequest, RepairDecision, SupplierSearchRequest
from app.suppliers import SupplierSearchService
from app.config import SupplierSettings
from test_parts_catalog import request


def test_all_damage_category_values_are_stable() -> None:
    assert [item.value for item in DamageCategory] == [
        "clean_transverse_cut",
        "crack_or_split",
        "puncture_or_hole",
        "active_leak_or_wet_soil",
        "separated_or_broken_fitting",
        "valve_or_manifold_damage",
        "sprinkler_head_damage",
        "no_visible_damage",
        "unknown_or_unsupported",
    ]


def test_clean_cut_preserves_eligible_path() -> None:
    value = request()
    assert assess_repair(value.analysis, value.confirmations).decision is RepairDecision.ELIGIBLE


@pytest.mark.parametrize(
    "category", [item for item in DamageCategory if item is not DamageCategory.CLEAN_TRANSVERSE_CUT]
)
def test_non_clean_categories_are_refused_everywhere(category: DamageCategory) -> None:
    value = request()
    analysis = value.analysis.model_copy(update={"damage_category": category})
    assert assess_repair(analysis, value.confirmations).decision is not RepairDecision.ELIGIBLE
    changed = value.model_copy(update={"analysis": analysis})
    assert create_guidance(changed, 0.75).decision is not RepairDecision.ELIGIBLE
    parts_request = PartsEstimateRequest(**changed.model_dump())
    assert parts_estimate(parts_request, 0.75).decision is not RepairDecision.ELIGIBLE
    supplier = SupplierSearchService(SupplierSettings(False, "test", 1, 1, 1))
    supplier_request = SupplierSearchRequest(
        **parts_request.model_dump(), area="Test", radius_km=1, max_results=1
    )
    assert (
        asyncio.run(supplier.search(supplier_request, 0.75)).decision is not RepairDecision.ELIGIBLE
    )


def write(path, rows):
    names = [
        "case_id",
        "image_path",
        "split",
        "damage_category",
        "annotation_confidence",
        "reviewer_status",
        "consent_status",
        "schema_version",
    ]
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=names)
        writer.writeheader()
        writer.writerows(rows)


def row(**updates):
    value = {
        "case_id": "case-a",
        "image_path": "synthetic/a.png",
        "split": "train",
        "damage_category": "clean_transverse_cut",
        "annotation_confidence": "1",
        "reviewer_status": "reviewed",
        "consent_status": "synthetic",
        "schema_version": "1",
    }
    value.update(updates)
    return value


def test_manifest_validator_valid_and_reports_classes(tmp_path) -> None:
    path = tmp_path / "manifest.csv"
    write(path, [row(), row(case_id="case-b", split="test", damage_category="crack_or_split")])
    assert validate_manifest(str(path))["class_distribution"]["clean_transverse_cut"] == 1


@pytest.mark.parametrize(
    "updates",
    [
        {"damage_category": "bad"},
        {"split": "bad"},
        {"image_path": "../unsafe.png"},
        {"consent_status": ""},
        {"reviewer_status": ""},
    ],
)
def test_manifest_validator_rejects_invalid_rows(tmp_path, updates) -> None:
    path = tmp_path / "bad.csv"
    write(path, [row(**updates)])
    with pytest.raises(ValueError):
        validate_manifest(str(path))


def test_manifest_validator_rejects_duplicate_case_id(tmp_path) -> None:
    path = tmp_path / "duplicate.csv"
    write(path, [row(), row()])
    with pytest.raises(ValueError):
        validate_manifest(str(path))


def test_offline_evaluation_metrics(tmp_path) -> None:
    truth = tmp_path / "truth.csv"
    predictions = tmp_path / "pred.csv"
    truth.write_text(
        "case_id,damage_category\na,clean_transverse_cut\nb,crack_or_split\nc,unknown_or_unsupported\n"
    )
    predictions.write_text(
        "case_id,damage_category\na,clean_transverse_cut\nb,clean_transverse_cut\nc,unknown_or_unsupported\n"
    )
    result = evaluate(str(truth), str(predictions))
    assert result["total_examples"] == 3
    assert result["per_category"]["clean_transverse_cut"]["precision"] == 0.5
    assert result["confusion_matrix"]["crack_or_split->clean_transverse_cut"] == 1
    assert result["unsupported_case_false_positive_rate"] == 0.5
