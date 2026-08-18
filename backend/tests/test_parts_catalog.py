import pytest
from app.parts_catalog import parts_estimate
from app.schemas import NominalPipeSize, PartsEstimateRequest, RepairDecision
from test_repair_guidance import request


@pytest.mark.parametrize("size", list(NominalPipeSize))
def test_supported_size_baskets_and_totals(size: NominalPipeSize) -> None:
    base = request()
    result = parts_estimate(
        PartsEstimateRequest(
            analysis=base.analysis,
            confirmations=base.confirmations.model_copy(update={"nominal_size": size}),
            measurement=base.measurement.model_copy(update={"suggested_nominal_size": size}),
        ),
        0.75,
    )
    assert (
        result.decision is RepairDecision.ELIGIBLE
        and len(result.items) == 7
        and result.total_estimated_cost_usd is not None
    )


@pytest.mark.parametrize(
    ("quote", "status"),
    [
        (None, "no_quote"),
        (200, "estimated_savings"),
        (1, "materials_cost_more"),
        (70, "break_even"),
        (-1, "invalid_quote"),
    ],
)
def test_quote_outcomes(quote: float | None, status: str) -> None:
    base = request()
    result = parts_estimate(
        PartsEstimateRequest(
            analysis=base.analysis,
            confirmations=base.confirmations,
            measurement=base.measurement,
            entered_quote_amount=quote,
        ),
        0.75,
    )
    assert result.quote_comparison_status == status


def test_mock_refusal_has_no_basket() -> None:
    base = request()
    result = parts_estimate(
        PartsEstimateRequest(
            analysis=base.analysis.model_copy(update={"is_mock": True}),
            confirmations=base.confirmations,
            measurement=base.measurement,
        ),
        0.75,
    )
    assert result.items == []
