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
    repair_minimum_confidence: float


@dataclass(frozen=True)
class SupplierSettings:
    """Bounded configuration for the optional, server-side OSM lookup."""

    enabled: bool
    user_agent: str
    cache_ttl_seconds: int
    request_timeout_seconds: float
    nominatim_min_interval_seconds: float


def get_analysis_settings() -> AnalysisSettings:
    """Read non-persisted process configuration without exposing secrets."""
    raw_mode = os.getenv("ANALYSIS_MODE", "mock").lower()
    if raw_mode not in {"mock", "gemini"}:
        raise ValueError("ANALYSIS_MODE must be mock or gemini.")
    key = os.getenv("GEMINI_API_KEY") or None
    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    try:
        repair_minimum_confidence = float(os.getenv("REPAIR_MINIMUM_CONFIDENCE", "0.75"))
    except ValueError as error:
        raise ValueError("REPAIR_MINIMUM_CONFIDENCE must be a number between 0 and 1.") from error
    if not 0 <= repair_minimum_confidence <= 1:
        raise ValueError("REPAIR_MINIMUM_CONFIDENCE must be a number between 0 and 1.")
    return AnalysisSettings(
        mode=cast(AnalysisMode, raw_mode),
        gemini_api_key=key,
        gemini_model=model,
        repair_minimum_confidence=repair_minimum_confidence,
    )


def get_supplier_settings() -> SupplierSettings:
    """Read supplier lookup settings without collecting or persisting locations."""
    enabled = os.getenv("SUPPLIER_SEARCH_ENABLED", "false").lower() == "true"
    user_agent = os.getenv(
        "SUPPLIER_SEARCH_USER_AGENT", "PipePatchAI-FinalYearProject/0.1 (local development)"
    )
    try:
        ttl = int(os.getenv("SUPPLIER_SEARCH_CACHE_TTL_SECONDS", "900"))
        timeout = float(os.getenv("SUPPLIER_SEARCH_TIMEOUT_SECONDS", "5"))
        interval = float(os.getenv("SUPPLIER_SEARCH_NOMINATIM_MIN_INTERVAL_SECONDS", "1"))
    except ValueError as error:
        raise ValueError("Supplier search configuration is invalid.") from error
    if ttl < 0 or timeout <= 0 or interval < 1:
        raise ValueError("Supplier search configuration is invalid.")
    return SupplierSettings(enabled, user_agent, ttl, timeout, interval)
