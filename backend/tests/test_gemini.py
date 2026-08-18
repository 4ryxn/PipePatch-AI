from types import SimpleNamespace

import pytest
from google.genai import errors

from app.analysis import ValidatedImage
from app.config import AnalysisSettings
from app.gemini import GeminiServiceError, analyze_with_gemini
from app.schemas import GeminiAnalysisResponse


class FakeClient:
    def __init__(self, result: object) -> None:
        self.result = result
        self.calls: list[dict[str, object]] = []
        self.closed = False
        self.models = self

    def generate_content(self, **kwargs: object) -> object:
        self.calls.append(kwargs)
        if isinstance(self.result, Exception):
            raise self.result
        return self.result

    def close(self) -> None:
        self.closed = True


def client_factory(client: FakeClient):
    return lambda **_kwargs: client


def settings() -> AnalysisSettings:
    return AnalysisSettings(
        mode="gemini",
        gemini_api_key="test-key",
        gemini_model="test-model",
        repair_minimum_confidence=0.75,
    )


def image() -> ValidatedImage:
    return ValidatedImage(b"\xff\xd8\xffimage", "image/jpeg")


@pytest.mark.anyio
async def test_gemini_mode_uses_bytes_and_a_structured_schema() -> None:
    parsed = GeminiAnalysisResponse(
        supported_case=False,
        material=None,
        pipe_schedule=None,
        nominal_size=None,
        damage_type=None,
        confidence=0.1,
        summary="Insufficient evidence.",
        evidence=["A pipe-like object is visible."],
        unknowns=["Size is not measurable."],
        safety_flags=["Do not repair from this result."],
        next_action="Capture a clearer image with calibration.",
    )
    client = FakeClient(SimpleNamespace(parsed=parsed, prompt_feedback=None, candidates=[]))

    result = await analyze_with_gemini(image(), settings(), client_factory(client))

    assert result.is_mock is False
    assert "is_mock" not in parsed.model_dump()
    assert result.summary == "Insufficient evidence."
    assert client.closed is True
    assert client.calls[0]["model"] == "test-model"
    assert getattr(client.calls[0]["config"], "response_schema") is GeminiAnalysisResponse
    assert "tools" not in client.calls[0]


@pytest.mark.anyio
async def test_gemini_mode_requires_a_server_key() -> None:
    missing_key = AnalysisSettings(
        mode="gemini",
        gemini_api_key=None,
        gemini_model="test-model",
        repair_minimum_confidence=0.75,
    )

    with pytest.raises(GeminiServiceError, match="not configured") as error:
        await analyze_with_gemini(image(), missing_key)

    assert error.value.status_code == 503


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("provider_error", "status_code"),
    [
        (TimeoutError(), 504),
        (errors.ClientError(401, {}), 503),
        (errors.ClientError(429, {}), 429),
        (errors.ServerError(500, {}), 503),
    ],
)
async def test_gemini_failures_are_mapped_without_provider_details(
    provider_error: Exception, status_code: int
) -> None:
    client = FakeClient(provider_error)

    with pytest.raises(GeminiServiceError) as error:
        await analyze_with_gemini(image(), settings(), client_factory(client))

    assert error.value.status_code == status_code
    assert client.closed is True


@pytest.mark.anyio
async def test_gemini_safety_block_and_malformed_output_are_safe_errors() -> None:
    blocked = FakeClient(
        SimpleNamespace(
            parsed=None, prompt_feedback=SimpleNamespace(block_reason="SAFETY"), candidates=[]
        )
    )
    malformed = FakeClient(
        SimpleNamespace(parsed={"supported_case": False}, prompt_feedback=None, candidates=[])
    )

    with pytest.raises(GeminiServiceError, match="declined") as safety_error:
        await analyze_with_gemini(image(), settings(), client_factory(blocked))
    with pytest.raises(GeminiServiceError, match="invalid response") as malformed_error:
        await analyze_with_gemini(image(), settings(), client_factory(malformed))

    assert safety_error.value.status_code == 422
    assert malformed_error.value.status_code == 502
    assert blocked.closed is True
    assert malformed.closed is True
