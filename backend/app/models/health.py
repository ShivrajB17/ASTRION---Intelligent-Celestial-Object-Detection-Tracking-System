"""Health status response models."""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service status indicator, e.g. 'healthy'")
    version: str = Field(..., description="Backend engine semver version")
    uptime_seconds: float = Field(..., description="Process uptime in seconds")
    timestamp: str = Field(..., description="Current UTC ISO 8601 timestamp")
