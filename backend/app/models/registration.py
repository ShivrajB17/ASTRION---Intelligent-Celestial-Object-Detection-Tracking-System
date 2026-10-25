"""ASTRION Scientific Engine — Image Registration Models.

Defines schemas for multi-epoch observation alignment, transformation matrices,
matched reference stars, and residual errors.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class RegistrationRequest(BaseModel):
    """Request payload to register a target observation against a reference observation."""
    reference_observation_id: str = Field(..., description="ID of the reference/anchor observation")
    target_observation_id: str = Field(..., description="ID of the target observation to be transformed")


class RegistrationResponse(BaseModel):
    """Result of scientific image alignment and transformation estimation."""
    run_id: str = Field(..., description="Unique ID for this registration execution")
    reference_observation_id: str = Field(..., description="Reference observation ID")
    target_observation_id: str = Field(..., description="Target observation ID")
    success: bool = Field(..., description="True if alignment successfully converged")
    rotation_deg: float = Field(0.0, description="Estimated rotation angle in degrees")
    translation_x: float = Field(0.0, description="Estimated translation in X pixels")
    translation_y: float = Field(0.0, description="Estimated translation in Y pixels")
    scale: float = Field(1.0, description="Estimated scale factor ratio")
    residual_rms: float = Field(0.0, description="Root-mean-square alignment residual in pixels")
    matched_stars_count: int = Field(0, description="Count of reference asterisms/stars matched")
    transformation_matrix: List[List[float]] = Field(default_factory=list, description="3x3 homogeneous transformation matrix")
    registered_preview_url: Optional[str] = Field(None, description="URL to view aligned target preview image")
    message: str = Field(..., description="Status summary or diagnostic message")
