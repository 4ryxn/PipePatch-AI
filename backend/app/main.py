"""FastAPI application entry point."""

import json
from typing import Annotated, Generator

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.analysis import ValidatedImage, validate_upload
from app.calibration import detect_calibration
from app.measurements import measure_image
from app.auth import (
    allow_login,
    create_token,
    decode_token,
    normalize_email,
    password_hash,
    successful_login,
    verify_password,
)
from app.config import get_analysis_settings, get_auth_settings, get_supplier_settings, validate_production_environment
from app.database import RepairHistory, User, make_session_factory
from app.repair_rules import assess_repair
from app.repair_guidance import create_guidance
from app.parts_catalog import parts_estimate
from app.suppliers import SupplierSearchService
from app.schemas import (
    AnalysisResponse,
    CalibrationResponse,
    DamageCategory,
    HealthResponse,
    ImagePoint,
    MeasurementResponse,
    PartsEstimateRequest,
    PartsEstimateResponse,
    RepairAssessmentRequest,
    RepairAssessmentResponse,
    RepairGuidanceRequest,
    RepairGuidanceResponse,
    SupplierSearchRequest,
    SupplierSearchResponse,
    AccountResponse,
    Credentials,
    RepairHistoryCreate,
    RepairHistoryResponse,
    TokenResponse,
)
from app.gemini import GeminiServiceError, analyze_with_gemini

app = FastAPI(title="PipePatch AI API", version="0.1.0")
validate_production_environment()
_supplier_services: dict[object, SupplierSearchService] = {}
_bearer = HTTPBearer(auto_error=False)
_session_factory: sessionmaker[Session] | None = None


def supplier_service() -> SupplierSearchService:
    """Keep provider pacing and the short TTL cache process-wide."""
    settings = get_supplier_settings()
    service = _supplier_services.get(settings)
    if service is None:
        service = SupplierSearchService(settings)
        _supplier_services[settings] = service
    return service


def auth_session_factory() -> sessionmaker[Session]:
    global _session_factory
    settings = get_auth_settings()
    if not settings.enabled:
        raise HTTPException(503, "Accounts and repair history are disabled in this environment.")
    if _session_factory is None:
        _session_factory = make_session_factory(settings.database_url)
    return _session_factory


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> Generator[User, None, None]:
    settings = get_auth_settings()
    factory = auth_session_factory()
    user_id = decode_token(credentials.credentials, settings) if credentials else None
    if not user_id:
        raise HTTPException(401, "Authentication is required.")
    session = factory()
    try:
        user = session.get(User, user_id)
        if user is None:
            raise HTTPException(401, "Authentication is required.")
        yield user
    finally:
        session.close()


def account_response(user: User) -> AccountResponse:
    return AccountResponse(id=user.id, email=user.email, created_at=user.created_at.isoformat())


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    """Return a minimal readiness response without external dependencies."""
    return HealthResponse(status="ok")


@app.get("/readiness", response_model=HealthResponse, tags=["system"])
def readiness() -> HealthResponse:
    """Configuration-only readiness check; it never calls Gemini or reads images."""
    validate_production_environment()
    return HealthResponse(status="ok")


@app.post("/api/v1/analyze", response_model=AnalysisResponse, tags=["analysis"])
async def analyze(
    image: Annotated[UploadFile, File(description="One pipe photo")],
) -> AnalysisResponse:
    """Validate one image and run the configured non-persistent analysis mode."""
    validated_image = await validate_upload(image)
    try:
        settings = get_analysis_settings()
    except ValueError as error:
        raise HTTPException(
            status_code=503, detail="Analysis mode is not configured correctly."
        ) from error
    if settings.mode == "gemini":
        try:
            return await analyze_with_gemini(validated_image, settings)
        except GeminiServiceError as error:
            raise HTTPException(status_code=error.status_code, detail=error.message) from error
    return mock_analysis(validated_image)


