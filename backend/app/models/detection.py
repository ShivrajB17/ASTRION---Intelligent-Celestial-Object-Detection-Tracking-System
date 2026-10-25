"""ASTRION Scientific Engine — Source Detection and Background Models.

Defines schemas for 2D background modeling, Photutils DAOStarFinder detections,
intensity-weighted centroids, and astrometric sky coordinates.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DetectionParameters(BaseModel):
    """Configurable scientific parameters for source detection and background estimation."""
    threshold_sigma: float = Field(3.5, ge=1.0, le=20.0, description="Detection threshold in units of background RMS")
    fwhm_pixels: float = Field(3.0, ge=0.5, le=30.0, description="Expected stellar PSF full-width at half-maximum in pixels")
    box_size: int = Field(64, ge=8, le=512, description="2D background mesh box size in pixels")
    filter_size: int = Field(3, ge=1, le=15, description="Median filter smoothing size for background mesh")
    algorithm: str = Field("daofind", description="Detection algorithm: daofind | iraffind | peak")


class DetectedSource(BaseModel):
    """Photometric and astrometric measurements for a detected celestial source."""
    id: str = Field(..., description="Unique source identifier")
    source_number: int = Field(..., description="1-based index within catalog")
    x: float = Field(..., description="Initial detection X pixel coordinate")
    y: float = Field(..., description="Initial detection Y pixel coordinate")
    centroid_x: float = Field(..., description="Refined intensity-weighted centroid X pixel coordinate")
    centroid_y: float = Field(..., description="Refined intensity-weighted centroid Y pixel coordinate")
    centroid_uncertainty: float = Field(..., description="Centroid coordinate 1-sigma uncertainty in pixels")
    ra_deg: Optional[float] = Field(None, description="Right Ascension in decimal degrees (J2000)")
    dec_deg: Optional[float] = Field(None, description="Declination in decimal degrees (J2000)")
    sky_coord_available: bool = Field(False, description="True if coordinates were converted via genuine celestial WCS")
    peak: float = Field(..., description="Peak pixel intensity above background (ADU)")
    flux: float = Field(..., description="Integrated photometric aperture flux (ADU)")
    fwhm: float = Field(..., description="Estimated source FWHM in pixels")
    snr: float = Field(..., description="Estimated signal-to-noise ratio")
    sharpness: Optional[float] = Field(None, description="PSF sharpness parameter (-1.0 to 1.0)")
    roundness: Optional[float] = Field(None, description="PSF roundness parameter (-1.0 to 1.0)")
    flags: int = Field(0, description="Quality bitmask: 0=clean, 1=edge, 2=saturated, 4=low_snr, 8=blended")
    quality: str = Field("clean", description="Descriptive quality flag: clean | edge | saturated | low_snr | blended")


class DetectionRequest(BaseModel):
    """Request payload to trigger scientific source detection on an observation."""
    observation_id: str = Field(..., description="ID of the ingested observation to analyze")
    parameters: Optional[DetectionParameters] = Field(default_factory=DetectionParameters, description="Detection parameters")


class DetectionResponse(BaseModel):
    """Complete scientific detection catalog and background estimation result."""
    run_id: str = Field(..., description="Unique ID for this detection run")
    observation_id: str = Field(..., description="Analyzed observation ID")
    source_count: int = Field(..., description="Total count of detected sources")
    background_median: float = Field(..., description="Global median background sky level (ADU)")
    background_rms: float = Field(..., description="Global background RMS noise level (ADU)")
    parameters: DetectionParameters = Field(..., description="Parameters used for detection")
    sources: List[DetectedSource] = Field(default_factory=list, description="Catalog of detected sources")
    execution_time_ms: float = Field(..., description="Algorithm execution time in milliseconds")
    bkg_subtracted_preview_url: Optional[str] = Field(None, description="URL to background-subtracted preview PNG")
    bkg_map_preview_url: Optional[str] = Field(None, description="URL to 2D background mesh preview PNG")


class BackgroundMetadataResponse(BaseModel):
    """2D background noise modeling metadata."""
    observation_id: str = Field(..., description="Observation ID")
    background_median: float = Field(..., description="Median background sky level (ADU)")
    background_rms: float = Field(..., description="Median background RMS noise (ADU)")
    box_size: int = Field(..., description="Background mesh box size in pixels")
    filter_size: int = Field(..., description="Median filter smoothing size in pixels")
    bkg_subtracted_preview_url: Optional[str] = Field(None, description="URL to background-subtracted preview PNG")
    bkg_map_preview_url: Optional[str] = Field(None, description="URL to 2D background map preview PNG")
