"""ASTRION Backend API Routes."""

from backend.app.api.health import router as health_router
from backend.app.api.system import router as system_router
from backend.app.api.fits import router as fits_router

__all__ = ["health_router", "system_router", "fits_router"]
