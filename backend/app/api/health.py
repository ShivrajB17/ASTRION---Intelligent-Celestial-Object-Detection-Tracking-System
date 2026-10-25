"""Health endpoint router."""

from datetime import datetime, timezone
import time
from fastapi import APIRouter
from backend.app.config import settings
from backend.app.models.health import HealthResponse

router = APIRouter(tags=["Health"])

START_TIME = time.time()


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Returns status, version, and uptime of the ASTRION scientific backend."""
    uptime = time.time() - START_TIME
    now_utc = datetime.now(timezone.utc).isoformat()
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        uptime_seconds=round(uptime, 2),
        timestamp=now_utc,
    )
