"""System and runtime environment models."""

from typing import Dict, Optional
from pydantic import BaseModel, Field


class SystemInfoResponse(BaseModel):
    python_version: str = Field(..., description="Active Python runtime version string")
    platform: str = Field(..., description="Operating system platform name")
    cpu_count: Optional[int] = Field(None, description="Available CPU logical cores")
    dependencies: Dict[str, str] = Field(
        ...,
        description="Installed scientific and web framework versions (astropy, numpy, etc.)"
    )
