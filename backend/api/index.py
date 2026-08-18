"""Vercel Python entry point. The shared FastAPI app owns every route."""

from app.main import app

__all__ = ["app"]
