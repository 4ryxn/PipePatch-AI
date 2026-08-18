"""Offline-only dataset manifest validation; it never reads images."""

import csv
from collections import Counter
from pathlib import PurePosixPath
from typing import Any

from app.schemas import DamageCategory

SPLITS = {"train", "validation", "test"}


def validate_manifest(path: str) -> dict[str, Any]:
    with open(path, newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    required = {
        "case_id",
        "image_path",
        "split",
        "damage_category",
        "annotation_confidence",
        "reviewer_status",
        "consent_status",
        "schema_version",
    }
    if not rows or not required.issubset(rows[0]):
        raise ValueError("Manifest is missing required columns.")
    ids: set[str] = set()
    labels: Counter[str] = Counter()
    for row in rows:
        case_id = row["case_id"]
        if not case_id or case_id in ids:
            raise ValueError("Manifest has duplicate or missing case IDs.")
        ids.add(case_id)
        image = PurePosixPath(row["image_path"])
        if image.is_absolute() or ".." in image.parts:
            raise ValueError("Manifest image path is unsafe.")
        if row["split"] not in SPLITS or row["damage_category"] not in {
            x.value for x in DamageCategory
        }:
            raise ValueError("Manifest has an invalid split or taxonomy label.")
        if not row["reviewer_status"] or not row["consent_status"]:
            raise ValueError("Manifest lacks reviewer or consent status.")
        try:
            confidence = float(row["annotation_confidence"])
        except ValueError as error:
            raise ValueError("Manifest confidence is invalid.") from error
        if not 0 <= confidence <= 1:
            raise ValueError("Manifest confidence is invalid.")
        labels[row["damage_category"]] += 1
    return {"total": len(rows), "class_distribution": dict(labels)}
