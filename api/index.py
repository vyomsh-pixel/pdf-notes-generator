"""Vercel serverless entrypoint re-exporting the FastAPI app."""
from backend.main import app

__all__ = ["app"]
