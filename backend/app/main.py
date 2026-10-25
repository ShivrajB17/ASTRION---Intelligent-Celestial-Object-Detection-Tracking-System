"""ASTRION Scientific Engine — FastAPI Main Application.

High-performance astronomical intelligence backend powered by Astropy, NumPy, and FastAPI.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from backend.app.api.fits import router as fits_router
from backend.app.api.health import router as health_router
from backend.app.api.observations import router as observations_router
from backend.app.api.system import router as system_router
from backend.app.api.detection import router as detection_router
from backend.app.api.registration import router as registration_router
from backend.app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle management."""
    print(f"[ASTRION Backend] Starting {settings.APP_NAME} v{settings.VERSION} on {settings.HOST}:{settings.PORT}")
    settings.ensure_directories()
    yield
    print(f"[ASTRION Backend] Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Scientific astronomical backend for moving celestial object detection and multi-epoch tracking.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration for Electron and Web browsers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^http://(127\.0\.0\.1|localhost)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    """Consistent JSON error response format across all endpoints."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "detail": exc.detail,
            "status_code": exc.status_code,
        },
    )


# Include Routers
app.include_router(health_router)
app.include_router(system_router)
app.include_router(fits_router)
app.include_router(observations_router)
app.include_router(detection_router)
app.include_router(registration_router)


@app.get("/", tags=["Root"])
def root():
    """Service status and quick links."""
    return {
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
        "status": "operational",
    }


if __name__ == "__main__":
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level="info",
        reload=False,
    )
