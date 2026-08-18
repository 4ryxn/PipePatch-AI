"""Static non-branded demo basket; no retailer, availability, or live-price data."""

import math
from typing import Literal, cast
from app.repair_guidance import create_guidance
from app.schemas import (
    CatalogItem,
    NominalPipeSize,
    PartsEstimateRequest,
    PartsEstimateResponse,
    RepairDecision,
)

VERSION = "2026.1-demo"
REVIEWED = "2026-08-18"
DISCLAIMER = "Curated demo estimate, not live retailer pricing. Verify prices, availability, compatibility, labels, and local requirements."


def parts_estimate(req: PartsEstimateRequest, threshold: float) -> PartsEstimateResponse:
    guidance = create_guidance(req, threshold)
    quote = req.entered_quote_amount
    if guidance.decision is not RepairDecision.ELIGIBLE:
        return _none(guidance.decision, guidance.reasons, quote)
    if quote is not None and (not math.isfinite(quote) or quote < 0 or quote > 100000):
        return _none(
            RepairDecision.NEEDS_MORE_INFORMATION,
            ["Enter a finite non-negative USD quote within the supported range."],
            quote,
            "invalid_quote",
        )
    size = req.confirmations.nominal_size
    assert size is not None
    pipe = {
        NominalPipeSize.HALF: 6.0,
        NominalPipeSize.THREE_QUARTER: 7.0,
        NominalPipeSize.ONE: 8.5,
    }[size]
    coupling = {
        NominalPipeSize.HALF: 6.0,
        NominalPipeSize.THREE_QUARTER: 7.0,
        NominalPipeSize.ONE: 8.0,
    }[size]
    data = [
        (
            f"pipe-{size}",
            "Schedule-40 PVC replacement pipe",
            1,
            "minimum purchase length",
            pipe,
            "pipe",
            True,
            "Dry-fit final cut length; do not calculate it from the app.",
        ),
        (
            f"coupling-{size}",
            "PVC repair/slip coupling without internal stop",
            2,
            "each",
            coupling,
            "fitting",
            True,
            "Approved replacement-section method.",
        ),
        (
            "primer",
            "PVC primer",
            1,
            "can",
            8.0,
            "chemical",
            False,
            "Use where required by label/local requirements.",
        ),
        (
            "cement",
            "PVC solvent cement",
            1,
            "can",
            9.0,
            "chemical",
            True,
            "Must be compatible with confirmed PVC.",
        ),
        ("cutter", "PVC pipe cutter", 1, "tool", 18.0, "tool", True, "Square cuts."),
        (
            "deburr",
            "Deburring/chamfering tool",
            1,
            "tool",
            7.0,
            "tool",
            True,
            "Prepare sound pipe ends.",
        ),
        (
            "ppe",
            "Gloves and eye protection",
            1,
            "set",
            10.0,
            "safety",
            True,
            "PPE for chemical handling.",
        ),
    ]
    items = [
        CatalogItem(
            item_id=i,
            name=n,
            nominal_size=size if c in {"pipe", "fitting"} else None,
            quantity=q,
            unit=u,
            estimated_unit_price_usd=p,
            category=c,
            required=r,
            rationale=a,
        )
        for i, n, q, u, p, c, r, a in data
    ]
    total = round(sum(x.quantity * x.estimated_unit_price_usd for x in items), 2)
    if quote is None:
        status, amount, text = (
            "no_quote",
            None,
            "Enter a real professional quote to compare it with this demo basket.",
        )
    elif quote > total:
        status, amount, text = (
            "estimated_savings",
            round(quote - total, 2),
            "The quote exceeds the estimated materials basket by this amount.",
        )
    elif quote < total:
        status, amount, text = (
            "materials_cost_more",
            round(total - quote, 2),
            "The estimated materials basket costs more than the entered quote by this amount.",
        )
    else:
        status, amount, text = (
            "break_even",
            0.0,
            "The quote matches the estimated materials basket.",
        )
    return PartsEstimateResponse(
        decision=RepairDecision.ELIGIBLE,
        items=items,
        total_estimated_cost_usd=total,
        catalog_version=VERSION,
        last_reviewed_date=REVIEWED,
        disclaimer=DISCLAIMER,
        compatibility_notes=["Buy whole units.", "Confirm fitting socket depth before cutting."],
        alternatives=[
            "Ask a supplier or professional if a telescoping repair coupling is needed because pipe cannot be positioned safely."
        ],
        entered_quote_amount=quote,
        comparison_amount=amount,
        quote_comparison_status=cast(
            Literal[
                "no_quote",
                "estimated_savings",
                "materials_cost_more",
                "break_even",
                "invalid_quote",
            ],
            status,
        ),
        explanation=text,
        reasons=[],
    )


def _none(
    decision: RepairDecision, reasons: list[str], quote: float | None, status: str = "no_quote"
) -> PartsEstimateResponse:
    return PartsEstimateResponse(
        decision=decision,
        items=[],
        total_estimated_cost_usd=None,
        catalog_version=VERSION,
        last_reviewed_date=REVIEWED,
        disclaimer=DISCLAIMER,
        compatibility_notes=[],
        alternatives=[],
        entered_quote_amount=quote,
        comparison_amount=None,
        quote_comparison_status=cast(
            Literal[
                "no_quote",
                "estimated_savings",
                "materials_cost_more",
                "break_even",
                "invalid_quote",
            ],
            status,
        ),
        explanation="No basket is available until all deterministic safety gates pass.",
        reasons=reasons,
    )
