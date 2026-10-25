"""System info endpoint router."""

import os
import platform
import sys
from fastapi import APIRouter
from backend.app.models.system import SystemInfoResponse

router = APIRouter(prefix="/api/system", tags=["System"])


@router.get("/info", response_model=SystemInfoResponse)
def get_system_info() -> SystemInfoResponse:
    """Returns Python runtime version and installed scientific dependency versions."""
    dependencies = {}

    # Astropy
    try:
        import astropy
        dependencies["astropy"] = astropy.__version__
    except ImportError:
        dependencies["astropy"] = "not installed"

    # NumPy
    try:
        import numpy
        dependencies["numpy"] = numpy.__version__
    except ImportError:
        dependencies["numpy"] = "not installed"

    # FastAPI
    try:
        import fastapi
        dependencies["fastapi"] = fastapi.__version__
    except ImportError:
        dependencies["fastapi"] = "not installed"

    # Uvicorn
    try:
        import uvicorn
        dependencies["uvicorn"] = uvicorn.__version__
    except ImportError:
        dependencies["uvicorn"] = "not installed"

    # Pydantic
    try:
        import pydantic
        dependencies["pydantic"] = pydantic.__version__
    except ImportError:
        dependencies["pydantic"] = "not installed"

    return SystemInfoResponse(
        python_version=sys.version.split(" ")[0],
        platform=platform.platform(),
        cpu_count=os.cpu_count(),
        dependencies=dependencies,
    )
