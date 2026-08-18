"""Server-only configuration for analysis mode selection."""

import os
from dataclasses import dataclass
from typing import Literal, cast


AnalysisMode = Literal["mock", "gemini"]
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"


@dataclass(frozen=True)
class AnalysisSettings:
    mode: AnalysisMode
    gemini_api_key: str | None
    gemini_model: str


def get_analysis_settings() -> AnalysisSettings:
    """Read non-persisted process configuration without exposing secrets."""
    raw_mode = os.getenv("ANALYSIS_MODE", "mock").lower()
    if raw_mode not in {"mock", "gemini"}:
        raise ValueError("ANALYSIS_MODE must be mock or gemini.")
    key = os.getenv("GEMINI_API_KEY") or None
    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    return AnalysisSettings(mode=cast(AnalysisMode, raw_mode), gemini_api_key=key, gemini_model=model)
