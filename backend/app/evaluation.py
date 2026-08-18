"""Offline metrics for recorded predictions; no model or image access."""

import csv
from collections import Counter
from typing import Any
from app.schemas import DamageCategory


def evaluate(ground_truth_csv: str, predictions_csv: str) -> dict[str, Any]:
    truth = {
        r["case_id"]: r["damage_category"]
        for r in csv.DictReader(open(ground_truth_csv, encoding="utf-8"))
    }
    predictions = {
        r["case_id"]: r["damage_category"]
        for r in csv.DictReader(open(predictions_csv, encoding="utf-8"))
    }
    matrix: Counter[tuple[str, str]] = Counter(
        (actual, predictions.get(case, DamageCategory.UNKNOWN_OR_UNSUPPORTED.value))
        for case, actual in truth.items()
    )
    metrics = {}
    f1s = []
    for category in DamageCategory:
        label = category.value
        tp = matrix[label, label]
        fp = sum(matrix[a, label] for a in {x.value for x in DamageCategory} if a != label)
        fn = sum(matrix[label, p] for p in {x.value for x in DamageCategory} if p != label)
        precision = tp / (tp + fp) if tp + fp else 0
        recall = tp / (tp + fn) if tp + fn else 0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
        metrics[label] = {"precision": precision, "recall": recall, "f1": f1}
        f1s.append(f1)
    non_clean = sum(
        count
        for (actual, pred), count in matrix.items()
        if actual != DamageCategory.CLEAN_TRANSVERSE_CUT.value
    )
    false_clean = sum(
        count
        for (actual, pred), count in matrix.items()
        if actual != DamageCategory.CLEAN_TRANSVERSE_CUT.value
        and pred == DamageCategory.CLEAN_TRANSVERSE_CUT.value
    )
    return {
        "total_examples": len(truth),
        "per_category": metrics,
        "macro_f1": sum(f1s) / len(f1s),
        "confusion_matrix": {f"{a}->{p}": n for (a, p), n in matrix.items()},
        "unsupported_case_false_positive_rate": false_clean / non_clean if non_clean else 0,
        "clean_cut_false_positive_rate": false_clean / non_clean if non_clean else 0,
    }