@app.post("/api/v1/calibration", response_model=CalibrationResponse, tags=["calibration"])
async def calibration(
    image: Annotated[UploadFile, File(description="One calibration photo")],
) -> CalibrationResponse:
    """Return an ephemeral marker scale result without calling Gemini."""
    return detect_calibration(await validate_upload(image))


@app.post("/api/v1/measurements", response_model=MeasurementResponse, tags=["calibration"])
async def measurements(
    image: Annotated[UploadFile, File(description="One calibration photo")],
    diameter_start_x: Annotated[float, Form()],
    diameter_start_y: Annotated[float, Form()],
    diameter_end_x: Annotated[float, Form()],
    diameter_end_y: Annotated[float, Form()],
    gap_start_x: Annotated[float, Form()],
    gap_start_y: Annotated[float, Form()],
    gap_end_x: Annotated[float, Form()],
    gap_end_y: Annotated[float, Form()],
) -> MeasurementResponse:
    """Measure only user-selected segments after server-side marker re-detection."""
    return measure_image(
        await validate_upload(image),
        ImagePoint(x=diameter_start_x, y=diameter_start_y),
        ImagePoint(x=diameter_end_x, y=diameter_end_y),
        ImagePoint(x=gap_start_x, y=gap_start_y),
        ImagePoint(x=gap_end_x, y=gap_end_y),
    )


def mock_analysis(_image: ValidatedImage) -> AnalysisResponse:
    """Return fixed offline observations without reading or retaining image details."""
    return AnalysisResponse(
        is_mock=True,
        supported_case=False,
        material="PVC (demo observation)",
        pipe_schedule="Schedule 40 (demo observation)",
        nominal_size=None,
        damage_type="clean transverse cut (demo observation)",
        damage_category=DamageCategory.UNKNOWN_OR_UNSUPPORTED,
        confidence=0.0,
        summary="Demo response only. This upload has not received real image analysis.",
        evidence=["The backend accepted one supported image format."],
        unknowns=["Pipe size has not been measured.", "No calibration marker was evaluated."],
        safety_flags=["Do not use this demo result to perform a repair."],
        next_action="Use this screen only to verify the local upload flow.",
    )


@app.post("/api/v1/repair-assessment", response_model=RepairAssessmentResponse, tags=["assessment"])
def repair_assessment(request: RepairAssessmentRequest) -> RepairAssessmentResponse:
    """Apply deterministic safety gates without a provider or network call."""
    try:
        settings = get_analysis_settings()
    except ValueError as error:
        raise HTTPException(
            status_code=503, detail="Assessment is not configured correctly."
        ) from error
    return assess_repair(
        request.analysis, request.confirmations, settings.repair_minimum_confidence
    )


@app.post("/api/v1/repair-guidance", response_model=RepairGuidanceResponse, tags=["repair"])
def repair_guidance(request: RepairGuidanceRequest) -> RepairGuidanceResponse:
    """Return deterministic guidance only after all independent gates pass."""
    settings = get_analysis_settings()
    return create_guidance(request, settings.repair_minimum_confidence)


@app.post("/api/v1/parts-estimate", response_model=PartsEstimateResponse, tags=["repair"])
def estimate_parts(request: PartsEstimateRequest) -> PartsEstimateResponse:
    return parts_estimate(request, get_analysis_settings().repair_minimum_confidence)


@app.post("/api/v1/suppliers/search", response_model=SupplierSearchResponse, tags=["suppliers"])
async def search_suppliers(request: SupplierSearchRequest) -> SupplierSearchResponse:
    """User-triggered general-area discovery; never persist a location or result."""
    settings = get_analysis_settings()
    return await supplier_service().search(request, settings.repair_minimum_confidence)


