"""API response models."""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Describes the backend's basic readiness."""

    status: Literal["ok"]
