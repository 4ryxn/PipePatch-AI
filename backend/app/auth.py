"""Password/JWT helpers. Login throttling is memory-only and generic."""

from datetime import UTC, datetime, timedelta
from threading import Lock

import jwt
from pwdlib import PasswordHash

from app.config import AuthSettings

password_hash = PasswordHash.recommended()
_attempts: dict[str, tuple[int, datetime]] = {}
_attempt_lock = Lock()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_token(user_id: str, settings: AuthSettings) -> str:
    assert settings.jwt_secret_key is not None
    now = datetime.now(UTC)
    return jwt.encode(
        {"sub": user_id, "iat": now, "exp": now + timedelta(minutes=settings.access_token_minutes)},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_token(token: str, settings: AuthSettings) -> str | None:
    assert settings.jwt_secret_key is not None
    try:
        subject = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        ).get("sub")
        return subject if isinstance(subject, str) else None
    except jwt.PyJWTError:
        return None


def allow_login(email: str) -> bool:
    now = datetime.now(UTC)
    with _attempt_lock:
        count, expiry = _attempts.get(email, (0, now))
        if expiry < now:
            count = 0
        if count >= 5:
            return False
        _attempts[email] = (count + 1, now + timedelta(minutes=10))
        return True


def successful_login(email: str) -> None:
    with _attempt_lock:
        _attempts.pop(email, None)