@app.post("/api/v1/auth/register", response_model=TokenResponse, tags=["auth"])
def register(credentials: Credentials) -> TokenResponse:
    settings = get_auth_settings()
    factory = auth_session_factory()
    email = normalize_email(credentials.email)
    if "@" not in email:
        raise HTTPException(422, "Enter a valid email address.")
    session = factory()
    try:
        user = User(email=email, password_hash=password_hash.hash(credentials.password))
        session.add(user)
        session.commit()
        return TokenResponse(access_token=create_token(user.id, settings))
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(409, "An account could not be created with those details.") from error
    finally:
        session.close()


@app.post("/api/v1/auth/login", response_model=TokenResponse, tags=["auth"])
def login(credentials: Credentials) -> TokenResponse:
    settings = get_auth_settings()
    factory = auth_session_factory()
    email = normalize_email(credentials.email)
    if not allow_login(email):
        raise HTTPException(429, "Unable to sign in with those credentials. Try again later.")
    session = factory()
    try:
        user = session.scalar(select(User).where(User.email == email))
        if user is None or not verify_password(credentials.password, user.password_hash):
            raise HTTPException(401, "Unable to sign in with those credentials.")
        successful_login(email)
        return TokenResponse(access_token=create_token(user.id, settings))
    finally:
        session.close()


@app.get("/api/v1/auth/me", response_model=AccountResponse, tags=["auth"])
def me(user: Annotated[User, Depends(current_user)]) -> AccountResponse:
    return account_response(user)


@app.delete("/api/v1/auth/me", status_code=204, tags=["auth"])
def delete_account(user: Annotated[User, Depends(current_user)]) -> None:
    factory = auth_session_factory()
    session = factory()
    try:
        stored = session.get(User, user.id)
        if stored:
            session.delete(stored)
            session.commit()
    finally:
        session.close()


@app.post("/api/v1/history", response_model=RepairHistoryResponse, tags=["history"])
def save_history(
    request: RepairHistoryCreate, user: Annotated[User, Depends(current_user)]
) -> RepairHistoryResponse:
    factory = auth_session_factory()
    session = factory()
    try:
        item = RepairHistory(
            owner_id=user.id,
            title=request.title.strip(),
            summary_json=request.summary.model_dump_json(),
        )
        session.add(item)
        session.commit()
        return RepairHistoryResponse(
            id=item.id,
            title=item.title,
            created_at=item.created_at.isoformat(),
            summary=request.summary,
        )
    finally:
        session.close()


def _history_response(item: RepairHistory) -> RepairHistoryResponse:
    from app.schemas import RepairHistorySummary

    return RepairHistoryResponse(
        id=item.id,
        title=item.title,
        created_at=item.created_at.isoformat(),
        summary=RepairHistorySummary.model_validate(json.loads(item.summary_json)),
    )


@app.get("/api/v1/history", response_model=list[RepairHistoryResponse], tags=["history"])
def list_history(user: Annotated[User, Depends(current_user)]) -> list[RepairHistoryResponse]:
    factory = auth_session_factory()
    session = factory()
    try:
        return [
            _history_response(item)
            for item in session.scalars(
                select(RepairHistory)
                .where(RepairHistory.owner_id == user.id)
                .order_by(RepairHistory.created_at.desc())
            )
        ]
    finally:
        session.close()


@app.get("/api/v1/history/{history_id}", response_model=RepairHistoryResponse, tags=["history"])
def history_detail(
    history_id: str, user: Annotated[User, Depends(current_user)]
) -> RepairHistoryResponse:
    factory = auth_session_factory()
    session = factory()
    try:
        item = session.get(RepairHistory, history_id)
        if item is None or item.owner_id != user.id:
            raise HTTPException(404, "History entry not found.")
        return _history_response(item)
    finally:
        session.close()


@app.delete("/api/v1/history/{history_id}", status_code=204, tags=["history"])
def delete_history(history_id: str, user: Annotated[User, Depends(current_user)]) -> None:
    factory = auth_session_factory()
    session = factory()
    try:
        item = session.get(RepairHistory, history_id)
        if item is None or item.owner_id != user.id:
            raise HTTPException(404, "History entry not found.")
        session.delete(item)
        session.commit()
    finally:
        session.close()
