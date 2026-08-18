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


@dataclass(frozen=True)
class AuthSettings:
    enabled: bool
    database_url: str
    jwt_secret_key: str | None
    jwt_algorithm: str
    access_token_minutes: int


def validate_production_environment() -> None:
    """Fail closed before a production server starts; never echo configuration values."""
    if os.getenv("PIPEPATCH_ENV", "development") != "production":
        return
    analysis = get_analysis_settings()
    auth = get_auth_settings()
    if analysis.mode == "gemini" and not analysis.gemini_api_key:
        raise ValueError("Production Gemini analysis requires server configuration.")
    if auth.enabled and (not auth.database_url.startswith("postgresql") or not auth.jwt_secret_key):
        raise ValueError("Production authentication requires PostgreSQL and a strong server secret.")
    origins = os.getenv("ALLOWED_ORIGINS", "")
    if origins.strip() == "*":
        raise ValueError("Wildcard browser origins are not allowed in production.")


def get_allowed_origins() -> list[str]:
    """Return explicit browser origins only; native clients do not need CORS."""
    raw = os.getenv("ALLOWED_ORIGINS", "")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    if "*" in origins:
        raise ValueError("Wildcard browser origins are not allowed.")
    return origins


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


def get_auth_settings() -> AuthSettings:
    enabled = os.getenv("AUTH_ENABLED", "false").lower() == "true"
    database_url = os.getenv("DATABASE_URL", "sqlite:///./pipepatch.db")
    secret = os.getenv("JWT_SECRET_KEY") or None
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    try:
        minutes = int(os.getenv("JWT_ACCESS_TOKEN_MINUTES", "30"))
    except ValueError as error:
        raise ValueError("Authentication configuration is invalid.") from error
    if enabled and (not secret or len(secret) < 32 or not database_url or minutes <= 0):
        raise ValueError("Authentication is enabled but server configuration is incomplete.")
    return AuthSettings(enabled, database_url, secret, algorithm, minutes)
